// Agentic, multi-agent workflows: one input runs a CHAIN of specialist agents,
// each step's output feeding the next. An AI planner can also pick the chain.
import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { Type } from "@google/genai";

/**
 * Each workflow is an ordered list of steps. A step names the agent (feature key),
 * a display label, a result `key`, and `input(ctx)` which builds that agent's input
 * from the seed + previous steps' results (ctx.results[key]).
 */
export const WORKFLOWS = {
  "resolve-grievance": {
    title: "Decode → Complaint → Schedule",
    desc: "Turn a confusing notice or problem into a filed complaint with follow-up deadlines.",
    seedLabel: "Paste the notice / describe the problem",
    accent: "#2F6F8F",
    steps: [
      { key: "decode", agent: "samajh", label: "Vidya decodes it", input: (c) => ({ text: c.seed.text, image: c.seed.image }) },
      { key: "complaint", agent: "setu", label: "Adhrit drafts the complaint", input: (c) => ({ problem: `${c.seed.text}\n\nWhat it means: ${c.results.decode?.summary || ""}\nWatch-outs: ${(c.results.decode?.watchOuts || []).join("; ")}` }) },
      { key: "schedule", agent: "samay", label: "Smriti schedules follow-ups", input: (c) => ({ text: `Plan to take this grievance to closure. Right authority: ${c.results.complaint?.authority || ""}. Escalation: ${(c.results.complaint?.escalation || []).map((e) => e.step).join("; ")}.`, today: c.today }) },
    ],
  },
  "msme-launch": {
    title: "Register → Schemes → Plan",
    desc: "Turn a business idea into the exact Udyam/GST/licence path, the MSME loans & schemes you qualify for, and a launch plan.",
    seedLabel: "Describe your business idea / what you make",
    accent: "#138A72",
    steps: [
      { key: "launch", agent: "udyam", label: "Udyam maps the path", input: (c) => ({ problem: c.seed.text }) },
      { key: "schemes", agent: "haq", label: "Haq finds schemes & loans", input: (c) => ({ profile: { occupation: "MSME entrepreneur", details: `${c.seed.text}\n\n${c.results.launch?.summary || ""}` } }) },
      { key: "plan", agent: "samay", label: "Smriti plans the launch", input: (c) => ({ text: `Plan the steps to launch this MSME: ${c.seed.text}. Registrations/licences to complete: ${(c.results.launch?.steps || []).map((s) => s.title || s.step || s).join("; ")}. Schemes to apply for: ${(c.results.schemes?.schemes || []).map((s) => s.name).join(", ")}.`, today: c.today }) },
    ],
  },
  "health-savings": {
    title: "Decode Rx → Refill reminders",
    desc: "Decode a prescription into cheaper generics, then schedule timely refills.",
    seedLabel: "Paste the prescription / medicines",
    accent: "#C0453B",
    steps: [
      { key: "rx", agent: "sehat", label: "Asha finds cheaper generics", input: (c) => ({ text: c.seed.text, mode: "prescription", image: c.seed.image }) },
      { key: "remind", agent: "samay", label: "Smriti sets refill reminders", input: (c) => ({ text: `Set reminders to take and refill these medicines on time: ${(c.results.rx?.medicines || []).map((m) => m.brandName || m.genericName).join(", ")}.`, today: c.today }) },
    ],
  },
  "explainer": {
    title: "Topic → Explainer video → Schedule posts",
    desc: "Turn any topic or product into a short explainer video script, then schedule the posts.",
    seedLabel: "The topic / product to explain",
    accent: "#6D4AA7",
    steps: [
      { key: "video", agent: "pragyan", label: "Pragyan scripts the video", input: (c) => ({ title: c.seed.text, headlines: [], mode: "topic" }) },
      { key: "schedule", agent: "samay", label: "Smriti schedules the posts", input: (c) => ({ text: `Plan creating and posting this explainer over the next week: "${c.results.video?.title || c.seed.text}".`, today: c.today }) },
    ],
  },
};

