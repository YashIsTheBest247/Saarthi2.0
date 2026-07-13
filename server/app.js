import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateJSON, hasKey, modelName } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { getNews, getTrending } from "./news.js";
import { getJobs } from "./jobs.js";
import { handleTelegram } from "./telegram.js";
import { handleResumePdf } from "./resumePdf.js";
import { sendMail, mailEnabled, completionHtml } from "./notify.js";
import { buildDoc, buildCatalystReport, MIME, slug } from "./docgen.js";
import { runWorkflow, runStep, planWorkflow, workflowList, getWeather } from "./workflows.js";
import { runAgentic, plan as agentPlan, execAgent, synthesize as agentSynthesize, roster } from "./orchestrator.js";
import { employeeList, runEmployee } from "./employees.js";
import { requireKey, tenantInfo, enforce as tenancyEnforced } from "./tenancy.js";
import { validateGSTIN, tallyInvoiceXML, ewayBillPayload, sendWhatsApp, connectorStatus } from "./connectors.js";

/**
 * The Express app, with no `listen()` — so it can be used both by the local
 * dev server (server/index.js) and by the Vercel serverless wrapper (api/index.js).
 */
export const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" })); // room for base64 document images

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, live: hasKey, model: hasKey ? modelName : "mock", time: Date.now() });
});

/**
 * Generic feature handler. Body must include `language` plus the
 * feature-specific fields consumed by prompts.js `parts(...)`.
 */
function makeHandler(key) {
  const feature = features[key];
  return async (req, res) => {
    const { language = "English", ...input } = req.body || {};
    try {
      if (!hasKey) {
        return res.json({ ...mocks[key], _mock: true });
      }
      const data = await generateJSON({
        system: feature.system(language),
        parts: feature.parts(input),
        schema: feature.schema,
      });
      res.json(data);
    } catch (err) {
      console.error(`[${key}]`, err?.message || err);
      // Graceful fallback so a live demo never dies on stage.
      res.json({ ...mocks[key], _mock: true, _error: String(err?.message || err) });
    }
  };
}

app.post("/api/kavach", makeHandler("kavach"));
app.post("/api/samajh", makeHandler("samajh"));
app.post("/api/haq", makeHandler("haq"));
app.post("/api/sehat", makeHandler("sehat"));
app.post("/api/paisa", makeHandler("paisa"));
app.post("/api/samay", makeHandler("samay"));
app.post("/api/setu", makeHandler("setu"));
app.post("/api/krishi", makeHandler("krishi"));
app.post("/api/kar", makeHandler("kar"));
app.post("/api/raahat", makeHandler("raahat"));
app.post("/api/disha", makeHandler("disha"));
app.post("/api/resume", makeHandler("resume"));
app.post("/api/resume/pdf", (req, res) => handleResumePdf(req, res));
app.post("/api/extract", makeHandler("extract"));
app.post("/api/route", makeHandler("route"));
app.post("/api/emergency", makeHandler("emergency"));
app.post("/api/manager", makeHandler("manager"));
app.post("/api/study", makeHandler("study"));
app.post("/api/intake", makeHandler("intake"));
app.post("/api/assist", makeHandler("assist"));
app.post("/api/pragyan", makeHandler("pragyan"));
app.post("/api/udyam", makeHandler("udyam"));
app.post("/api/khanan", makeHandler("khanan"));
app.post("/api/skillmatch", makeHandler("skillmatch"));
app.post("/api/interview", makeHandler("interview"));
app.post("/api/khananCopilot", makeHandler("khananCopilot"));
app.post("/api/khananPredict", makeHandler("khananPredict"));
app.post("/api/khananNotice", makeHandler("khananNotice"));

