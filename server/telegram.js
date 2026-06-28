import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
const API = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

const isHindi = (s) => /[ऀ-ॿ]/.test(s || "");

const SUGGESTIONS = ["I got a suspicious SMS", "Help me understand a bill", "How do I save tax?"];
const AGENTS = [
  { key: "kavach", name: "Abhay · Scams" },
  { key: "samajh", name: "Vidya · Documents" },
  { key: "haq", name: "Haq · Schemes" },
  { key: "sehat", name: "Asha · Health" },
  { key: "paisa", name: "Nidhi · Money" },
  { key: "kar", name: "Lekh · Tax" },
  { key: "samay", name: "Smriti · Tasks" },
  { key: "setu", name: "Adhrit · Complaints" },
  { key: "krishi", name: "Bhupati · Farming" },
  { key: "raahat", name: "Narayan · Disaster" },
  { key: "disha", name: "Disha · Careers" },
];
const NAME = Object.fromEntries(AGENTS.map((a) => [a.key, a.name.split(" · ")[0]]));

const mainKeyboard = () => ({
  inline_keyboard: [
    ...SUGGESTIONS.map((s) => [{ text: s, callback_data: `q:${s}` }]),
    [{ text: "🤖 Browse all agents", callback_data: "menu" }],
  ],
});
const agentsKeyboard = () => {
  const rows = [];
  for (let i = 0; i < AGENTS.length; i += 2) rows.push(AGENTS.slice(i, i + 2).map((a) => ({ text: a.name, callback_data: `a:${a.key}` })));
  rows.push([{ text: "⬅️ Back", callback_data: "start" }]);
  return { inline_keyboard: rows };
};

async function tg(method, body) {
  if (!TOKEN) return;
  try {
    await fetch(API(method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (err) {
    console.error(`[telegram] ${method}`, err?.message || err);
  }
}
const send = (chat_id, text, extra = {}) => tg("sendMessage", { chat_id, text, disable_web_page_preview: true, ...extra });

const WELCOME =
  "🙏 Namaste! I'm Saarthi — your all-in-one AI helper for everyday India.\n\nTell me what you're facing and I'll connect you to the right AI expert. Tap a quick start below, browse all agents, or just type your problem.";

async function runAssist(chatId, text, agentHint) {
  const language = isHindi(text) ? "Hindi" : "English";
  let data;
  if (!hasKey) {
    data = { ...mocks.assist };
  } else {
    try {
      data = await generateJSON({
        system: features.assist.system(language),
        parts: features.assist.parts({ problem: text, agentHint }),
        schema: features.assist.schema,
      });
    } catch (err) {
      console.error("[telegram] assist", err?.message || err);
      data = { ...mocks.assist };
    }
  }
  const name = data.agentName || NAME[data.agent] || "Saarthi";
  let reply = `${data.reply}\n\n— ${name}`;
  if (APP_URL && data.agent) {
    reply += `\n\nOpen ${name} in the app: ${APP_URL}/?agent=${encodeURIComponent(data.agent)}&q=${encodeURIComponent(text)}`;
  }
  await send(chatId, reply, { reply_markup: mainKeyboard() });
}

/**
 * Telegram webhook. Handles /start (with quick buttons + agent menu), inline
 * button taps, "talk to a specific agent" (via reply), and free-text problems —
 * all powered by the same Gemini agents.
 */
export async function handleTelegram(req, res) {
  try {
    if (!TOKEN) { console.error("[telegram] TELEGRAM_BOT_TOKEN not set"); return; }

    // ---- inline button taps ----
    const cq = req.body?.callback_query;
    if (cq) {
      const chatId = cq.message?.chat?.id;
      const data = cq.data || "";
      await tg("answerCallbackQuery", { callback_query_id: cq.id });
      if (!chatId) return;

      if (data === "start") {
        await send(chatId, WELCOME, { reply_markup: mainKeyboard() });
      } else if (data === "menu") {
        await send(chatId, "Pick an expert to talk to:", { reply_markup: agentsKeyboard() });
      } else if (data.startsWith("q:")) {
        await runAssist(chatId, data.slice(2));
      } else if (data.startsWith("a:")) {
        const key = data.slice(2);
        const name = NAME[key] || "Saarthi";
        await send(chatId, `💬 You're talking to ${name}.\nReply to this message with your problem and ${name} will help.\n#${key}`, {
          reply_markup: { force_reply: true, input_field_placeholder: `Message ${name}…` },
        });
      }
      return;
    }

    // ---- normal messages ----
    const msg = req.body?.message || req.body?.edited_message;
    const chatId = msg?.chat?.id;
    const text = (msg?.text || "").trim();
    if (!chatId) return;

    if (text === "/start" || text === "/help") {
      await send(chatId, WELCOME, { reply_markup: mainKeyboard() });
      return;
    }
    if (text === "/agents") {
      await send(chatId, "Pick an expert to talk to:", { reply_markup: agentsKeyboard() });
      return;
    }
    if (!text) {
      await send(chatId, "Please send your question as text and I'll help. 🙂");
      return;
    }

    // replying to a "talk to <agent>" prompt → force that agent
    const repliedTo = msg.reply_to_message?.text || "";
    const tag = repliedTo.match(/#([a-z]+)/);
    const agentHint = tag && NAME[tag[1]] ? NAME[tag[1]] : undefined;

    await runAssist(chatId, text, agentHint);
  } catch (err) {
    console.error("[telegram] handler", err?.message || err);
  } finally {
    if (!res.headersSent) res.json({ ok: true });
  }
}
