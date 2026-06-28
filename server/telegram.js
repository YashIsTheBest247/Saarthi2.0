import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
const API = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

async function send(chatId, text, extra = {}) {
  if (!TOKEN) return;
  try {
    await fetch(API("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...extra }),
    });
  } catch (err) {
    console.error("[telegram] send", err?.message || err);
  }
}

const isHindi = (s) => /[ऀ-ॿ]/.test(s || "");

/**
 * Telegram webhook. Telegram POSTs an update; we read the message, run the
 * `assist` model (route + full answer in one call), reply in chat, and add a
 * deep link that opens the right agent in the web app.
 */
export async function handleTelegram(req, res) {
  // IMPORTANT: on serverless the function can be frozen as soon as the response
  // is sent — so we do ALL the work (Gemini + sendMessage) and only THEN ack 200.
  try {
    const msg = req.body?.message || req.body?.edited_message;
    const chatId = msg?.chat?.id;
    const text = (msg?.text || "").trim();
    if (!chatId) return;

    if (!TOKEN) {
      console.error("[telegram] TELEGRAM_BOT_TOKEN not set");
      return;
    }

    if (text === "/start" || text === "/help") {
      await send(
        chatId,
        "🙏 Namaste! I'm Saarthi — your all-in-one AI helper for everyday India.\n\nJust tell me your problem (scam, bill, health, money, tax, scheme, complaint, farming, disaster, or planning) and I'll help right here, and connect you to the right expert.\n\nTry: \"I got an OTP and money was debited\".",
      );
      return;
    }
    if (!text) {
      await send(chatId, "Please send your question as text and I'll help. 🙂");
      return;
    }

    const language = isHindi(text) ? "Hindi" : "English";
    let data;
    if (!hasKey) {
      data = { ...mocks.assist };
    } else {
      try {
        data = await generateJSON({
          system: features.assist.system(language),
          parts: features.assist.parts({ problem: text }),
          schema: features.assist.schema,
        });
      } catch (err) {
        console.error("[telegram] assist", err?.message || err);
        data = { ...mocks.assist };
      }
    }

    const name = data.agentName || "Saarthi";
    let reply = `${data.reply}\n\n— ${name}`;
    if (APP_URL && data.agent) {
      const link = `${APP_URL}/?agent=${encodeURIComponent(data.agent)}&q=${encodeURIComponent(text)}`;
      reply += `\n\nOpen ${name} in the app: ${link}`;
    }
    await send(chatId, reply);
  } catch (err) {
    console.error("[telegram] handler", err?.message || err);
  } finally {
    // Ack last, after the reply has been sent, so the lambda isn't frozen early.
    if (!res.headersSent) res.json({ ok: true });
  }
}
