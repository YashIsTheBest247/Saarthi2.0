// ─────────────────────────────────────────────────────────────────────────────
// Saarthi · Autonomous Agentic Orchestrator ("Smriti Prime")
//
// A TRUE agent loop, not a fixed pipeline. Given any free-text goal it:
//   1. PLANS   — an LLM decomposes the goal into an ordered plan of specialist
//                agent calls, choosing *which* agents and *in what order*.
//   2. ACTS    — runs each agent, feeding earlier results into later steps.
//   3. OBSERVES— summarises every result into a running working-memory.
//   4. REFLECTS— an LLM inspects progress and decides: done, or add follow-up
//                steps (re-planning). Bounded so it always terminates.
//   5. SYNTHESISES — composes one finished, ready-to-use deliverable + actions.
//
// This is the difference between "orchestrated" (a developer wired the chain)
// and "agentic" (the model composes the chain at runtime, and revises it).
//
// It reuses every existing agent brain in prompts.js, degrades to demo mocks
// with no API key, and never throws to the caller.
// ─────────────────────────────────────────────────────────────────────────────
import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { getWeather } from "./workflows.js";
import { Type } from "@google/genai";

/* Bounds — guarantee the loop always terminates (no runaway agent). */
const MAX_TOTAL_STEPS = 8;   // hard ceiling across all rounds
const MAX_REFLECT_ROUNDS = 2; // how many times it may re-plan

/**
 * The roster the planner can compose. Each entry maps a generic natural-language
 * `task` (written by the planner) onto that agent's real input shape (prompts.js).
 * `use` tells the planner *when* to reach for the agent.
 */
export const REGISTRY = [
  { key: "kavach", name: "Abhay", role: "Scam Shield",
    use: "check if a message / call / email / UPI request is a scam or fraud; give a risk verdict and what to do",
    toInput: (t) => ({ message: t, channel: "unknown" }) },
  { key: "samajh", name: "Vidya", role: "Document Decoder",
    use: "explain a confusing bill, notice, insurance/legal/govt letter or contract in plain language and flag hidden charges",
    toInput: (t, c) => ({ text: t, image: c.image }) },
  { key: "haq", name: "Haq", role: "Scheme Finder",
    use: "find central/state government welfare schemes, subsidies or pensions a person likely qualifies for",
    toInput: (t) => ({ profile: { details: t } }) },
  { key: "sehat", name: "Asha", role: "Health Saver",
    use: "decode a prescription into cheaper generic medicines / Jan Aushadhi savings, or give symptom guidance",
    toInput: (t, c) => ({ text: t, mode: "prescription", image: c.image }) },
  { key: "paisa", name: "Nidhi", role: "Money Autopilot",
    use: "analyse spending, build a budget, find money leaks and a concrete savings plan",
    toInput: (t, c) => ({ text: t, image: c.image }) },
  { key: "setu", name: "Adhrit", role: "Grievance Autopilot",
    use: "draft a ready-to-file complaint to the right authority with the citizen's rights and an escalation ladder",
    toInput: (t, c) => ({ problem: t, image: c.image }) },
  { key: "krishi", name: "Bhupati", role: "Kisan Saathi",
    use: "diagnose a crop problem and give weather-aware farm advice and agri schemes",
    toInput: (t, c) => ({ text: t, image: c.image }) },
  { key: "kar", name: "Lekh", role: "Tax Copilot",
    use: "answer income-tax questions and compute tax (FY 2025-26 new regime)",
    toInput: (t) => ({ figures: {}, question: t }) },
  { key: "udyam", name: "Udyam", role: "Business & MSME Launchpad",
    use: "give the steps to start/run a business — Udyam, GST, licences — and the MSME schemes & loans (Mudra, PMEGP, CGTMSE) that fit",
    toInput: (t) => ({ problem: t }) },
  { key: "disha", name: "Disha", role: "Career Copilot",
    use: "tailor a résumé, give career guidance or interview preparation for a target role",
    toInput: (t) => ({ mode: "resume", details: t }) },
  { key: "study", name: "Acharya", role: "Study & Homework",
    use: "write a structured essay / report / notes / speech on a topic",
    toInput: (t, c) => ({ topic: t, kind: "essay", level: "general", length: "about 500 words", tone: "clear, human", today: c.today }) },
  { key: "pragyan", name: "Pragyan", role: "Educational Media",
    use: "turn a topic into a short educational video / podcast script with subtitles",
    toInput: (t) => ({ title: t, headlines: [], mode: "topic" }) },
  { key: "khananCopilot", name: "Khanan", role: "Mining Compliance",
    use: "help a mine owner with DGMS inspection readiness, royalty/DMF, permits and compliance",
    toInput: (t, c) => ({ question: t, context: "", location: c.location || "India" }) },
  { key: "weather", name: "Mausam", role: "Live Weather",
    use: "fetch the live weather forecast for a place — use FIRST when a plan involves outdoor work, farming or travel",
    toInput: (t) => ({ place: t }) },
  { key: "samay", name: "Smriti", role: "Chief of Staff",
    use: "turn the resulting actions and any deadlines into a prioritised plan and schedule with reminders — usually a good FINAL step",
    toInput: (t, c) => ({ text: t, today: c.today }) },
];