// Email-me-when-done. POST { to, subject?, title?, message } → real email via
// Gmail SMTP if configured, else a demo-safe mock so the UI flow still works.
app.get("/api/notify", (_req, res) => res.json({ enabled: mailEnabled }));
app.post("/api/notify", async (req, res) => {
  const { to, subject, title, message = "", ics } = req.body || {};
  const email = String(to || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "invalid-email" });
  if (!mailEnabled) return res.json({ ok: true, _mock: true });
  try {
    await sendMail({
      to: email,
      subject: subject || "✅ Your Saarthi task is done",
      text: `${title ? title + "\n\n" : ""}${message}`,
      html: completionHtml({ title: title || "Your task is done", body: message }),
      attachments: ics ? [{ filename: "saarthi-reminder.ics", content: ics, contentType: "text/calendar" }] : undefined,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[notify]", err?.message || err);
    res.json({ ok: false, _error: String(err?.message || err) });
  }
});

// trending Economic Times stories (ranked) for the Pragyan news-reel agent
app.get("/api/trending", async (_req, res) => {
  try { res.json(await getTrending()); }
  catch (err) { res.json({ items: [], live: false, _error: String(err?.message || err) }); }
});

// stock image for a scene: Pexels (if key set) else keyless Pollinations
app.get("/api/pexels", async (req, res) => {
  const q = String(req.query.q || "news").slice(0, 80);
  const key = process.env.PEXELS_API_KEY;
  if (key) {
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape&size=medium`, { headers: { Authorization: key } });
      const j = await r.json();
      const url = j?.photos?.[0]?.src?.large2x || j?.photos?.[0]?.src?.large;
      if (url) return res.json({ url, source: "pexels", credit: j.photos[0].photographer });
    } catch { /* fall through */ }
  }
  res.json({ url: `https://image.pollinations.ai/prompt/${encodeURIComponent(q + ", cinematic editorial photo, news")}?width=1280&height=720&nologo=true&model=flux`, source: "pollinations" });
});
app.get("/api/weather", async (req, res) => {
  try { res.json(await getWeather(req.query.place || "")); }
  catch (err) { res.json({ summary: "Live weather unavailable.", _error: String(err?.message || err) }); }
});

// Export Acharya's content as a real document: Times New Roman, 12pt, formatted.
app.post("/api/study/export", async (req, res) => {
  try {
    const { content, format = "pdf", font = "Times New Roman", size = 12 } = req.body || {};
    if (!content || !content.title) return res.status(400).json({ error: "Missing content." });
    const fmt = ["pdf", "docx", "pptx"].includes(format) ? format : "pdf";
    const buf = await buildDoc(fmt, content, { font, size });
    res.setHeader("Content-Type", MIME[fmt]);
    res.setHeader("Content-Disposition", `attachment; filename="${slug(content.title)}.${fmt}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("[study/export]", err?.message || err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});
app.post("/api/form16", makeHandler("form16"));

// Turn ANY agent deliverable into a downloadable document (PDF / Word / PPT).
// Lets agents "produce a document", not just text.
app.post("/api/doc", async (req, res) => {
  try {
    const { title = "Saarthi document", text = "", format = "pdf" } = req.body || {};
    if (!String(text).trim()) return res.status(400).json({ error: "Missing text." });
    const fmt = ["pdf", "docx", "pptx"].includes(format) ? format : "pdf";
    // synthesize structured content from plain text (blank-line = paragraph break)
    const paragraphs = String(text).split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
    const content = {
      title,
      kind: "document",
      sections: [{ heading: "", paragraphs: paragraphs.length ? paragraphs : [String(text)] }],
      slides: [{ title, points: paragraphs.slice(0, 6) }],
      wordCount: String(text).split(/\s+/).length,
    };
    const buf = await buildDoc(fmt, content, { font: "Times New Roman", size: 12 });
    res.setHeader("Content-Type", MIME[fmt]);
    res.setHeader("Content-Disposition", `attachment; filename="${slug(title)}.${fmt}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("[doc]", err?.message || err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Visual Catalyst skill report (designed PDF — score cards, skill bars, sections).
app.post("/api/catalyst-report", async (req, res) => {
  try {
    const buf = await buildCatalystReport(req.body || {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Catalyst-Skill-Report.pdf"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("[catalyst-report]", err?.message || err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get("/api/news", async (_req, res) => {
  try {
    res.json(await getNews());
  } catch (err) {
    res.json({ items: [], live: false, _error: String(err?.message || err) });
  }
});

app.get("/api/workflows", (_req, res) => res.json({ workflows: workflowList() }));

app.post("/api/workflow", async (req, res) => {
  try {
    const { id, text = "", image, language = "English", today = "today" } = req.body || {};
    const wid = id === "auto" || !id ? await planWorkflow(text, language) : id;
    const out = await runWorkflow(wid, { text, image }, language, today);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Live, client-driven run: execute ONE step at a time so the UI can show the chain in action.
app.post("/api/workflow/step", async (req, res) => {
  try {
    const { id, index = 0, seed = {}, results = {}, language = "English", today = "today" } = req.body || {};
    const out = await runStep(id, index, seed, results, language, today);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/* ───────────────────────── Autonomous agentic orchestrator ─────────────────────────
 * A true plan→act→observe→reflect→synthesise loop that dynamically composes any
 * sequence of specialist agents from a free-text goal (server/orchestrator.js).
 * - GET  /api/agents          → the agent roster the planner can compose
 * - POST /api/agent           → full autonomous run (returns the whole trace)
 * - POST /api/agent/plan      → just the dynamic plan (for a live, animated UI)
 * - POST /api/agent/step      → run ONE planned step live (client-driven)
 * - POST /api/agent/synthesize→ weave executed steps into the final deliverable
 */
app.get("/api/agents", (_req, res) => res.json({ agents: roster() }));

app.post("/api/agent", async (req, res) => {
  try {
    const { goal = "", text = "", image, today = "today", location, language = "English" } = req.body || {};
    const g = String(goal || text).trim();
    if (!g) return res.status(400).json({ error: "Missing goal." });
    res.json(await runAgentic(g, { image, today, location, language }));
  } catch (err) {
    console.error("[agent]", err?.message || err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/api/agent/plan", async (req, res) => {
  try {
    const { goal = "", text = "", language = "English" } = req.body || {};
    const g = String(goal || text).trim();
    if (!g) return res.status(400).json({ error: "Missing goal." });
    const p = await agentPlan(g, language);
    res.json({ goal: g, ...p });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/api/agent/step", async (req, res) => {
  try {
    const { agent, task = "", context = "", image, today = "today", location, language = "English" } = req.body || {};
    if (!agent || !task) return res.status(400).json({ error: "Missing agent or task." });
    const full = context ? `${task}\n\nContext from earlier steps:\n${context}` : task;
    const out = await execAgent(agent, full, { image, today, location }, language);
    out.task = task; // return the clean task
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/api/agent/synthesize", async (req, res) => {
  try {
    const { goal = "", steps = [], language = "English" } = req.body || {};
    if (!goal || !Array.isArray(steps) || !steps.length) return res.status(400).json({ error: "Missing goal or steps." });
    res.json(await agentSynthesize(goal, steps, language));
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/* ───────────────────────── AI Workforce — rentable AI employees ─────────────────────────
 * An organisation integrates these endpoints to "hire" an AI employee and automate a
 * workflow. Each employee runs the persona-scoped autonomous loop (server/employees.js).
 * - GET  /api/employees        → the hireable role catalog
 * - POST /api/employees/:id/task {task,...}   → assign a task; returns the run + deliverable
 *        (id can be "custom" with {custom:{title,jd,skills}} to hire ad-hoc from a JD)
 * This is the "agent as rent" integration surface — call it from an ERP, cron, or Zapier.
 */
app.get("/api/employees", (_req, res) => res.json({ employees: employeeList() }));

// Tenant + usage for the caller's key (Fleet dashboard). Open in demo mode.
app.get("/api/workforce/me", (req, res) => {
  const info = tenantInfo(req.header("x-api-key") || req.query.api_key || "");
  res.json({ tenant: info, enforced: tenancyEnforced, roles: employeeList().length });
});

// Assign a task → runs the persona-scoped autonomous loop. API-key gated (open in demo).
// Optionally invoke a specific depth function via `function` (the role's duty id).
app.post("/api/employees/:id/task", requireKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { task = "", text = "", image, today = "today", location, language = "English", custom, function: fn } = req.body || {};
    const t = String(task || text).trim();
    if (!t) return res.status(400).json({ error: "Missing task." });
    const out = await runEmployee(id, t, { image, today, location, language, custom, fn });
    res.json({ ...out, tenant: req.tenant?.tenant });
  } catch (err) {
    console.error("[employee]", err?.message || err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/* ───────────────────────── Integration connectors (real tools) ─────────────────────────
 * The tools that let AI employees integrate with an org's systems and emit
 * integration-ready artefacts (server/connectors.js). Deterministic + real.
 */
app.get("/api/tools", (_req, res) => res.json({ connectors: connectorStatus() }));

// Validate an Indian GSTIN (on-device check-digit algorithm — exact, keyless).
app.post("/api/tools/gstin", (req, res) => {
  res.json(validateGSTIN((req.body || {}).gstin));
});

// Generate a Tally-import Sales voucher XML. ?download=1 streams a .xml file.
app.post("/api/tools/tally", (req, res) => {
  try {
    const xml = tallyInvoiceXML(req.body || {});
    if (String(req.query.download) === "1") {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", `attachment; filename="tally-voucher.xml"`);
      return res.send(xml);
    }
    res.json({ xml });
  } catch (err) { res.status(500).json({ error: String(err?.message || err) }); }
});

// Generate a NIC e-way-bill JSON payload (upload-ready shape).
app.post("/api/tools/eway", (req, res) => {
  try { res.json({ payload: ewayBillPayload(req.body || {}) }); }
  catch (err) { res.status(500).json({ error: String(err?.message || err) }); }
});

// WhatsApp: send via a configured provider, else return a keyless wa.me link.
app.post("/api/tools/whatsapp", async (req, res) => {
  const { phone, text } = req.body || {};
  res.json(await sendWhatsApp(phone, text));
});

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await getJobs(req.query.q || "", req.query.loc || "");
    res.json({ jobs, live: jobs.length > 0 });
  } catch (err) {
    res.json({ jobs: [], live: false, _error: String(err?.message || err) });
  }
});

// Telegram bot webhook — Telegram POSTs updates here.
app.post("/api/telegram", (req, res) => handleTelegram(req, res));
app.get("/api/telegram", (_req, res) => res.json({ ok: true, bot: "Saarthi Telegram webhook" }));

export default app;