/* ---- live weather provider (Open-Meteo, keyless) for the 'weather' step ---- */
// Returns { in: first Indian match, any: first match overall } for a query.
async function geocode(q) {
  try {
    const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`)).json();
    const list = r?.results || [];
    return { in: list.find((x) => x.country_code === "IN") || null, any: list[0] || null };
  } catch { return { in: null, any: null }; }
}
export async function getWeather(place) {
  let g = null;        // best Indian match (preferred)
  let anyMatch = null; // first match overall (fallback)
  if (place) {
    // common filler / crop / problem words that aren't place names
    const stop = new Set("the and for with near from into your you are have has crop crops field farm farmer farmers leaves leaf plant plants tree trees fruit yellow yellowing spots spot disease pest pests soil water rain wheat paddy rice tomato potato onion cotton sugarcane maize corn small half acre acres".split(" "));
    // try the whole string, then each meaningful word, preferring an Indian place
    const tries = [place, ...place.split(/[^A-Za-z]+/).filter((w) => w.length > 2 && !stop.has(w.toLowerCase()))];
    for (const q of tries) {
      const res = await geocode(q);
      anyMatch = anyMatch || res.in || res.any;
      if (res.in) { g = res.in; break; }
    }
    g = g || anyMatch;
  }
  const lat = g ? g.latitude : 20.59;
  const lng = g ? g.longitude : 78.96;
  const name = g ? `${g.name}${g.admin1 ? ", " + g.admin1 : ""}` : (place || "India");
  try {
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`)).json();
    const c = w.current || {}, d = w.daily || {};
    const rain3 = (d.precipitation_sum || []).slice(0, 3).reduce((s, x) => s + (x || 0), 0);
    const forecast = (d.time || []).slice(0, 3).map((t, i) => `${t}: ${Math.round(d.temperature_2m_min?.[i])}–${Math.round(d.temperature_2m_max?.[i])}°C, ${Math.round(d.precipitation_sum?.[i])}mm`);
    return { summary: `${name}: ${Math.round(c.temperature_2m)}°C, ${Math.round(c.relative_humidity_2m)}% humidity, wind ${Math.round(c.wind_speed_10m)} km/h; ~${Math.round(rain3)}mm rain over 3 days.`, location: name, temp: c.temperature_2m, humidity: c.relative_humidity_2m, wind: c.wind_speed_10m, rain3, forecast };
  } catch {
    return { summary: `Live weather unavailable for ${name}.`, location: name, forecast: [] };
  }
}

/** Run one step (used both by the full run and the live, client-driven run). */
async function execStep(step, ctx, language) {
  const input = step.input(ctx);
  if (step.agent === "weather") return getWeather(input.place);
  if (!hasKey) return { ...(mocks[step.agent] || {}), _mock: true };
  try {
    return await generateJSON({ system: features[step.agent].system(language), parts: features[step.agent].parts(input), schema: features[step.agent].schema });
  } catch (err) {
    return { ...(mocks[step.agent] || {}), _mock: true, _error: String(err?.message || err) };
  }
}

/** Run a single step by index (live mode) — client passes accumulated results. */
export async function runStep(id, index, seed = {}, results = {}, language = "English", today = "today") {
  const wf = WORKFLOWS[id];
  if (!wf) throw new Error(`Unknown workflow: ${id}`);
  const step = wf.steps[index];
  if (!step) throw new Error(`Bad step index: ${index}`);
  const data = await execStep(step, { seed, results, today }, language);
  return { key: step.key, agent: step.agent, label: step.label, data, count: wf.steps.length, last: index >= wf.steps.length - 1 };
}

const keywordPick = (text) => {
  const s = (text || "").toLowerCase();
  if (/business|startup|msme|udyam|gst|licen[cs]e|loan|scheme|subsidy|register/.test(s)) return "msme-launch";
  if (/medicine|prescription|tablet|generic|pharmacy|doctor|health/.test(s)) return "health-savings";
  if (/video|explainer|content|post|reel|market|podcast|topic/.test(s)) return "explainer";
  return "resolve-grievance";
};

/** AI planner: choose the best workflow id for a free-text problem. */
export async function planWorkflow(text, language = "English") {
  if (hasKey) {
    try {
      const ids = Object.keys(WORKFLOWS);
      const out = await generateJSON({
        system: `You route a user's problem to ONE multi-agent workflow. Options:\n${ids.map((id) => `- ${id}: ${WORKFLOWS[id].desc}`).join("\n")}\nReturn the single best workflow id.`,
        parts: [{ text: `User's problem:\n"""\n${text || ""}\n"""` }],
        schema: { type: Type.OBJECT, properties: { workflow: { type: Type.STRING, enum: ids } }, required: ["workflow"] },
      });
      if (out?.workflow && WORKFLOWS[out.workflow]) return out.workflow;
    } catch { /* fall through */ }
  }
  return keywordPick(text);
}

/** Run a workflow end-to-end, chaining each agent's output into the next. */
export async function runWorkflow(id, seed = {}, language = "English", today = "today") {
  const wf = WORKFLOWS[id];
  if (!wf) throw new Error(`Unknown workflow: ${id}`);
  const ctx = { seed, results: {}, today };
  const steps = [];
  for (const step of wf.steps) {
    const data = await execStep(step, ctx, language);
    ctx.results[step.key] = data;
    steps.push({ key: step.key, agent: step.agent, label: step.label, data });
  }
  return { id, title: wf.title, steps };
}

export const workflowList = () =>
  Object.entries(WORKFLOWS).map(([id, w]) => ({
    id, title: w.title, desc: w.desc, seedLabel: w.seedLabel, accent: w.accent,
    steps: w.steps.map((s) => ({ agent: s.agent, label: s.label })),
  }));