const BY_KEY = Object.fromEntries(REGISTRY.map((a) => [a.key, a]));
const KEYS = REGISTRY.map((a) => a.key);
export const roster = () => REGISTRY.map(({ key, name, role, use }) => ({ key, name, role, use }));

// A "persona" scopes the loop to one AI-employee role: { name, role, brief, allow:[agentKeys] }.
// When `allow` is set, the planner may only compose those skills (+ the scheduler).
const rosterFor = (persona) => {
  if (persona?.allow?.length) {
    const set = new Set([...persona.allow, "samay"]);
    const list = REGISTRY.filter((a) => set.has(a.key));
    return list.length ? list : REGISTRY;
  }
  return REGISTRY;
};
const keysFor = (persona) => rosterFor(persona).map((a) => a.key);
const rosterText = (persona) => rosterFor(persona).map((a) => `- ${a.key} (${a.name}, ${a.role}): ${a.use}`).join("\n");

/* ── Observe: compress any agent's structured result into short working-memory ── */
const S = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");
export function summarize(data) {
  if (!data || typeof data !== "object") return "(no result)";
  const bits = [];
  for (const f of ["headline", "summary", "topPriority", "verdict", "diagnosis", "title", "authority", "location"]) {
    const s = S(data[f]);
    if (s && !bits.includes(s)) bits.push(s);
  }
  const listFields = ["safeActions", "keyPoints", "actionPlan", "plan", "tasks", "schemes",
    "medicines", "actionItems", "yourRights", "escalation", "steps", "forecast"];
  for (const f of listFields) {
    if (Array.isArray(data[f]) && data[f].length) {
      const items = data[f].slice(0, 3)
        .map((x) => (typeof x === "string" ? x : (x.step || x.title || x.task || x.name || x.flag || x.brandName || x.genericName || "")))
        .filter(Boolean);
      if (items.length) { bits.push(items.join("; ")); break; }
    }
  }
  const out = bits.join(" — ");
  return (out || JSON.stringify(data)).slice(0, 700);
}

/* ── Act: run a single agent, robust + mock-safe ── */
export async function execAgent(key, task, ctx = {}, language = "English") {
  const a = BY_KEY[key];
  if (!a) return { data: { _error: `unknown agent ${key}` }, summary: "(unknown agent)" };
  const input = a.toInput(task, ctx);
  let data;
  if (key === "weather") {
    data = await getWeather(input.place);
  } else if (!hasKey) {
    data = { ...(mocks[key] || {}), _mock: true };
  } else {
    try {
      data = await generateJSON({
        system: features[key].system(language),
        parts: features[key].parts(input),
        schema: features[key].schema,
      });
    } catch (err) {
      data = { ...(mocks[key] || {}), _mock: true, _error: String(err?.message || err) };
    }
  }
  return { key, name: a.name, role: a.role, task, data, summary: summarize(data) };
}

