import { generateJSON, hasKey } from "./gemini.js";
import { features } from "./prompts.js";
import { mocks } from "./mocks.js";
import { sendSMS } from "./sms.js";
import { employeeList, runEmployee } from "./employees.js";
import { buildDoc, slug } from "./docgen.js";

// Per-chat emergency contact + a pending "shall I text?" alert.
// (In-memory: fine within a warm instance; a cold start clears it — re-set with /sos.)
const emergencyNum = new Map(); // chatId -> "+91…"
const pendingSos = new Map();   // chatId -> { num, situation }
const lastLoc = new Map();      // chatId -> { lat, lng, ts }
const pendingWf = new Map();    // chatId -> { empId, task, ts } — employee awaiting more input
const recentLoc = (id) => { const l = lastLoc.get(id); return l && Date.now() - l.ts < 15 * 60 * 1000 ? l : null; };
const SOS_RE = /\b(accident|emergency|injured|injury|bleeding|unconscious|collapse|trapped|fire|drowning|attack|assault|harass(?:ing|ed|ment)?|stalk(?:ing|er)?|following me|unsafe|molest|kidnap|abduct|suicide|fainted|heart attack|stroke|snake ?bite|electrocut|gas leak|landslide|flood|save me|help me)\b|दुर्घटना|आपातकाल|घायल|बचाओ|आग लग|हादसा|पीछा कर|छेड़|असुरक्षित/i;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
// Strip any accidental /api/... path (people often paste the webhook URL here) so
// deep links open the app root, not the webhook.
const APP_URL = (process.env.APP_URL || "").replace(/\/api\/.*$/i, "").replace(/\/$/, "");
const API = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

const isHindi = (s) => /[ऀ-ॿ]/.test(s || "");

const SUGGESTIONS = ["Which govt scheme can I claim?", "Explain this bill / notice", "How do I register on Udyam?"];
// The consumer specialists (kept in the app).
const AGENTS = [
  { key: "haq", name: "Haq · Schemes" },
  { key: "setu", name: "Adhrit · Complaints" },
  { key: "samajh", name: "Vidya · Documents" },
  { key: "sehat", name: "Asha · Health" },
  { key: "samay", name: "Smriti · Tasks" },
  { key: "udyam", name: "Udyam · Business/MSME" },
  { key: "khanan", name: "Khanan · Mining" },
  { key: "pragyan", name: "Pragyan · Edu Videos" },
];
const NAME = Object.fromEntries(AGENTS.map((a) => [a.key, a.name.split(" · ")[0]]));

// The hireable AI Workforce (B2B employees) — the MSME product.
const EMPLOYEES = employeeList();
const EMP = Object.fromEntries(EMPLOYEES.map((e) => [e.id, e]));

// What each employee needs from the user, so the bot can ask for the input fields up front.
const INPUT_HINTS = {
  finance: "what your business makes/sells, team size, and how much funding you need & for what",
  receivables: "the buyer's name, the invoice amount, its date, and how many days it's overdue",
  accounts: "the item(s), quantity, rate, GST %, and the buyer's GSTIN & state",
  enviro: "your industry/process, your state, and what you need (consent · EPR · ZLD · BRSR)",
  food: "your product, turnover band, and whether you sell in one state or many",
  build: "the project type, scope/area, and the state (for RERA · BOQ · BOCW cess)",
  electronics: "the product, and what you need (BIS-CRS · E-waste EPR · DPDP · WPC/ETA · PLI)",
  mobility: "the vehicle/part type, and what you need (ARAI/AIS · FAME-II · PLI · GeM · BIS)",
};

// Decide if the task is too thin for the employee to do a good job → ask for details first.
function needsMoreInfo(empId, text) {
  const t = (text || "").trim();
  if (t.length < 22) return true;                                        // too short to be a real task
  if ((empId === "accounts" || empId === "receivables") && !/\d/.test(t)) return true; // needs numbers (amounts/rates)
  return false;
}

