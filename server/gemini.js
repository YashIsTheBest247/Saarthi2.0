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

export const hasKey = KEYS.length > 0;
export const keyCount = KEYS.length;
export const modelName = MODEL;

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
 * Call Gemini with structured JSON output. Rotates across all configured keys
 * when one is rate-limited/exhausted, then throws so callers fall back to mocks.
 */
export async function generateJSON({ system, parts, schema }) {
  if (!clients.length) throw new Error("NO_API_KEY");

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
      // rotate to the next key only for quota / transient errors; real errors bubble up
      if (clients.length > 1 && (isQuota(err) || isTransient(err))) {
        if (isQuota(err)) console.warn(`[gemini] key #${idx + 1} exhausted — rotating`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("ALL_KEYS_EXHAUSTED");
}