/* ── Schemas for the planner / reflector / synthesiser (enum scoped per persona) ── */
const mkStepSchema = (keys) => ({
  type: Type.OBJECT,
  properties: {
    agent: { type: Type.STRING, enum: keys },
    task: { type: Type.STRING, description: "A concrete, self-contained instruction for that agent, including the context it needs." },
    why: { type: Type.STRING, description: "One line: why this agent, now." },
  },
  required: ["agent", "task"],
});
const mkPlanSchema = (keys) => ({
  type: Type.OBJECT,
  properties: {
    understanding: { type: Type.STRING, description: "One sentence restating the real goal." },
    steps: { type: Type.ARRAY, items: mkStepSchema(keys) },
  },
  required: ["understanding", "steps"],
});
const mkReflectSchema = (keys) => ({
  type: Type.OBJECT,
  properties: {
    done: { type: Type.BOOLEAN, description: "True if the goal is fully served by the work so far." },
    reason: { type: Type.STRING },
    next: { type: Type.ARRAY, items: mkStepSchema(keys), description: "Follow-up steps if not done (leave empty if done)." },
  },
  required: ["done"],
});
const FINAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "One-line result in the user's language." },
    summary: { type: Type.STRING, description: "2-3 sentence plain summary of what was done and found." },
    deliverable: { type: Type.STRING, description: "The finished, ready-to-use output the user actually wanted (e.g. the drafted complaint, the plan, the answer). Self-contained." },
    actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete one-tap next actions for the user." },
    reminders: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, when: { type: Type.STRING } }, required: ["title"] },
      description: "Any dated follow-ups worth a calendar reminder.",
    },
    structured: {
      type: Type.OBJECT,
      description: "OPTIONAL machine-readable data for system integrations. Fill ONLY when the deliverable is an invoice, purchase order or dispatch; otherwise omit entirely.",
      properties: {
        gstins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Any GSTINs referenced (15-char)." },
        invoice: {
          type: Type.OBJECT,
          description: "Set when the deliverable is an invoice/PO — used to generate a Tally voucher.",
          properties: {
            party: { type: Type.STRING }, invoiceNo: { type: Type.STRING }, date: { type: Type.STRING, description: "YYYY-MM-DD" },
            gstRate: { type: Type.NUMBER }, gstAmount: { type: Type.NUMBER },
            items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, qty: { type: Type.NUMBER }, rate: { type: Type.NUMBER }, amount: { type: Type.NUMBER } } } },
          },
        },
        eway: {
          type: Type.OBJECT,
          description: "Set when the deliverable is a dispatch — used to generate an e-way bill payload.",
          properties: {
            docNo: { type: Type.STRING }, fromGstin: { type: Type.STRING }, toGstin: { type: Type.STRING },
            transDistance: { type: Type.NUMBER }, vehicleNo: { type: Type.STRING },
            items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, hsn: { type: Type.NUMBER }, qty: { type: Type.NUMBER }, taxRate: { type: Type.NUMBER }, taxable: { type: Type.NUMBER } } } },
          },
        },
      },
    },
  },
  required: ["headline", "summary", "deliverable"],
};

/* ── Keyword fallback plan (no API key / planner failure) so demos never break ── */
function heuristicPlan(goal, persona = null) {
  // Scoped employee with no API key: a single-step plan on its primary skill (or none → reason directly).
  if (persona?.allow?.length) {
    const primary = persona.allow.find((k) => BY_KEY[k]) || null;
    return { understanding: goal, steps: primary ? [{ agent: primary, task: goal, why: persona.role }] : [] };
  }
  const s = (goal || "").toLowerCase();
  const steps = [];
  const add = (agent, task, why) => steps.push({ agent, task: task || goal, why });
  if (/scam|fraud|otp|suspicious|debited|phishing|lottery|kyc|cheat|electricity.*(cut|disconn|pay)|disconnect|click.*link|pay.*(link|now|tonight)|arrest|refund/.test(s)) {
    add("kavach", goal, "verify the fraud"); add("setu", `Draft a complaint to report this fraud: ${goal}`, "file it"); add("samay", `Schedule following up on this fraud report: ${goal}`, "follow up");
  } else if (/crop|farm|kisan|paddy|wheat|tomato|pest|sow|harvest/.test(s)) {
    add("weather", goal, "outdoor work needs weather"); add("krishi", goal, "diagnose"); add("haq", `Farm schemes for: ${goal}`, "subsidies"); add("samay", `Schedule the farm actions for: ${goal}`, "plan season");
  } else if (/business|startup|msme|udyam|gst|loan|mudra/.test(s)) {
    add("udyam", goal, "the path"); add("haq", `Government schemes/loans for this business: ${goal}`, "funding"); add("samay", `Plan the launch steps for: ${goal}`, "execute");
  } else if (/medicine|prescription|tablet|generic|pharmacy|health|doctor/.test(s)) {
    add("sehat", goal, "cheaper generics"); add("samay", `Set refill reminders for: ${goal}`, "adherence");
  } else if (/bill|notice|letter|policy|contract|document|insurance/.test(s)) {
    add("samajh", goal, "decode"); add("setu", `If this is unfair, draft a complaint about: ${goal}`, "act"); add("samay", `Schedule any deadlines from: ${goal}`, "deadlines");
  } else if (/job|resume|résumé|career|interview|hiring/.test(s)) {
    add("disha", goal, "tailor"); add("samay", `Plan the job applications for: ${goal}`, "apply");
  } else if (/landlord|deposit|rent|refund|complaint|overcharg|denied|not return|not working|faulty|harass|grievance|water supply|ration/.test(s)) {
    add("setu", goal, "draft the complaint"); add("samay", `Schedule following up on this grievance until resolved: ${goal}`, "follow up");
  } else {
    add("haq", `Any government help relevant to: ${goal}`, "entitlements"); add("samay", `Turn this into a prioritised plan: ${goal}`, "organise");
  }
  return { understanding: goal, steps: steps.slice(0, 4) };
}

