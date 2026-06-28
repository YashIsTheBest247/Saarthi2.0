import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateJSON, hasKey, modelName } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { getNews } from "./news.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" })); // room for base64 document images

const PORT = process.env.PORT || 8787;

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
app.post("/api/route", makeHandler("route"));
app.post("/api/form16", makeHandler("form16"));

app.get("/api/news", async (_req, res) => {
  try {
    res.json(await getNews());
  } catch (err) {
    res.json({ items: [], live: false, _error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ Saarthi API on http://localhost:${PORT}`);
  console.log(`  ${hasKey ? `🟢 Live Gemini (${modelName})` : "🟡 Mock mode — set GEMINI_API_KEY in .env for real AI"}\n`);
});
