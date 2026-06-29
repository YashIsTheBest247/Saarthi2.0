import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { sendSMS } from "./sms.js";

// Per-chat emergency contact + a pending "shall I text?" alert.
// (In-memory: fine within a warm instance; a cold start clears it — re-set with /sos.)
const emergencyNum = new Map(); // chatId -> "+91…"
const pendingSos = new Map();   // chatId -> { num, message }
const SOS_RE = /\b(accident|emergency|injured|injury|bleeding|unconscious|collapse|trapped|fire|drowning|attack|assault|harass(?:ing|ed|ment)?|stalk(?:ing|er)?|following me|unsafe|molest|kidnap|abduct|suicide|fainted|heart attack|stroke|snake ?bite|electrocut|gas leak|landslide|flood|save me|help me)\b|दुर्घटना|आपातकाल|घायल|बचाओ|आग लग|हादसा|पीछा कर|छेड़|असुरक्षित/i;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
// Strip any accidental /api/... path (people often paste the webhook URL here) so
// deep links open the app root, not the webhook.
const APP_URL = (process.env.APP_URL || "").replace(/\/api\/.*$/i, "").replace(/\/$/, "");
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
  { key: "raahat", name: "Nirbhaya · Women's Safety" },
  { key: "disha", name: "Disha · Careers" },
  { key: "study", name: "Acharya · Study" },
  { key: "pragyan", name: "Pragyan · Edu Videos" },
  { key: "udyam", name: "Udyam · Business/MSME" },
  { key: "khanan", name: "Khanan · Mining (Dhanbad)" },
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
  if (!TOKEN) return null;
  try {
    const res = await fetch(API(method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch (err) {
    console.error(`[telegram] ${method}`, err?.message || err);
    return null;
  }
}
const send = (chat_id, text, extra = {}) => tg("sendMessage", { chat_id, text, disable_web_page_preview: true, ...extra });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WELCOME =
  "🙏 Namaste! I'm Saarthi — your all-in-one AI helper for everyday India.\n\nTell me what you're facing and I'll connect you to the right AI expert. Tap a quick start below, browse all agents, or just type your problem.";

async function runAssist(chatId, text, agentHint) {
  const language = isHindi(text) ? "Hindi" : "English";

  // show "typing…" + a Thinking placeholder we'll edit into the answer
  tg("sendChatAction", { chat_id: chatId, action: "typing" });
  const thinking = await tg("sendMessage", { chat_id: chatId, text: "💭 Thinking…" });
  const mid = thinking?.result?.message_id;

  let data;
  if (!hasKey) {
    data = { ...mocks.assist, _mock: true };
  } else {
    try {
      data = await generateJSON({
        system: features.assist.system(language),
        parts: features.assist.parts({ problem: text, agentHint }),
        schema: features.assist.schema,
      });
    } catch (err) {
      console.error("[telegram] assist", err?.message || err);
      data = { ...mocks.assist, _mock: true };
    }
  }

  const agent = agentHint || data.agent;
  const name = data.agentName || NAME[agent] || "Saarthi";
  // never show the generic scam-mock text for an unrelated question
  const body = data._mock
    ? `I can help with this as ${name}. The AI service is busy right now — tap "Open in the app" below for the full step-by-step answer. 👇`
    : data.reply;
  let reply = `${body}\n\n— ${name}`;
  if (APP_URL && agent) reply += `\n\nOpen ${name} in the app: ${APP_URL}/?agent=${encodeURIComponent(agent)}&q=${encodeURIComponent(text)}`;

  if (mid) await tg("editMessageText", { chat_id: chatId, message_id: mid, text: reply, disable_web_page_preview: true, reply_markup: mainKeyboard() });
  else await send(chatId, reply, { reply_markup: mainKeyboard() });

  // Emergency: offer to text the user's saved contact (ask once).
  if (SOS_RE.test(text)) {
    const num = emergencyNum.get(String(chatId));
    if (num) {
      pendingSos.set(String(chatId), { num, message: `EMERGENCY (via Saarthi): "${text.slice(0, 280)}". Please reach me now — or call 112.` });
      await send(chatId, `⚠️ This sounds urgent. Shall I text your emergency contact (${num}) now?`, {
        reply_markup: { inline_keyboard: [[{ text: "✅ Yes, text them", callback_data: "sos:yes" }, { text: "No", callback_data: "sos:no" }]] },
      });
    } else {
      await send(chatId, "⚠️ This sounds urgent. Tip: save an emergency contact with  /sos +91XXXXXXXXXX  and I'll offer to text them in emergencies. If you're in danger, call 112 now.");
    }
  }
}

// Pragyan: produce a news reel, showing each production step, then return the
// in-app reel link (auto-plays). (YouTube auto-upload needs a worker — not on Vercel.)
async function runPragyan(chatId, title) {
  const language = isHindi(title) ? "Hindi" : "English";
  tg("sendChatAction", { chat_id: chatId, action: "record_video" });
  const m = await tg("sendMessage", { chat_id: chatId, text: "🎬 Pragyan is on it…\n\n💭 Thinking up the script…" });
  const mid = m?.result?.message_id;
  const edit = (text) => (mid ? tg("editMessageText", { chat_id: chatId, message_id: mid, text, disable_web_page_preview: true }) : send(chatId, text));

  let data;
  if (!hasKey) data = { ...mocks.pragyan, _mock: true };
  else {
    try { data = await generateJSON({ system: features.pragyan.system(language), parts: features.pragyan.parts({ title, mode: "video" }), schema: features.pragyan.schema }); }
    catch (err) { console.error("[telegram] pragyan", err?.message || err); data = { ...mocks.pragyan, _mock: true }; }
  }

  await edit("🎬 Pragyan\n✅ Script ready\n🖼️ Picking images…"); await wait(800);
  await edit("🎬 Pragyan\n✅ Script\n✅ Images\n📝 Writing subtitles…"); await wait(800);
  await edit("🎬 Pragyan\n✅ Script\n✅ Images\n✅ Subtitles\n⚙️ Compiling & assembling the reel…"); await wait(900);

  const link = APP_URL ? `${APP_URL}/?agent=pragyan&q=${encodeURIComponent(title)}` : "";
  const tags = (data.hashtags || []).join(" ");
  const final =
    `🎬 ${data.title}\n\n${data.hook}\n\n` +
    `✅ Script · ✅ Images · ✅ Subtitles · ✅ Assembled\n\n` +
    (tags ? tags + "\n\n" : "") +
    (link ? `▶️ Watch & play your reel:\n${link}` : "Open the Saarthi app to watch your reel.") +
    (data._mock ? "\n\n(sample script — add a Gemini key for a fully custom reel)" : "");
  await edit(final);
  await send(chatId, "Make another?", { reply_markup: mainKeyboard() });
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

      if (data === "sos:yes") {
        const p = pendingSos.get(String(chatId));
        if (!p) { await send(chatId, "No pending alert to send."); return; }
        pendingSos.delete(String(chatId));
        await send(chatId, `📨 Texting ${p.num}…`);
        const r = await sendSMS({ to: p.num, message: p.message });
        await send(chatId, r.ok ? `✅ SMS sent to ${p.num} via ${r.provider}. Stay safe.` : `❌ Couldn't send the SMS (${r.error}). Please call ${p.num} directly, or dial 112.`);
      } else if (data === "sos:no") {
        pendingSos.delete(String(chatId));
        await send(chatId, "Okay — I won't text anyone. If you're in danger, call 112.");
      } else if (data === "start") {
        await send(chatId, WELCOME, { reply_markup: mainKeyboard() });
      } else if (data === "menu") {
        await send(chatId, "Pick an expert to talk to:", { reply_markup: agentsKeyboard() });
      } else if (data.startsWith("q:")) {
        await runAssist(chatId, data.slice(2));
      } else if (data.startsWith("a:")) {
        const key = data.slice(2);
        const name = NAME[key] || "Saarthi";
        const prompt = key === "pragyan"
          ? `🎬 You're talking to Pragyan.\nReply with any topic to explain (or a trending story) and I'll produce a short educational video/podcast — showing each step.\n#pragyan`
          : `💬 You're talking to ${name}.\nReply to this message with your problem and ${name} will help.\n#${key}`;
        await send(chatId, prompt, { reply_markup: { force_reply: true, input_field_placeholder: key === "pragyan" ? "Topic to explain…" : `Message ${name}…` } });
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
    // set / view / clear the emergency contact that the bot can SMS
    if (text === "/sos" || text.startsWith("/sos ")) {
      const arg = text.slice(4).trim();
      if (arg.toLowerCase() === "clear") {
        emergencyNum.delete(String(chatId));
        await send(chatId, "🆗 Emergency contact removed.");
      } else if (arg.replace(/\D/g, "").length >= 10) {
        const num = arg.replace(/[^\d+]/g, "");
        emergencyNum.set(String(chatId), num);
        await send(chatId, `✅ Emergency contact saved: ${num}\nIn an emergency I'll ask before texting them. Change it with /sos +91… or remove with /sos clear.`);
      } else {
        const cur = emergencyNum.get(String(chatId));
        await send(chatId, `🆘 Emergency contact${cur ? `: ${cur}` : " is not set"}.\nSet it with:  /sos +91XXXXXXXXXX\nThen, in any emergency, I'll offer to text them for you.`);
      }
      return;
    }
    if (!text) {
      await send(chatId, "Please send your question as text and I'll help. 🙂");
      return;
    }

    // replying to a "talk to <agent>" prompt → force that agent
    const repliedTo = msg.reply_to_message?.text || "";
    const tag = repliedTo.match(/#([a-z]+)/);
    const agentHint = tag && NAME[tag[1]] ? tag[1] : undefined; // pass the agent KEY to the model

    if (agentHint === "pragyan") await runPragyan(chatId, text);
    else await runAssist(chatId, text, agentHint);
  } catch (err) {
    console.error("[telegram] handler", err?.message || err);
  } finally {
    if (!res.headersSent) res.json({ ok: true });
  }
}