/* Intro line for the planner/reflector — Smriti Prime, or a hired AI employee. */
const personaIntro = (persona) => persona
  ? `You are ${persona.name}, an autonomous AI ${persona.role} working for the client organisation. Your remit:\n"""\n${persona.brief}\n"""\nWork the task as this employee would. You can delegate to these specialist tools:`
  : `You are Smriti Prime, Saarthi's autonomous orchestrator for Indian users. Decompose the goal into an ordered plan of specialist-agent calls.\n\nYour agent team:`;

/* ── Plan ── */
export async function plan(goal, language = "English", persona = null) {
  if (!hasKey) return heuristicPlan(goal, persona);
  try {
    const out = await generateJSON({
      system: `${personaIntro(persona)}
${rosterText(persona)}

Rules:
- Pick ONLY tools that genuinely advance the task. 1 to 5 steps${persona ? " (a role task may need just 1–2)" : ""}.
- Order them so an earlier output informs a later one (e.g. decode a document → draft a response → schedule follow-up).
- Be proactive: do a little MORE than literally asked when it clearly helps.
- Prefer ending with the scheduler (samay) to turn the outcome into scheduled actions when there are deadlines.
- Each step's "task" must be a concrete, self-contained instruction, written in ${language}.`,
      parts: [{ text: `${persona ? "Assigned task" : "User's goal"}:\n"""\n${goal || ""}\n"""` }],
      schema: mkPlanSchema(keysFor(persona)),
    });
    if (out?.steps?.length) {
      const allow = new Set(keysFor(persona));
      out.steps = out.steps.filter((st) => BY_KEY[st.agent] && allow.has(st.agent)).slice(0, MAX_TOTAL_STEPS);
      if (out.steps.length) return out;
    }
  } catch { /* fall through */ }
  return heuristicPlan(goal, persona);
}

/* ── Reflect / re-plan ── */
export async function reflect(goal, executed, language = "English", room = 0, persona = null) {
  if (!hasKey || room <= 0) return { done: true, reason: "no re-planning", next: [] };
  const memory = executed.map((s, i) => `${i + 1}. [${s.name} · ${s.role}] task: ${s.task}\n   result: ${s.summary}`).join("\n");
  try {
    const out = await generateJSON({
      system: `${personaIntro(persona)}
${rosterText(persona)}

Review progress on the task. If a clearly valuable follow-up remains (a tool not yet used whose output would help), propose up to ${room} more steps; otherwise mark done. Be decisive and frugal — only add a step if it materially helps. Reply in ${language}.`,
      parts: [{ text: `Task:\n"""\n${goal}\n"""\n\nWork done:\n${memory}` }],
      schema: mkReflectSchema(keysFor(persona)),
    });
    const allow = new Set(keysFor(persona));
    const next = (out?.next || []).filter((st) => BY_KEY[st.agent] && allow.has(st.agent)).slice(0, room);
    return { done: !!out?.done || next.length === 0, reason: out?.reason || "", next };
  } catch {
    return { done: true, reason: "reflection unavailable", next: [] };
  }
}

