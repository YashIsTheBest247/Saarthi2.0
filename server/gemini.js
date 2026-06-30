import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Collect multiple keys so we can rotate when one hits its free-tier quota.
// Supports GEMINI_API_KEY, GEMINI_API_KEY_2/3/4… and a comma-separated GEMINI_API_KEYS.
const rawKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  ...String(process.env.GEMINI_API_KEYS || "").split(","),
];
const KEYS = [...new Set(
  rawKeys.map((k) => (k || "").trim()).filter((k) => k && k !== "your_key_here")
)];

// Groq — fast, generous free tier, OpenAI-compatible. Used as an automatic
// fallback when all Gemini keys are rate-limited/exhausted (text features).
const GROQ_KEYS = [...new Set(
  [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, ...String(process.env.GROQ_API_KEYS || "").split(",")]
    .map((k) => (k || "").trim()).filter(Boolean)
)];
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const hasGroq = GROQ_KEYS.length > 0;

export const hasKey = KEYS.length > 0 || hasGroq;
export const keyCount = KEYS.length + GROQ_KEYS.length;
export const modelName = KEYS.length ? MODEL : hasGroq ? `groq:${GROQ_MODEL}` : "mock";

const clients = KEYS.map((apiKey) => new GoogleGenAI({ apiKey }));
let cur = 0; // index of the key we're currently using

const isQuota = (e) => /429|resource_exhausted|quota|rate.?limit/i.test(String(e?.message || e));
const isTransient = (e) => /503|overloaded|unavailable|500|deadline/i.test(String(e?.message || e));

function parseJSON(text) {
  if (!text) throw new Error("EMPTY_RESPONSE");
  // strip ```json … ``` fences the model sometimes adds
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch { /* try repairs below */ }
  // grab the outermost {...} block
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end > start) t = t.slice(start, end + 1);
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  // remove trailing commas before } or ]
  let fixed = t.replace(/,\s*([}\]])/g, "$1");
  let out = tryParse(fixed);
  if (out) return out;
  // last resort: close any unbalanced braces/brackets (handles truncated output)
  const opens = (fixed.match(/[{[]/g) || []).length;
  const closes = (fixed.match(/[}\]]/g) || []).length;
  if (opens > closes) {
    // drop a dangling partial last element, then close
    let patched = fixed.replace(/,\s*"[^"]*"\s*:\s*[^,{}\[\]]*$/, "");
    patched += "]".repeat(Math.max(0, (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length));
    patched += "}".repeat(Math.max(0, (fixed.match(/{/g) || []).length - (fixed.match(/}/g) || []).length));
    out = tryParse(patched);
    if (out) return out;
  }
  throw new Error("BAD_JSON");
}

/**
 * Groq fallback (OpenAI-compatible). Text-only: any image parts can't be read by
 * the text model, so we note that and proceed with the text. Schema is passed as
 * a strong instruction since Groq has no native responseSchema.
 */
async function groqJSON({ system, parts, schema }) {
  const hasImage = parts.some((p) => p?.inlineData?.data);
  const userText = parts.map((p) => p.text || "").filter(Boolean).join("\n\n") || "(see instructions)";
  const sys = `${system}\n\nRespond with ONLY a single valid JSON object — no markdown, no prose, no code fences. The JSON must match this schema:\n${JSON.stringify(schema).slice(0, 4000)}`
    + (hasImage ? "\n\n(Note: an image was attached but cannot be read here — answer from the text, and say so if image detail is essential.)" : "");

  let lastErr;
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEYS[i]}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "system", content: sys }, { role: "user", content: userText }],
          temperature: 0.4,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`groq ${res.status}: ${body.slice(0, 160)}`);
        lastErr = err;
        if (isQuota(err) || isTransient(err) || res.status === 429) continue; // try next groq key
        throw err;
      }
      const j = await res.json();
      return parseJSON(j.choices?.[0]?.message?.content);
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error("GROQ_FAILED");
}

/**
 * Structured JSON. Rotates across all Gemini keys; if they're all
 * rate-limited/exhausted (or error), automatically falls back to Groq.
 * Throws only if every provider fails — callers then use demo mocks.
 */
export async function generateJSON({ system, parts, schema }) {
  if (!clients.length && !hasGroq) throw new Error("NO_API_KEY");

  let lastErr;
  for (let attempt = 0; attempt < clients.length; attempt++) {
    const idx = (cur + attempt) % clients.length;
    try {
      const response = await clients[idx].models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      });
      cur = idx; // this key works — keep using it for subsequent calls
      return parseJSON(response.text);
    } catch (err) {
      lastErr = err;
      if (isQuota(err)) { console.warn(`[gemini] key #${idx + 1} exhausted — rotating`); continue; }
      if (isTransient(err)) continue;
      break; // a real error — stop hammering Gemini, try Groq
    }
  }

  // Fallback: Groq
  if (hasGroq) {
    try { console.warn("[gemini] falling back to Groq"); return await groqJSON({ system, parts, schema }); }
    catch (err) { lastErr = err; console.error("[groq]", err?.message || err); }
  }
  throw lastErr || new Error("ALL_PROVIDERS_EXHAUSTED");
}