const mainKeyboard = () => ({
  inline_keyboard: [
    ...SUGGESTIONS.map((s) => [{ text: s, callback_data: `q:${s}` }]),
    [{ text: "👥 Browse agents", callback_data: "menu" }, { text: "🏢 Hire an AI employee", callback_data: "wf" }],
  ],
});
const agentsKeyboard = () => {
  const rows = [];
  for (let i = 0; i < AGENTS.length; i += 2) rows.push(AGENTS.slice(i, i + 2).map((a) => ({ text: a.name, callback_data: `a:${a.key}` })));
  rows.push([{ text: "🏢 AI Workforce", callback_data: "wf" }], [{ text: "⬅️ Back", callback_data: "start" }]);
  return { inline_keyboard: rows };
};
const wfKeyboard = () => {
  const rows = [];
  for (let i = 0; i < EMPLOYEES.length; i += 2) rows.push(EMPLOYEES.slice(i, i + 2).map((e) => ({ text: `${e.name} · ${e.short}`, callback_data: `w:${e.id}` })));
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

// Upload a generated file (PDF / XML / JSON) to the chat as a downloadable document.
async function tgDocument(chatId, buffer, filename, mime, caption) {
  if (!TOKEN) return null;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", caption.slice(0, 1000));
    form.append("document", new Blob([buffer], { type: mime || "application/octet-stream" }), filename);
    const res = await fetch(API("sendDocument"), { method: "POST", body: form });
    return await res.json();
  } catch (err) { console.error("[telegram] sendDocument", err?.message || err); return null; }
}

// Rotate an "engagement" status through stages while a slow task runs, editing one
// message so the user sees progress (thinking → working → compiling → …). Returns a
// stop() to call when done.
function startProgress(chatId, messageId, stages) {
  let i = 0;
  tg("sendChatAction", { chat_id: chatId, action: "typing" });
  const timer = setInterval(() => {
    i = Math.min(i + 1, stages.length - 1);
    tg("editMessageText", { chat_id: chatId, message_id: messageId, text: stages[i] });
    tg("sendChatAction", { chat_id: chatId, action: "typing" });
  }, 3200);
  return () => clearInterval(timer);
}