/* ── Synthesise the finished deliverable ── */
export async function synthesize(goal, executed, language = "English", persona = null) {
  const memory = executed.map((s, i) => `${i + 1}. [${s.name} · ${s.role}]\n${s.summary}`).join("\n\n");
  if (!hasKey) {
    return {
      headline: persona ? `${persona.name} completed the task.` : `Done — ${executed.length} agents worked on your goal.`,
      summary: `${persona ? persona.name : "Saarthi"} ran ${executed.map((s) => s.name).join(" → ") || "its own reasoning"} for: ${goal}.`,
      deliverable: memory || `(${persona ? persona.role + " " : ""}deliverable — connect an API key for full output.)`,
      actions: persona ? ["Approve & send", "Assign a follow-up", "Export"] : ["Save as PDF", "Email me this", "Remind me"],
      reminders: [],
      _mock: true,
    };
  }
  try {
    const system = persona
      ? `You are ${persona.name}, an autonomous AI ${persona.role}. Complete the assigned task END TO END and hand over finished work — do not stop at advice or a plan. Draw on the specialist outputs below and go beyond the literal ask: anticipate the obvious next steps a diligent employee would take and include them. "deliverable" is the actual, ready-to-use work product (the drafted document, filled form, computed numbers, email — whatever the task needs).

- Put concrete, client-ready detail in "deliverable" (drafts, tables, exact numbers, references to the right forms/portals/sections of law).
- Fill "actions" with the one-tap next steps.
- ALWAYS fill "reminders" with any dated follow-ups (deadlines, filing dates, review dates, payment due dates) as {title, when} so they can be auto-added to a calendar — even relative dates like "in 15 days" are fine.
- If the deliverable is an invoice/PO, fill "structured.invoice" (party, invoiceNo, date, items with qty/rate/amount, gstRate, gstAmount) for Tally export. If it is a dispatch, fill "structured.eway" (docNo, fromGstin, toGstin, items with hsn/qty/taxable, transDistance, vehicleNo). List any GSTINs in "structured.gstins". Otherwise omit "structured".

Reply in ${language}.`
      : `You are Smriti Prime. Several specialist agents have each done part of a user's goal. Weave their outputs into ONE cohesive, finished result the user can use immediately — not a description of the process. Keep the best concrete details (numbers, names, drafts, helplines). Reply in ${language}.`;
    return await generateJSON({
      system,
      parts: [{ text: `${persona ? "Assigned task" : "User's goal"}:\n"""\n${goal}\n"""\n\nWhat each tool produced:\n${memory || "(none — reason it out yourself from the task)"}` }],
      schema: FINAL_SCHEMA,
    });
  } catch {
    return { headline: "Done.", summary: `Ran ${executed.length} steps.`, deliverable: memory, actions: [], reminders: [] };
  }
}

/* Build a compact context string of prior results for the next step. */
const contextOf = (executed) =>
  executed.length ? executed.map((s) => `[${s.name}] ${s.summary}`).join("\n") : "";

/**
 * Full autonomous run: plan → act (with chaining) → reflect/re-plan → synthesise.
 * With `persona` it runs as a scoped AI employee; without it, as Smriti Prime.
 * Returns the whole trace so the UI can visualise every step and decision.
 */
export async function runAgentic(goal, { image, today = "today", location, language = "English", persona = null } = {}) {
  const ctxBase = { image, today, location };
  const trace = { goal, persona: persona ? { name: persona.name, role: persona.role } : null, understanding: "", plan: [], steps: [], reflections: [], result: null };

  const planned = await plan(goal, language, persona);
  trace.understanding = planned.understanding || goal;
  trace.plan = planned.steps;

  const executed = [];
  const runSteps = async (steps) => {
    for (const step of steps) {
      if (executed.length >= MAX_TOTAL_STEPS) break;
      const prior = contextOf(executed);
      const task = prior ? `${step.task}\n\nContext from earlier steps:\n${prior}` : step.task;
      const res = await execAgent(step.agent, task, ctxBase, language);
      res.why = step.why || "";
      res.task = step.task; // show the clean task, not the context-augmented one
      executed.push(res);
      trace.steps.push(res);
    }
  };

  await runSteps(planned.steps);

  for (let round = 0; round < MAX_REFLECT_ROUNDS; round++) {
    const room = MAX_TOTAL_STEPS - executed.length;
    if (room <= 0) break;
    const r = await reflect(goal, executed, language, Math.min(room, 3), persona);
    trace.reflections.push({ round: round + 1, done: r.done, reason: r.reason, added: r.next.map((s) => s.agent) });
    if (r.done || !r.next.length) break;
    await runSteps(r.next);
  }

  trace.result = await synthesize(goal, executed, language, persona);
  return trace;
}
