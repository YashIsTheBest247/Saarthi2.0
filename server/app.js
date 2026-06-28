import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateJSON, hasKey, modelName } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { getNews } from "./news.js";
import { getJobs } from "./jobs.js";
import { handleTelegram } from "./telegram.js";
import { handleResumePdf } from "./resumePdf.js";

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
app.post("/api/route", makeHandler("route"));
app.post("/api/emergency", makeHandler("emergency"));
app.post("/api/form16", makeHandler("form16"));

app.get("/api/news", async (_req, res) => {
  try {
    res.json(await getNews());
  } catch (err) {
    res.json({ items: [], live: false, _error: String(err?.message || err) });
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
