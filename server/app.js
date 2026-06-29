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
import { buildDoc, MIME, slug } from "./docgen.js";
import { runWorkflow, runStep, planWorkflow, workflowList, getWeather } from "./workflows.js";

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
