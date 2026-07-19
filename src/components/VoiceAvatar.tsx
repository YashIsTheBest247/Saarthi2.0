import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Loader2, Volume2, Radio, Hand, SlidersHorizontal } from "lucide-react";
import { useApp } from "../app/AppContext";
import { callFeature } from "../lib/api";
import { clean } from "../lib/text";
import { TalkingAvatar } from "./TalkingAvatar";
import { avatarState } from "../lib/avatarState";

/* ─────────────────────────────────────────────────────────────────────────────
 * VoiceAvatar — a talk-to-me AI host. Tap the mic, speak, and the avatar answers
 * OUT LOUD with a live speaking animation and on-screen captions. Fully in-browser:
 *   speech-in  → Web Speech API (SpeechRecognition)
 *   brain      → /api/assist (your existing agent), kept short for a voice reply
 *   speech-out → Web Speech API (speechSynthesis) — the same engine Pragyan uses
 * No new keys, no cost. Falls back gracefully where the browser lacks speech APIs.
 * ────────────────────────────────────────────────────────────────────────────*/

// Minimal Web Speech API typings (absent from the default DOM lib).
interface SRAlternative { transcript: string }
interface SRResult { readonly length: number;0: SRAlternative; isFinal: boolean }
interface SRResultList { readonly length: number; [i: number]: SRResult }
interface SREvent { resultIndex: number; results: SRResultList }
interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onstart: (() => void) | null;
}
type SRClass = new () => SpeechRec;
const getSR = (): SRClass | null => {
  const w = window as unknown as { SpeechRecognition?: SRClass; webkitSpeechRecognition?: SRClass };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const FEMALE_RE = /female|woman|girl|aditi|heera|swara|kalpana|lekha|veena|raveena|samantha|victoria|zira|susan|fiona|tessa|neerja|asha|google\s*(uk|us)?\s*english\s*female/i;
const MALE_RE = /\bmale|\bman\b|ravi|hemant|rishi|prabhat|madhur|david|mark|alex|daniel|george|google\s*(uk|us)?\s*english\s*male|microsoft\s*(david|mark)/i;

// Selectable avatars (mouthTop = where the lips sit, % from top, for the lip-sync).
interface AvatarChoice { id: string; src: string; mouthTop: number }
const AVATARS: AvatarChoice[] = [
  { id: "a24", src: "/pix-24.jpg", mouthTop: 46.5 },
  { id: "a58", src: "/pix-58.jpg", mouthTop: 46.5 },
  { id: "a37", src: "/pix-37.jpg", mouthTop: 44.5 },
  { id: "a11", src: "/pix-11.jpg", mouthTop: 40 },
];

// Selectable voice profiles. voiceIndex selects a DIFFERENT actual system voice
// (so they truly sound different); pitch/rate add extra shaping on top.
interface VoiceChoice { id: string; label: string; hin: string; voiceIndex: number; pitch: number; rate: number }
const VOICE_PROFILES: VoiceChoice[] = [
  { id: "natural", label: "Natural", hin: "सामान्य", voiceIndex: 0, pitch: 1.0, rate: 1.0 },
  { id: "warm", label: "Warm", hin: "गर्मजोश", voiceIndex: 1, pitch: 1.08, rate: 0.97 },
  { id: "bright", label: "Bright", hin: "उत्साही", voiceIndex: 2, pitch: 1.22, rate: 1.05 },
  { id: "calm", label: "Calm", hin: "शांत", voiceIndex: 3, pitch: 0.94, rate: 0.92 },
];

type Status = "idle" | "listening" | "thinking" | "speaking";
interface Turn { role: "user" | "host"; text: string }

export function VoiceAvatar({ photo = "/host.jpg", name = "Saarthi", accent = "#C77B3B" }: { photo?: string; name?: string; accent?: string }) {
  const { lang } = useApp();
  const hi = lang.iso === "hi";
  const L = (en: string, hin: string) => (hi ? hin : en);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [userText, setUserText] = useState("");
  const [reply, setReply] = useState("");
  const [handsFree, setHandsFree] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  // user's chosen avatar + voice, remembered across sessions
  const [avatarId, setAvatarId] = useState(() => localStorage.getItem("saarthi.avatar") || AVATARS[0].id);
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem("saarthi.voice") || "warm");
  const [sysVoices, setSysVoices] = useState<SpeechSynthesisVoice[]>([]);
  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  const voiceProfile = VOICE_PROFILES.find((v) => v.id === voiceId) || VOICE_PROFILES[0];
  useEffect(() => { localStorage.setItem("saarthi.avatar", avatarId); }, [avatarId]);
  useEffect(() => { localStorage.setItem("saarthi.voice", voiceId); }, [voiceId]);

  const recRef = useRef<SpeechRec | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const statusRef = useRef<Status>("idle");
  const handsFreeRef = useRef(handsFree);
  const openRef = useRef(open);
  const speakActive = useRef(false); // synchronous flag — statusRef lags a render behind
  const primed = useRef(false);      // TTS unlocked within a user gesture yet?
  const voiceRef = useRef(voiceProfile);
  const sysVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  statusRef.current = status;
  handsFreeRef.current = handsFree;
  openRef.current = open;
  voiceRef.current = voiceProfile;
  sysVoicesRef.current = sysVoices;

  const speechLang = lang.speech || (hi ? "hi-IN" : "en-IN");

  // Browsers block speechSynthesis until it's first invoked inside a user gesture.
  // Call this on tap to unlock it with a silent utterance.
  const primeTTS = () => {
    if (primed.current || !("speechSynthesis" in window)) return;
    primed.current = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch { /* noop */ }
  };

  const stopAll = useCallback(() => {
    speakActive.current = false;
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    try { recRef.current?.abort(); } catch { /* noop */ }
    setStatus("idle");
  }, []);

  // opened from the chat panel's "Talk" button (single launcher)
  useEffect(() => {
    const h = () => { primeTTS(); setOpen(true); };
    window.addEventListener("saarthi:voice", h);
    return () => window.removeEventListener("saarthi:voice", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // warm up the browser's async voice list on open
  useEffect(() => {
    if (!open) return;
    if (!getSR() || !("speechSynthesis" in window)) setUnsupported(true);
    try { window.speechSynthesis?.getVoices?.(); } catch { /* noop */ }
    return () => stopAll();
  }, [open, stopAll]);

  // Load the distinct system voices (async on Chrome). Ranked so the current
  // language/locale leads and female voices come first, then deduped by name so
  // each profile can map to a genuinely different voice.
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis?.getVoices?.() || [];
      if (!all.length) return;
      const base = speechLang.split("-")[0];
      const tier = (v: SpeechSynthesisVoice) => (v.lang === speechLang ? 0 : v.lang?.startsWith(base) ? 1 : v.lang?.startsWith("en") ? 2 : 3);
      // the avatars are women — drop male voices entirely (keep all only if none remain)
      const nonMale = all.filter((v) => !MALE_RE.test(v.name));
      const pool = nonMale.length ? nonMale : all;
      const seen = new Set<string>();
      const distinct = [...pool]
        .sort((a, b) =>
          tier(a) - tier(b) ||
          (FEMALE_RE.test(b.name) ? 1 : 0) - (FEMALE_RE.test(a.name) ? 1 : 0))
        .filter((v) => !seen.has(v.name) && seen.add(v.name));
      setSysVoices(distinct);
    };
    load();
    try { window.speechSynthesis?.addEventListener?.("voiceschanged", load); } catch { /* noop */ }
    return () => { try { window.speechSynthesis?.removeEventListener?.("voiceschanged", load); } catch { /* noop */ } };
  }, [speechLang]);

  // map a profile to a real, distinct system voice (wrap to the last if fewer exist).
  // In a non-English language, keep to that language's voices so it pronounces
  // correctly; if none are installed, return undefined so u.lang guides the engine.
  const voiceForProfile = (vp: VoiceChoice): SpeechSynthesisVoice | undefined => {
    const sv = sysVoicesRef.current;
    const base = speechLang.split("-")[0];
    if (base !== "en") {
      const langVoices = sv.filter((v) => v.lang?.startsWith(base));
      if (!langVoices.length) return undefined;
      return langVoices[vp.voiceIndex] || langVoices[langVoices.length - 1] || langVoices[0];
    }
    return sv[vp.voiceIndex] || sv[sv.length - 1] || sv[0];
  };

  const speak = useCallback((text: string, onDone: () => void) => {
    if (!("speechSynthesis" in window) || !text.trim()) { onDone(); return; }
    setStatus("speaking");
    speakActive.current = true;
    try { window.speechSynthesis.cancel(); window.speechSynthesis.resume(); } catch { /* noop */ }
    // chunk on sentence boundaries so long replies start speaking sooner and don't get cut off
    const chunks = text.match(/[^.!?。]+[.!?。]?/g)?.map((s) => s.trim()).filter(Boolean) || [text];
    const vp = voiceRef.current;
    const voice = voiceForProfile(vp);
    let i = 0;
    const next = () => {
      if (!speakActive.current || i >= chunks.length) { if (i >= chunks.length) speakActive.current = false; onDone(); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = speechLang; if (voice) u.voice = voice;
      u.rate = vp.rate; u.pitch = vp.pitch;
      u.onboundary = () => { avatarState.level = 1; }; // spike the jaw on each word → speech-synced mouth
      u.onend = () => next();
      u.onerror = () => setTimeout(next, 300);
      try { window.speechSynthesis.speak(u); } catch { onDone(); }
    };
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechLang]);

  const ask = useCallback(async (q: string) => {
    setStatus("thinking");
    turnsRef.current = [...turnsRef.current, { role: "user", text: q }];
    const history = turnsRef.current.slice(-8).map((tn) => `${tn.role === "user" ? "User" : name}: ${tn.text}`).join("\n");
    const problem =
      `You are ${name}, a warm, friendly AI voice host for everyday India. This is a SPOKEN conversation, so reply in a natural, conversational tone in 2–4 short sentences (never more than ~60 words), no markdown, no lists, no emojis — just words that sound good read aloud. If the user needs a specialist (scams, schemes, health, tax, business, complaints, farming, careers), briefly say who can help and give the key point.\n\n` +
      `Conversation so far:\n${history}\n\nReply to the user's last message.`;
    try {
      const r = await callFeature<{ reply: string; agentName?: string }>("assist", { problem, language: lang.name });
      const answer = clean(r.reply || "").replace(/\s+/g, " ").trim() || L("Sorry, I didn't catch that. Could you say it again?", "माफ़ करें, मैं समझ नहीं पाई। कृपया दोबारा बोलें।");
      turnsRef.current = [...turnsRef.current, { role: "host", text: answer }];
      setReply(answer);
      speak(answer, () => { setStatus("idle"); if (handsFreeRef.current && openRef.current) setTimeout(() => listen(), 400); });
    } catch {
      const err = L("I'm having trouble reaching my brain right now. Please try again.", "अभी कनेक्ट करने में दिक्कत हो रही है। कृपया दोबारा प्रयास करें।");
      setReply(err);
      speak(err, () => setStatus("idle"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang.name, name, speak]);

  const listen = useCallback(() => {
    const SR = getSR();
    if (!SR) { setUnsupported(true); return; }
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = speechLang; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = "";
    rec.onstart = () => { setUserText(""); setStatus("listening"); };
    rec.onresult = (e: SREvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setUserText((finalText + interim).trim());
    };
    rec.onerror = () => { setStatus("idle"); };
    rec.onend = () => {
      const q = finalText.trim();
      if (q) ask(q);
      else if (statusRef.current === "listening") setStatus("idle");
    };
    try { rec.start(); } catch { setStatus("idle"); }
  }, [speechLang, ask]);

  // pick a voice and immediately play a short sample so the user hears it
  const selectVoice = (id: string) => {
    setVoiceId(id);
    const vp = VOICE_PROFILES.find((v) => v.id === id) || VOICE_PROFILES[0];
    primeTTS();
    if (!("speechSynthesis" in window)) return;
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    const u = new SpeechSynthesisUtterance(L("Hello, I'm Saarthi. How can I help you?", "नमस्ते, मैं सारथी हूँ। मैं आपकी कैसे मदद करूँ?"));
    u.lang = speechLang;
    const voice = voiceForProfile(vp); if (voice) u.voice = voice;
    u.rate = vp.rate; u.pitch = vp.pitch;
    try { window.speechSynthesis.speak(u); } catch { /* noop */ }
  };

  const onMic = () => {
    primeTTS(); // unlock speech within this user gesture
    if (status === "listening") { try { recRef.current?.stop(); } catch { /* noop */ } return; }
    if (status === "speaking" || status === "thinking") { stopAll(); return; } // barge-in
    listen();
  };

  const close = () => { stopAll(); setOpen(false); setHandsFree(false); };

  const ring = status === "listening" ? "#2E7D5B" : status === "speaking" ? accent : status === "thinking" ? "#6B7280" : accent;
  const statusLabel =
    status === "listening" ? L("Listening…", "सुन रही हूँ…")
      : status === "thinking" ? L("Thinking…", "सोच रही हूँ…")
        : status === "speaking" ? L("Speaking…", "बोल रही हूँ…")
          : L("Tap the mic and talk to me", "माइक दबाएँ और मुझसे बात करें");

  const Avatar = ({ size }: { size: number }) => (
    imgOk
      ? <img src={photo} alt={name} onError={() => setImgOk(false)} className="h-full w-full object-cover" style={{ width: size, height: size }} />
      : <div className="flex items-center justify-center font-bold text-white" style={{ width: size, height: size, background: `linear-gradient(135deg, ${accent}, #16140f)`, fontSize: size * 0.32 }}>{name.slice(0, 1)}</div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <div className="my-auto flex w-full max-w-md flex-col items-center gap-2.5 sm:w-auto sm:max-w-none sm:flex-row sm:items-center" onClick={(e) => e.stopPropagation()}>

              {/* left panel: avatar + voice picker, outside the main box */}
              <AnimatePresence>
                {showCustomize && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="w-full flex-none rounded-3xl border border-line bg-paper p-3.5 shadow-float sm:w-40 sm:self-center">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted deva">{L("Avatar", "अवतार")}</div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-2">
                      {AVATARS.map((a) => (
                        <button key={a.id} onClick={() => setAvatarId(a.id)}
                          className="relative aspect-square overflow-hidden rounded-xl border-2 transition"
                          style={{ borderColor: a.id === avatarId ? accent : "transparent" }}>
                          <img src={a.src} alt="" className="h-full w-full object-cover object-top" />
                        </button>
                      ))}
                    </div>
                    <div className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted deva">{L("Voice", "आवाज़")}</div>
                    <div className="flex flex-wrap gap-1.5 sm:flex-col">
                      {VOICE_PROFILES.map((v) => (
                        <button key={v.id} onClick={() => selectVoice(v.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${v.id === voiceId ? "border-transparent text-white" : "border-line bg-paper text-graphite hover:bg-mist"}`}
                          style={v.id === voiceId ? { background: accent } : undefined}>
                          {hi ? v.hin : v.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* main box */}
              <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 240, damping: 24 }}
                className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-paper p-4 shadow-float">
                <button onClick={close} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-mist text-graphite hover:bg-line" aria-label="Close"><X className="h-4 w-4" /></button>
                <button onClick={() => setShowCustomize((s) => !s)} className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-mist text-graphite hover:bg-line" aria-label={L("Customise", "बदलें")} title={L("Choose avatar & voice", "अवतार और आवाज़ चुनें")}>
                  <SlidersHorizontal className="h-4 w-4" />
                </button>

              {/* half-body 3D host — floating, no circle crop */}
              <div className="flex flex-col items-center">
                <div className="relative mx-auto h-56 w-48 sm:h-64 sm:w-56">
                  {/* soft, state-reactive glow behind her (no ring) */}
                  <motion.div className="absolute inset-x-4 bottom-6 top-2 rounded-[45%] blur-3xl"
                    animate={{ opacity: status === "speaking" || status === "listening" ? [0.28, 0.42, 0.28] : 0.14 }}
                    transition={{ repeat: Infinity, duration: 1.6 }} style={{ background: ring }} />
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    {imgOk
                      ? <TalkingAvatar src={avatar.src} speaking={status === "speaking"} mouthTop={avatar.mouthTop} className="h-full w-full" />
                      : <Avatar size={200} />}
                  </div>
                </div>

                <div className="-mt-1 text-lg font-bold text-ink deva">{name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium deva" style={{ color: ring }}>
                  {status === "listening" && <Radio className="h-3.5 w-3.5" />}
                  {status === "thinking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {status === "speaking" && <Volume2 className="h-3.5 w-3.5" />}
                  {statusLabel}
                </div>
              </div>

              {/* captions — scroll inside themselves so a long reply never pushes the controls */}
              <div className="mt-3 max-h-36 min-h-[2.25rem] space-y-2 overflow-y-auto">
                {userText && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-sm text-white deva">{userText}</div>}
                {reply && status !== "listening" && <div className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-mist/60 px-3 py-2 text-sm text-graphite deva">{reply}</div>}
                {!userText && !reply && <p className="pt-2 text-center text-sm text-muted deva">{L("Ask me anything — schemes, scams, taxes, health, your business…", "कुछ भी पूछें — योजनाएँ, धोखाधड़ी, टैक्स, सेहत, आपका व्यापार…")}</p>}
              </div>

              {/* footer: controls — sticky so the mic & hands-free are always visible */}
              <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-3 bg-paper/95 px-4 pb-4 pt-3 backdrop-blur-sm shadow-[0_-8px_16px_-10px_rgba(0,0,0,0.15)]">
                {unsupported ? (
                  <p className="rounded-xl bg-amber2/10 px-3 py-2 text-center text-xs font-medium text-amber2 deva">
                    {L("Voice needs Chrome or Edge. Please use the chat instead on this browser.", "आवाज़ के लिए Chrome या Edge चाहिए। इस ब्राउज़र पर कृपया चैट का उपयोग करें।")}
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    {/* hands-free toggle */}
                    <button onClick={() => setHandsFree((h) => !h)} title={L("Hands-free", "हैंड्स-फ़्री")}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${handsFree ? "border-transparent text-white" : "border-line text-graphite hover:bg-mist"}`}
                      style={handsFree ? { background: accent } : undefined}><Hand className="h-4 w-4" /></button>

                    {/* the big mic */}
                    <button onClick={onMic}
                      className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-float transition-transform hover:-translate-y-0.5"
                      style={{ background: ring }}>
                      {status === "listening"
                        ? <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}><Mic className="h-6 w-6" /></motion.span>
                        : status === "thinking" ? <Loader2 className="h-6 w-6 animate-spin" />
                          : <Mic className="h-6 w-6" />}
                    </button>

                    {/* spacer to balance the toggle */}
                    <span className="h-10 w-10" />
                  </div>
                )}
                <p className="mt-2.5 text-center text-[11px] text-faint deva">
                  {status === "speaking" ? L("Tap the mic to interrupt", "बीच में बोलने के लिए माइक दबाएँ")
                    : handsFree ? L("Hands-free on — I'll keep listening after I reply", "हैंड्स-फ़्री चालू — जवाब के बाद मैं सुनती रहूँगी")
                      : L("Tap the mic each time you want to speak", "बोलने के लिए हर बार माइक दबाएँ")}
                </p>
              </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