const WELCOME =
  "🙏 Namaste! I'm Saarthi — AI for everyday India and its MSMEs.\n\n• Ask anything and I'll route you to the right specialist.\n• Or 🏢 hire an autonomous AI employee — Finance & Schemes, GST & Accounts, MSME Samadhaan (delayed payments), FSSAI, Environment, Construction, Electronics, Auto/EV — to do a real job.\n\nTap a quick start, browse agents, or just type your problem.";

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
  if (APP_URL && agent && NAME[agent]) reply += `\n\nOpen ${name} in the app: ${APP_URL}/?agent=${encodeURIComponent(agent)}&q=${encodeURIComponent(text)}`;

  if (mid) await tg("editMessageText", { chat_id: chatId, message_id: mid, text: reply, disable_web_page_preview: true, reply_markup: mainKeyboard() });
  else await send(chatId, reply, { reply_markup: mainKeyboard() });

  // 📄 send the answer as a downloadable PDF report (every agent, for any substantive reply)
  if (!data._mock && data.reply && String(data.reply).trim().length > 160) {
    try {
      tg("sendChatAction", { chat_id: chatId, action: "upload_document" });
      const hin = language === "Hindi";
      const title = `${name} — ${hin ? "सारथी रिपोर्ट" : "Saarthi report"}`;
      const src = `${text ? (hin ? "आपका सवाल: " : "Your question: ") + text + "\n\n" : ""}${data.reply}`;
      const paragraphs = String(src).split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
      const content = { title, kind: "document", sections: [{ heading: "", paragraphs: paragraphs.length ? paragraphs : [src] }], slides: [], wordCount: String(data.reply).split(/\s+/).length };
      const buf = await buildDoc("pdf", content, { font: "Times New Roman", size: 12 });
      await tgDocument(chatId, Buffer.from(buf), `${slug(title)}.pdf`, "application/pdf", `📄 ${title}`);
    } catch (err) { console.error("[telegram] assist pdf", err?.message || err); }
  }

  // Emergency: offer to text the user's saved contact (ask once).
  if (SOS_RE.test(text)) {
    const num = emergencyNum.get(String(chatId));
    if (num) {
      pendingSos.set(String(chatId), { num, situation: text.slice(0, 280) });
      await send(chatId, `⚠️ This sounds urgent. Shall I text your emergency contact (${num}) now?`, {
        reply_markup: { inline_keyboard: [[{ text: "✅ Yes, text them", callback_data: "sos:yes" }, { text: "No", callback_data: "sos:no" }]] },
      });
      if (!recentLoc(String(chatId)))
        await send(chatId, "📍 Optional: tap below to share your live location and I'll include it in the alert.", {
          reply_markup: { keyboard: [[{ text: "📍 Share my location", request_location: true }]], resize_keyboard: true, one_time_keyboard: true },
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

  // 📄 the reel script as a PDF + 📝 subtitles as an .srt file
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  if (!data._mock && scenes.length) {
    try {
      tg("sendChatAction", { chat_id: chatId, action: "upload_document" });
      const scriptText =
        `${data.hook || ""}\n\n` +
        scenes.map((s, i) => `${i + 1}. ${s.narration}${s.caption ? `\n[${s.caption}]` : ""}`).join("\n\n") +
        (data.description ? `\n\n${data.description}` : "") + (tags ? `\n\n${tags}` : "");
      const paragraphs = scriptText.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
      const content = { title: data.title || "Pragyan reel", kind: "document", sections: [{ heading: "", paragraphs }], slides: [], wordCount: scriptText.split(/\s+/).length };
      const buf = await buildDoc("pdf", content, { font: "Times New Roman", size: 12 });
      await tgDocument(chatId, Buffer.from(buf), `${slug(data.title || "reel")}-script.pdf`, "application/pdf", `📄 ${data.title || "Reel"} — script`);

      // subtitles (.srt)
      const pad = (n) => String(n).padStart(2, "0");
      const tc = (s) => `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))},000`;
      let acc = 0;
      const srt = scenes.map((s, i) => { const a = acc, b = acc + (s.seconds || 5); acc = b; return `${i + 1}\n${tc(a)} --> ${tc(b)}\n${s.narration}\n`; }).join("\n");
      await tgDocument(chatId, Buffer.from(srt, "utf8"), `${slug(data.title || "reel")}.srt`, "application/x-subrip", "📝 Subtitles (.srt)");
    } catch (err) { console.error("[telegram] pragyan docs", err?.message || err); }
  }

  await send(chatId, "Make another?", { reply_markup: mainKeyboard() });
}

// AI Workforce: assign a task to a hireable AI employee and hand back the finished
// deliverable. Runs the same persona-scoped autonomous loop as the app/API.
async function runEmployeeTask(chatId, empId, text, image) {
  const e = EMP[empId];
  if (!e) return runAssist(chatId, text);
  const hin = isHindi(text);
  const language = hin ? "Hindi" : "English";
  const m = await tg("sendMessage", { chat_id: chatId, text: `🏢 ${e.name} (${e.short}) ${hin ? "काम शुरू कर रहे हैं…" : "is getting started…"}` });
  const mid = m?.result?.message_id;

  // live engagement while the autonomous loop runs
  const stages = hin
    ? [`🏢 ${e.name} योजना बना रहे हैं…`, "⚙️ चरण-दर-चरण काम कर रहे हैं…", "📊 जानकारी संकलित कर रहे हैं…", "✍️ आपका दस्तावेज़ तैयार कर रहे हैं…", "📄 अंतिम रूप दे रहे हैं…"]
    : [`🏢 ${e.name} is planning the work…`, "⚙️ Working through the steps…", "📊 Compiling the details…", "✍️ Drafting your deliverable…", "📄 Finalising the output…"];
  const stop = mid ? startProgress(chatId, mid, stages) : () => {};

  let out;
  try { out = await runEmployee(empId, text, { today: new Date().toDateString(), language, image }); }
  catch (err) { console.error("[telegram] employee", err?.message || err); }
  stop();

  const r = out?.result;
  const mock = !hasKey || r?._mock;
  const deliverable = r?.deliverable ? String(r.deliverable).slice(0, 3500) : "";
  const link = APP_URL ? `${APP_URL}/?hire=${encodeURIComponent(empId)}` : "";
  const reply = mock
    ? `🏢 ${e.name} · ${e.short}\n\n${hin ? "मैं यह पूरा काम कर सकता हूँ — पर अभी AI सेवा व्यस्त है। पूरा चलाने के लिए ऐप खोलें 👇" : "I can do this end-to-end — but the AI service is busy right now. Open the app to run me in full 👇"}${link ? `\n${link}` : ""}`
    : `🏢 ${e.name} · ${e.short}\n\n${r?.headline || "Done."}\n\n${deliverable}${link ? `\n\n▶️ ${hin ? "ऐप में खोलें (डाउनलोड, कैलेंडर, इंटीग्रेट)" : "Open in the app (downloads, calendar, integrate)"}: ${link}` : ""}`;

  if (mid) await tg("editMessageText", { chat_id: chatId, message_id: mid, text: reply, disable_web_page_preview: true, reply_markup: mainKeyboard() });
  else await send(chatId, reply, { reply_markup: mainKeyboard() });

  if (mock || !r?.deliverable) return;

  // 📄 the finished deliverable as a downloadable PDF report
  try {
    tg("sendChatAction", { chat_id: chatId, action: "upload_document" });
    const title = r.headline || `${e.name} — ${e.short}`;
    const paragraphs = String(r.deliverable).split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
    const content = { title, kind: "document", sections: [{ heading: "", paragraphs: paragraphs.length ? paragraphs : [String(r.deliverable)] }], slides: [], wordCount: String(r.deliverable).split(/\s+/).length };
    const buf = await buildDoc("pdf", content, { font: "Times New Roman", size: 12 });
    await tgDocument(chatId, Buffer.from(buf), `${slug(title)}.pdf`, "application/pdf", `📄 ${title}`);
  } catch (err) { console.error("[telegram] report pdf", err?.message || err); }

  // 📎 integration artefacts (Tally XML, e-way JSON) as files, where produced
  for (const a of (out?.artifacts || [])) {
    try { await tgDocument(chatId, Buffer.from(String(a.content), "utf8"), a.filename || `${a.type}.txt`, a.mime || "text/plain", `📎 ${a.label || a.type}`); }
    catch (err) { console.error("[telegram] artefact", err?.message || err); }
  }
}

// Download a Telegram photo/document to a Gemini inlineData part (base64).
async function tgFileB64(fileId) {
  try {
    const f = await tg("getFile", { file_id: fileId });
    const fp = f?.result?.file_path;
    if (!fp || !TOKEN) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${fp}`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = /\.pdf$/i.test(fp) ? "application/pdf" : /\.png$/i.test(fp) ? "image/png" : /\.webp$/i.test(fp) ? "image/webp" : "image/jpeg";
    return { mimeType, data: buf.toString("base64") };
  } catch (err) { console.error("[telegram] getFile", err?.message || err); return null; }
}

// A photo / PDF sent to the bot → let Vidya (document decoder) read & explain it.
async function runDocument(chatId, caption, image) {
  const language = isHindi(caption) ? "Hindi" : "English";
  tg("sendChatAction", { chat_id: chatId, action: "typing" });
  const thinking = await tg("sendMessage", { chat_id: chatId, text: "📄 Vidya is reading your document…" });
  const mid = thinking?.result?.message_id;
  let data;
  if (!hasKey || !image) data = { ...mocks.samajh, _mock: true };
  else {
    try { data = await generateJSON({ system: features.samajh.system(language), parts: features.samajh.parts({ text: caption, image }), schema: features.samajh.schema }); }
    catch (err) { console.error("[telegram] samajh", err?.message || err); data = { ...mocks.samajh, _mock: true }; }
  }
  const watch = (data.watchOuts || []).length ? `\n\n⚠️ Watch-outs:\n• ${(data.watchOuts || []).join("\n• ")}` : "";
  const link = APP_URL ? `\n\nOpen Vidya in the app: ${APP_URL}/?agent=samajh` : "";
  const reply = data._mock
    ? `📄 I can read documents — the AI service is busy right now, open the app to decode it in full.${link}`
    : `📄 ${data.title || "Document"}\n\n${data.summary || ""}${watch}\n\n— Vidya${link}`;
  if (mid) await tg("editMessageText", { chat_id: chatId, message_id: mid, text: reply, disable_web_page_preview: true, reply_markup: mainKeyboard() });
  else await send(chatId, reply, { reply_markup: mainKeyboard() });
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
        const loc = recentLoc(String(chatId));
        const message = `EMERGENCY (via Saarthi): "${p.situation}". ${loc ? `My location: https://maps.google.com/?q=${loc.lat},${loc.lng}. ` : ""}Please reach me now — or call 112.`;
        await send(chatId, `📨 Texting ${p.num}…`, { reply_markup: { remove_keyboard: true } });
        const r = await sendSMS({ to: p.num, message });
        await send(chatId, r.ok ? `✅ SMS sent to ${p.num} via ${r.provider}${loc ? " — with your location" : ""}. Stay safe.` : `❌ Couldn't send the SMS (${r.error}). Please call ${p.num} directly, or dial 112.`);
      } else if (data === "sos:no") {
        pendingSos.delete(String(chatId));
        await send(chatId, "Okay — I won't text anyone. If you're in danger, call 112.");
      } else if (data === "start") {
        await send(chatId, WELCOME, { reply_markup: mainKeyboard() });
      } else if (data === "menu") {
        await send(chatId, "Pick an expert to talk to:", { reply_markup: agentsKeyboard() });
      } else if (data === "wf") {
        await send(chatId, "🏢 Hire an AI employee — pick one, then reply with your task and it hands back finished work:", { reply_markup: wfKeyboard() });
      } else if (data.startsWith("q:")) {
        await runAssist(chatId, data.slice(2));
      } else if (data.startsWith("a:")) {
        const key = data.slice(2);
        const name = NAME[key] || "Saarthi";
        const prompt = key === "pragyan"
          ? `🎬 You're talking to Pragyan.\nReply with any topic to explain (or a trending story) and I'll produce a short educational video/podcast — showing each step.\n#pragyan`
          : `💬 You're talking to ${name}.\nReply to this message with your problem and ${name} will help.\n#${key}`;
        await send(chatId, prompt, { reply_markup: { force_reply: true, input_field_placeholder: key === "pragyan" ? "Topic to explain…" : `Message ${name}…` } });
      } else if (data.startsWith("w:")) {
        const id = data.slice(2);
        const e = EMP[id];
        if (e) {
          const hint = INPUT_HINTS[id];
          const prompt = `🏢 You've hired ${e.name} — ${e.short}.\n\nReply to this message with your task${hint ? `, and please include: ${hint}` : ""}.\n\n💡 e.g. "${(e.samples && e.samples[0]) || "what you need"}"\n\nI'll plan it, do the work, and send back the finished deliverable — as text, a PDF report, and any integration files.\n#w_${id}`;
          await send(chatId, prompt, { reply_markup: { force_reply: true, input_field_placeholder: `Assign a task to ${e.name}…` } });
        }
      }
      return;
    }

    // ---- normal messages ----
    const msg = req.body?.message || req.body?.edited_message;
    const chatId = msg?.chat?.id;
    if (!chatId) return;

    // user shared their live location (for an emergency alert)
    if (msg.location) {
      lastLoc.set(String(chatId), { lat: msg.location.latitude, lng: msg.location.longitude, ts: Date.now() });
      const p = pendingSos.get(String(chatId));
      await send(chatId, p
        ? `📍 Got your location. Tap "✅ Yes, text them" above to alert ${p.num} with it.`
        : "📍 Location saved — I'll include it if you send an emergency alert.", { reply_markup: { remove_keyboard: true } });
      return;
    }

    // user sent a photo or PDF → read it (route to a hired employee if replying to one, else Vidya)
    const photo = Array.isArray(msg.photo) ? msg.photo[msg.photo.length - 1] : null;
    const document = msg.document && /^(image\/|application\/pdf)/i.test(msg.document.mime_type || "") ? msg.document : null;
    if (photo || document) {
      const image = await tgFileB64((photo || document).file_id);
      const caption = (msg.caption || "").trim();
      const wfTag = (msg.reply_to_message?.text || "").match(/#w_([a-z]+)/);
      if (wfTag && EMP[wfTag[1]]) await runEmployeeTask(chatId, wfTag[1], caption || "Please review the attached document and act on it.", image);
      else await runDocument(chatId, caption, image);
      return;
    }

    const text = (msg?.text || "").trim();

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

    const repliedTo = msg.reply_to_message?.text || "";
    const wfTag = repliedTo.match(/#w_([a-z]+)/);

    // wizard: if this employee was waiting for the details we asked for, this message IS the details
    const pend = pendingWf.get(String(chatId));
    if (pend && Date.now() - pend.ts < 10 * 60 * 1000 && !wfTag && !text.startsWith("/")) {
      pendingWf.delete(String(chatId));
      await runEmployeeTask(chatId, pend.empId, `${pend.task}\n${text}`.trim());
      return;
    }

    // replying to a "hire <employee>" prompt → run (or ask for the required inputs first)
    if (wfTag && EMP[wfTag[1]]) {
      const empId = wfTag[1];
      if (needsMoreInfo(empId, text)) {
        pendingWf.set(String(chatId), { empId, task: text, ts: Date.now() });
        const hin = isHindi(text);
        const hint = INPUT_HINTS[empId] || (hin ? "ज़रूरी विवरण" : "the key details");
        await send(chatId, `${EMP[empId].name} ${hin ? "को यह बेहतर करने के लिए थोड़ी और जानकारी चाहिए।" : "needs a little more to do this well."}\n\n${hin ? "कृपया बताएँ" : "Please share"}: ${hint}.`,
          { reply_markup: { force_reply: true, input_field_placeholder: hin ? "विवरण जोड़ें…" : "Add the details…" } });
        return;
      }
      await runEmployeeTask(chatId, empId, text);
      return;
    }

    // replying to a "talk to <agent>" prompt → force that agent
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
