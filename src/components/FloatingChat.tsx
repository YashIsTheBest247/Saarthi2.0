import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Mic } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, FeatureKey } from "../lib/api";
import { routeToAgent, AGENT_KEYS } from "../lib/route";
import { useVoice } from "../hooks/useVoice";
import { AgentAvatar } from "./AgentAvatar";
import { BrandMark } from "./Logo";

interface Msg {
  id: number;
  from: "bot" | "user";
  text?: string;
  agent?: FeatureKey;
  reason?: string;
  chooser?: boolean;
}

let mid = 1;
const ACCENT = "#2D6BFF";

export function FloatingChat({ onOpen }: { onOpen: (k?: FeatureKey) => void }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [glowDone, setGlowDone] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", text: t("chat.greet") }]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const voice = useVoice(lang.speech, setInput);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  // let other parts of the app open the chat (e.g. the "Start with any tool" CTA)
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("saarthi:openchat", h);
    return () => window.removeEventListener("saarthi:openchat", h);
  }, []);

  const add = (m: Omit<Msg, "id">) => setMsgs((prev) => [...prev, { ...m, id: mid++ }]);

  async function handle(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    add({ from: "user", text: q });
    setBusy(true);

    const local = routeToAgent(q); // instant offline guess
    let agent: FeatureKey | null = local;
    let reason = "";
    try {
      const r = await callFeature<{ agent: string; reason: string; _mock?: boolean }>("route", { problem: q, language: lang.name });
      if (!r._mock && r.agent && (AGENT_KEYS as string[]).includes(r.agent)) {
        agent = r.agent as FeatureKey;
        reason = r.reason || "";
      }
    } catch {
      /* keep local */
    }
    setBusy(false);

    if (agent) {
      const f = featureByKey(agent);
      add({ from: "bot", agent, reason: reason || `${t("chat.match")} ${t(f.nameKey)} — ${t(f.tagKey)}.` });
    } else {
      add({ from: "bot", text: t("chat.unsure"), chooser: true });
    }
  }

  const suggestions = [t("chat.s1"), t("chat.s2"), t("chat.s3")];

  return (
    <>
      {/* panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-4 z-[70] flex h-[32rem] max-h-[78vh] w-[92vw] max-w-[24rem] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-float sm:right-6"
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-line bg-ink px-4 py-3 text-white">
              <BrandMark className="h-7 w-7" />
              <div className="min-w-0">
                <div className="display text-sm font-bold">{t("chat.title")}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fbf86]" /> {t("chat.subtitle")}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-mist/40 p-4">
              {msgs.map((m) =>
                m.from === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white deva" style={{ background: ACCENT }}>{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-2">
                    <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-white"><BrandMark className="h-4 w-4" /></div>
                    <div className="min-w-0 max-w-[85%] space-y-2">
                      {m.text && <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm text-graphite deva">{m.text}</div>}
                      {m.agent && <AgentSuggestion agent={m.agent} reason={m.reason} onOpen={onOpen} close={() => setOpen(false)} />}
                      {m.chooser && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {AGENT_KEYS.map((k) => {
                            const f = featureByKey(k);
                            return (
                              <button key={k} onClick={() => { onOpen(k); setOpen(false); }}
                                className="flex items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-2 text-left text-xs font-medium hover:bg-mist">
                                <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-5 w-5 flex-none" />
                                <span className="truncate deva">{t(f.nameKey)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex gap-2">
                  <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink"><BrandMark className="h-4 w-4" /></div>
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: ACCENT }} /> {t("chat.thinking")}
                  </div>
                </div>
              )}

              {/* suggestion chips (only at the start) */}
              {msgs.length === 1 && !busy && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => handle(s)} className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-graphite hover:bg-mist deva">{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* input */}
            <form onSubmit={(e) => { e.preventDefault(); handle(input); }} className="flex items-center gap-2 border-t border-line bg-paper p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.ph")}
                className="min-w-0 flex-1 rounded-full border border-line bg-mist px-4 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-[#2D6BFF] focus:bg-paper deva"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stop() : voice.start(input))}
                  aria-label={voice.listening ? t("common.listening") : t("common.speak")}
                  className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border transition-colors ${voice.listening ? "border-transparent bg-[#C0453B] text-white" : "border-line bg-paper text-graphite hover:text-ink"}`}
                >
                  {voice.listening ? (
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                      <Mic className="relative h-4 w-4" />
                    </span>
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}
              <button type="submit" disabled={busy || !input.trim()} className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white disabled:opacity-40" style={{ background: ACCENT }}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chat.title")}
        className="fixed bottom-5 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-float transition-transform hover:-translate-y-0.5 sm:right-6"
      >
        {!open && !glowDone && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[#2D6BFF]"
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut", repeat: 1 }}
            onAnimationComplete={() => setGlowDone(true)}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="relative">
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}

function AgentSuggestion({ agent, reason, onOpen, close }: { agent: FeatureKey; reason?: string; onOpen: (k?: FeatureKey) => void; close: () => void }) {
  const { t } = useApp();
  const f = featureByKey(agent);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex items-center gap-3 p-3" style={{ background: f.tint }}>
        <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-xl" className="h-11 w-11 flex-none" />
        <div className="min-w-0">
          <div className="display text-sm font-bold deva" style={{ color: f.accentDark }}>{t(f.nameKey)}</div>
          <div className="truncate text-[11px] font-medium deva" style={{ color: f.accentDark, opacity: 0.8 }}>{t(f.tagKey)}</div>
        </div>
      </div>
      {reason && <p className="px-3 pt-2.5 text-sm leading-relaxed text-graphite deva">{reason}</p>}
      <div className="p-3">
        <button onClick={() => { onOpen(agent); close(); }} className="btn w-full justify-center py-2.5 text-sm text-white" style={{ background: f.accent }}>
          {t("chat.open")} {t(f.nameKey)}
        </button>
      </div>
    </div>
  );
}
