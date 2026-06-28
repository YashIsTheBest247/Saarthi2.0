import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, ImagePlus, X, FileText, Loader2, CheckCircle2, Sparkles, Crown, UserCheck } from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES, featureByKey } from "../lib/features";
import { callFeature, fileToInlineData, FeatureKey } from "../lib/api";
import { AgentAvatar } from "../components/AgentAvatar";
import { LanguagePicker } from "../components/LanguagePicker";
import { CopyBlock } from "../components/ui";

const SMRITI = featureByKey("samay");
const OTHERS = FEATURES.filter((f) => f.key !== "samay");
const AV = 48; // avatar size

interface FeedItem { id: number; agent: string; title: string; status: "running" | "done" | "skip"; agentName?: string; text?: string }

export function Orchestrator({ onBack }: { onBack: () => void }) {
  const { t, lang } = useApp();
  const graphRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idc = useRef(1);

  const [size, setSize] = useState({ w: 720, h: 540 });
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);   // agent key currently receiving control
  const [done, setDone] = useState<Set<string>>(new Set());
  const [smritiBusy, setSmritiBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // responsive node layout — measure the graph area
  useEffect(() => {
    const el = graphRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // node positions: Smriti up top-centre, agents fanned out in two arcs below
  const W = size.w, H = size.h;
  const smriti = { x: W / 2, y: 46 };
  const row1 = OTHERS.slice(0, 6), row2 = OTHERS.slice(6);
  const place = (arr: typeof OTHERS, y: number, all: number) => arr.map((f, i) => {
    const pad = Math.min(70, W * 0.1);
    const n = arr.length;
    const x = n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    return { f, x, y, key: f.key };
  });
  const nodes = [...place(row1, Math.max(170, H * 0.46), 6), ...place(row2, Math.max(300, H * 0.82), 5)];

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    fileToInlineData(file).then((d) => setImage(d));
    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  }
  function clearFile() { setImage(null); setPreview(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }

  async function run() {
    if (running || (!text.trim() && !image)) return;
    setRunning(true); setDone(new Set()); setFeed([]); setActive(null); setSummary(""); setSmritiBusy(true);
    const today = new Date().toDateString();
    let tasks: any[] = [];
    try {
      const intake = await callFeature<{ summary?: string; tasks?: any[] }>("intake", { text, image, today, language: lang.name });
      setSummary(intake.summary || "");
      tasks = intake.tasks || [];
    } catch { setRunning(false); setSmritiBusy(false); return; }
    setSmritiBusy(false);

    for (const tk of tasks) {
      const key = (tk.suggestedAgent && tk.suggestedAgent !== "none") ? tk.suggestedAgent : "samay";
      const fid = idc.current++;
      setActive(key);
      setFeed((p) => [...p, { id: fid, agent: key, title: tk.title, status: "running" }]);
      // let the control-flow animation breathe
      await new Promise((r) => setTimeout(r, 650));
      try {
        const r = await callFeature<any>("manager", { task: tk.detail ? `${tk.title} — ${tk.detail}` : tk.title, today, language: lang.name });
        const owner = r.canDelegate ? r.agent : "samay";
        setDone((p) => new Set(p).add(owner === "none" ? "samay" : owner));
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: r.canDelegate ? "done" : "skip", agentName: r.agentName, text: r.deliverable, agent: owner === "none" ? "samay" : owner } : x));
      } catch {
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: "done", text: "Couldn't reach this agent — try again." } : x));
      }
      setActive(null);
    }
    setRunning(false);
  }

  const edgeActive = (key: string) => active === key || done.has(key);
  const nameOf = (key: string) => { const f = FEATURES.find((x) => x.key === key); return f ? t(f.nameKey) : key; };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" /> {t("common.back")}</button>
        <LanguagePicker compact />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-white" style={{ background: SMRITI.accent }}><Crown className="h-7 w-7" /></span>
        <div>
          <h1 className="display text-3xl font-bold deva">Saarthi Orchestrator</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted deva">Smriti runs the show — drop a file or describe your problem, and watch control flow to exactly the agents you need.</p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* ---------- node graph ---------- */}
        <div ref={graphRef} className="relative h-[540px] overflow-hidden rounded-3xl border border-line"
          style={{ background: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px) 0 0 / 22px 22px, #FBFAF7" }}>
          {/* edges */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {nodes.map((n) => {
              const act = edgeActive(n.key);
              const my = smriti.y + AV / 2, dy = n.y - AV / 2 - 14;
              const midY = (my + dy) / 2;
              const d = `M ${smriti.x} ${my} C ${smriti.x} ${midY}, ${n.x} ${midY}, ${n.x} ${dy}`;
              return (
                <path key={n.key} d={d} fill="none" strokeWidth={act ? 2.4 : 1.4}
                  stroke={act ? n.f.accent : "#d9d4ca"} className={active === n.key ? "flow-line" : ""}
                  style={{ opacity: act ? 1 : 0.5, transition: "stroke .3s, opacity .3s" }} />
              );
            })}
          </svg>

          {/* Smriti (manager) */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: smriti.x, top: smriti.y }}>
            <div className="relative mx-auto">
              <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: SMRITI.accent }}><Crown className="h-3 w-3" /></span>
              <motion.div animate={smritiBusy ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ repeat: smritiBusy ? Infinity : 0, duration: 1.1 }}
                className="rounded-2xl" style={{ boxShadow: smritiBusy ? `0 0 0 4px ${SMRITI.accent}33` : `0 0 0 2px ${SMRITI.accent}` }}>
                <AgentAvatar photo={SMRITI.photo} name={t(SMRITI.nameKey)} tint={SMRITI.tint} accent={SMRITI.accent} rounded="rounded-2xl" className="h-14 w-14" />
              </motion.div>
            </div>
            <div className="mt-1 text-[13px] font-bold text-ink deva">{t(SMRITI.nameKey)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SMRITI.accent }}>Manager</div>
          </div>

          {/* agent nodes */}
          {nodes.map((n) => {
            const isActive = active === n.key, isDone = done.has(n.key);
            return (
              <div key={n.key} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: n.x, top: n.y, width: AV + 36 }}>
                <motion.div animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={{ repeat: isActive ? Infinity : 0, duration: 0.9 }}
                  className="relative mx-auto w-fit rounded-xl"
                  style={{ boxShadow: isActive ? `0 0 0 4px ${n.f.accent}40` : isDone ? `0 0 0 2px ${n.f.accent}` : undefined, opacity: running && !isActive && !isDone ? 0.55 : 1, transition: "opacity .3s" }}>
                  <AgentAvatar photo={n.f.photo} name={t(n.f.nameKey)} tint={n.f.tint} accent={n.f.accent} rounded="rounded-xl" className="flex-none" />
                  {isDone && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white"><CheckCircle2 className="h-4 w-4 text-[#138A72]" /></span>}
                  {isActive && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white"><Loader2 className="h-4 w-4 animate-spin" style={{ color: n.f.accent }} /></span>}
                </motion.div>
                <div className="mt-1 line-clamp-1 text-[11px] font-medium text-graphite deva" style={{ width: AV + 36 }}>{t(n.f.nameKey)}</div>
              </div>
            );
          })}
        </div>

        {/* ---------- dialogue box ---------- */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <AgentAvatar photo={SMRITI.photo} name={t(SMRITI.nameKey)} tint={SMRITI.tint} accent={SMRITI.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
              <div className="text-sm font-semibold text-ink deva">Talk to {t(SMRITI.nameKey)}</div>
            </div>

            {preview && (
              <div className="relative mb-3 inline-block">
                <img src={preview} alt="upload" className="max-h-32 rounded-xl border border-line" />
                <button onClick={clearFile} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            {image && !preview && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-line bg-mist px-3 py-2">
                <FileText className="h-4 w-4" style={{ color: SMRITI.accent }} />
                <span className="max-w-[12rem] truncate text-sm text-graphite deva">{fileName}</span>
                <button onClick={clearFile} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"><X className="h-3 w-3" /></button>
              </div>
            )}

            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Upload your homework / documents or describe what you need — Smriti will route it." className="field resize-none deva" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={run} disabled={running || (!text.trim() && !image)} className="btn-accent text-[15px]" style={{ background: SMRITI.accent }}>
                {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : <><Send className="h-4 w-4" /> Delegate</>}
              </button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm"><ImagePlus className="h-4 w-4" /> Photo / PDF</button>
            </div>
          </div>

          {/* live processing indicator */}
          {running && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-3 p-4">
              <span className="relative flex h-9 w-9 flex-none">
                <svg viewBox="0 0 36 36" className="h-9 w-9 animate-spin">
                  <circle cx="18" cy="18" r="15" fill="none" stroke={`${SMRITI.accent}22`} strokeWidth="4" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={SMRITI.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray="64 36" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink deva">
                  {smritiBusy ? `${t(SMRITI.nameKey)} is reading & prioritising…` : active ? `Handing off to ${nameOf(active)}…` : "Working…"}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted deva">
                  Routing your request to the right agents
                  <span className="inline-flex gap-0.5">
                    {[0, 1, 2].map((d) => <motion.span key={d} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.1, delay: d * 0.18 }} className="text-ink">.</motion.span>)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {summary && (
            <div className="card flex items-start gap-2 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 flex-none" style={{ color: SMRITI.accent }} />
              <p className="text-sm text-graphite deva">{summary}</p>
            </div>
          )}

          {/* live control-flow feed */}
          <div className="space-y-3">
            <AnimatePresence>
              {feed.map((it) => {
                const f = FEATURES.find((x) => x.key === (it.agent as FeatureKey));
                const ok = it.status === "done";
                return (
                  <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-4">
                    <div className="flex items-center gap-2.5">
                      {f ? <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
                        : <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-mist"><UserCheck className="h-4 w-4 text-muted" /></span>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink deva">{f ? t(f.nameKey) : it.agentName || "You"}</div>
                        <div className="truncate text-[11px] text-muted deva">{it.title}</div>
                      </div>
                      {it.status === "running" ? <Loader2 className="h-4 w-4 flex-none animate-spin" style={{ color: f?.accent }} />
                        : ok ? <CheckCircle2 className="h-4 w-4 flex-none text-[#138A72]" />
                        : <span className="rounded-full bg-[#F7EEDB] px-2 py-0.5 text-[10px] font-semibold text-[#B07A1E]">You</span>}
                    </div>
                    {it.text && it.status !== "running" && (ok
                      ? <div className="mt-2"><CopyBlock text={it.text} /></div>
                      : <p className="mt-2 text-sm text-graphite deva">{it.text}</p>)}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!running && feed.length > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-mist py-3 text-sm font-medium text-graphite deva">
                <Sparkles className="h-4 w-4" style={{ color: SMRITI.accent }} /> Done — {done.size} agent{done.size === 1 ? "" : "s"} handled it.
              </div>
            )}
            {!running && feed.length === 0 && !summary && (
              <p className="px-1 text-sm text-muted deva">Smriti will read your input, then light up the agents she hands work to and bring back their results here.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
