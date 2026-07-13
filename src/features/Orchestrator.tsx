import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, ImagePlus, X, FileText, Loader2, CheckCircle2, Crown, UserCheck, CalendarPlus, CloudRain, AlertTriangle, MessageCircle, ChevronDown, Zap, Sparkles } from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES, VISIBLE_FEATURES, featureByKey } from "../lib/features";
import { callFeature, fileToInlineData, FeatureKey, planAgent, runAgentStep, synthesizeAgent, getEmployees, Employee, AgentStepResult, AgentFinal } from "../lib/api";
import { AgentAvatar } from "../components/AgentAvatar";
import { LanguagePicker } from "../components/LanguagePicker";
import { CopyBlock } from "../components/ui";
import { NotifyMe } from "../components/NotifyMe";
import { BrandMark } from "../components/Logo";
import { buildICS, downloadICS, parseWhen } from "../lib/reminders";
import { clean } from "../lib/text";
import { linkify } from "../lib/linkify";
import { SosAlert, SOS_RE } from "../components/SosAlert";
import { ActionBar } from "../components/ActionBar";

const SMRITI = featureByKey("samay");
const OTHERS = VISIBLE_FEATURES.filter((f) => f.key !== "samay");
const AV = 48; // avatar size

interface FeedItem { id: number; agent: string; title: string; status: "running" | "done" | "skip"; agentName?: string; text?: string }

export function Orchestrator({ onBack }: { onBack: () => void }) {
  const { t, lang } = useApp();
  const graphRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
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
  const [dated, setDated] = useState<{ title: string; deadline: string }[]>([]); // tasks with a date → auto calendar
  const [allTasks, setAllTasks] = useState<{ title: string; deadline: string }[]>([]); // every task from the run → full calendar plan
  const [fellBack, setFellBack] = useState(false); // true if Gemini quota hit → mock fallback shown
  const [followUp, setFollowUp] = useState("");   // Smriti's clarifying question
  const [reply, setReply] = useState("");          // user's answer to it
  const [mode, setMode] = useState<"guided" | "auto">("auto"); // auto = fully agentic plan→act→reflect→synthesise
  const [plan, setPlan] = useState<{ agent: string; task: string; why?: string }[]>([]); // the live-generated plan
  const [final, setFinal] = useState<AgentFinal | null>(null); // the synthesised deliverable
  const [employees, setEmployees] = useState<Employee[]>([]);   // AI Workforce, shown as part of Smriti's team
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const historyRef = useRef("");                   // accumulated conversation context

  // some agents (weather, emergency, khananCopilot) map onto a visible graph node — or none
  const nodeKey = (k: string) => (k === "khananCopilot" ? "khanan" : k);

  // responsive node layout — measure the graph area
  useEffect(() => {
    const el = graphRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // when the answer is ready, scroll the page down to it
  useEffect(() => {
    if (!running && feed.length > 0) {
      const id = window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 140);
      return () => window.clearTimeout(id);
    }
  }, [running, feed.length]);

  // Smriti's full team: the consumer specialists + the hireable AI Workforce.
  const team = [
    ...OTHERS.map((f) => ({ key: f.key as string, photo: f.photo, name: t(f.nameKey), tint: f.tint, accent: f.accent, hire: false, id: f.key as string })),
    ...employees.map((e) => ({ key: e.id, photo: e.photo, name: e.name, tint: e.accent, accent: e.accent, hire: true, id: e.id })),
  ];
  // node positions: Smriti up top-centre, the team fanned out in rows below
  const W = size.w, H = size.h;
  const smriti = { x: W / 2, y: 46 };
  const rowCount = team.length > 10 ? 3 : 2;
  const perRow = Math.ceil(team.length / rowCount);
  const ys = rowCount === 3 ? [0.34, 0.58, 0.82] : [0.46, 0.82];
  const place = (arr: typeof team, y: number) => arr.map((m, i) => {
    const pad = Math.min(64, W * 0.09);
    const n = arr.length;
    const x = n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    return { m, x, y, key: m.key };
  });
  const nodes = Array.from({ length: rowCount }, (_, ri) =>
    place(team.slice(ri * perRow, (ri + 1) * perRow), Math.max(120, H * ys[ri]))).flat();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    fileToInlineData(file).then((d) => setImage(d));
    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  }
  function clearFile() { setImage(null); setPreview(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }

  // first submit — starts a fresh conversation
  function start() {
    if (running || (!text.trim() && !image)) return;
    historyRef.current = text.trim();
    setFeed([]); setDone(new Set()); setSummary(""); setFollowUp(""); setDated([]); setAllTasks([]); setFellBack(false);
    setPlan([]); setFinal(null);
    if (mode === "auto") autonomous(); else orchestrate();
  }

  // ─── Fully autonomous run: the model PLANS the agent chain, ACTS on each step
  // feeding results forward, then SYNTHESISES one finished deliverable. ───
  async function autonomous() {
    setRunning(true); setActive(null); setSmritiBusy(true);
    const today = new Date().toDateString();
    const goal = historyRef.current;
    let planned;
    try {
      planned = await planAgent({ goal, language: lang.name });
    } catch { setRunning(false); setSmritiBusy(false); return; }
    setSummary(planned.understanding || "");
    setPlan(planned.steps || []);
    setSmritiBusy(false);

    const executed: AgentStepResult[] = [];
    let ctx = "";
    for (const step of planned.steps || []) {
      const nk = nodeKey(step.agent);
      setActive(nk);
      const fid = idc.current++;
      setFeed((p) => [...p, { id: fid, agent: nk, title: step.why || step.task, status: "running" }]);
      await new Promise((r) => setTimeout(r, 520)); // let the control-flow animation breathe
      try {
        const res = await runAgentStep({ agent: step.agent, task: step.task, context: ctx, image, today, language: lang.name });
        if (res.data?._mock) setFellBack(true);
        executed.push(res);
        ctx = ctx ? `${ctx}\n[${res.name}] ${res.summary}` : `[${res.name}] ${res.summary}`;
        setDone((p) => new Set(p).add(nk));
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: "done", agentName: res.name, text: res.summary } : x));
      } catch {
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: "done", text: t("orc.agentUnreach") } : x));
      }
      setActive(null);
    }

    // synthesise the finished deliverable from every step
    setSmritiBusy(true);
    try {
      const fin = await synthesizeAgent({ goal, steps: executed, language: lang.name });
      if (fin?._mock) setFellBack(true);
      setFinal(fin);
      const rem = (fin.reminders || []).map((r) => ({ title: r.title, deadline: r.when || "" }));
      setAllTasks(rem); setDated(rem.filter((r) => r.deadline));
    } catch { /* keep the per-step results even if synthesis fails */ }
    setSmritiBusy(false);
    setRunning(false);
  }
  // answer Smriti's clarifying question, then continue
  function sendReply() {
    if (running || !reply.trim()) return;
    historyRef.current = `${historyRef.current}\n\nSmriti asked: ${followUp}\nMy answer: ${reply.trim()}`;
    setReply(""); setFollowUp("");
    orchestrate();
  }

  async function orchestrate() {
    setRunning(true); setActive(null); setSmritiBusy(true);
    const today = new Date().toDateString();
    let tasks: any[] = [];
    try {
      const intake = await callFeature<{ summary?: string; tasks?: any[]; followUp?: string }>("intake", { text: historyRef.current, image, today, language: lang.name });
      if (intake._mock) setFellBack(true);
      setSummary(intake.summary || "");
      tasks = intake.tasks || [];
      // Smriti needs a clarification before she can delegate
      if (intake.followUp && tasks.length === 0) {
        setFollowUp(intake.followUp); setSmritiBusy(false); setRunning(false); return;
      }
    } catch { setRunning(false); setSmritiBusy(false); return; }
    setSmritiBusy(false);
    setDone(new Set()); setFeed([]);
    const datedTasks: { title: string; deadline: string }[] = [];
    const everyTask: { title: string; deadline: string }[] = [];

    // 1) weather FIRST — Smriti checks live weather for any outdoor/weather-dependent goal
    let weatherCtx = "";
    const wTask = tasks.find((t) => t.weatherSensitive && t.location);
    if (wTask) {
      const wfid = idc.current++;
      setFeed((p) => [...p, { id: wfid, agent: "weather", title: t("orc.liveWeather").replace("{loc}", wTask.location), status: "running" }]);
      await new Promise((r) => setTimeout(r, 550));
      try {
        const w = await (await fetch(`/api/weather?place=${encodeURIComponent(wTask.location)}`)).json();
        weatherCtx = w.summary ? `Live weather for ${wTask.location}: ${w.summary}. If conditions are hazardous (storm, heavy rain, extreme heat), warn the user and suggest a safer time or precautions.` : "";
        setFeed((p) => p.map((x) => x.id === wfid ? { ...x, status: "done", agentName: t("orc.liveWeatherName"), text: w.summary || t("orc.weatherNA") } : x));
      } catch {
        setFeed((p) => p.map((x) => x.id === wfid ? { ...x, status: "done", agentName: t("orc.liveWeatherName"), text: t("orc.weatherNA") } : x));
      }
    }

    // 2) delegate each task to its specialist (sharing the weather context where relevant)
    for (const tk of tasks) {
      const key = (tk.suggestedAgent && tk.suggestedAgent !== "none") ? tk.suggestedAgent : "samay";
      const fid = idc.current++;
      setActive(key);
      setFeed((p) => [...p, { id: fid, agent: key, title: tk.title, status: "running" }]);
      // let the control-flow animation breathe
      await new Promise((r) => setTimeout(r, 650));

      const ctx = tk.weatherSensitive ? weatherCtx : "";
      try {
        const r = await callFeature<any>("manager", { task: tk.detail ? `${tk.title} — ${tk.detail}` : tk.title, deadline: tk.deadline || "", context: ctx, today, language: lang.name });
        if (r._mock) setFellBack(true);
        const owner = r.canDelegate ? r.agent : "samay";
        setDone((p) => new Set(p).add(owner === "none" ? "samay" : owner));
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: r.canDelegate ? "done" : "skip", agentName: r.agentName, text: r.deliverable, agent: owner === "none" ? "samay" : owner } : x));
      } catch {
        setFeed((p) => p.map((x) => x.id === fid ? { ...x, status: "done", text: t("orc.agentUnreach") } : x));
      }
      if (tk.deadline) datedTasks.push({ title: tk.title, deadline: tk.deadline });
      everyTask.push({ title: tk.title, deadline: tk.deadline || "" });
      setActive(null);
    }
    setDated(datedTasks);
    setAllTasks(everyTask);
    setRunning(false);
  }

  const edgeActive = (key: string) => active === key || done.has(key);
  const nameOf = (key: string) => { const f = FEATURES.find((x) => x.key === key); return f ? t(f.nameKey) : key; };

  // build calendar items for EVERY task in the run — dated tasks keep their date,
  // undated ones are staggered over the coming days so nothing collides.
  const icsItems = () =>
    allTasks.map((tk, i) => {
      let when: Date;
      if (tk.deadline) when = parseWhen(tk.deadline);
      else { when = new Date(); when.setDate(when.getDate() + 1 + i); when.setHours(9, 0, 0, 0); }
      return { title: tk.title, deadline: when.toISOString() };
    });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" /> {t("common.back")}</button>
        <LanguagePicker compact />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-white" style={{ background: SMRITI.accent }}><Crown className="h-7 w-7" /></span>
        <div className="min-w-0">
          <h1 className="display text-3xl font-bold deva">{t("orc.title")}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted deva">{t("orc.sub")}</p>
          {/* mode: fully-autonomous (plan→act→reflect) vs guided delegation */}
          <div className="mt-3 inline-flex rounded-xl border border-line bg-mist/50 p-1 text-sm font-semibold">
            <button onClick={() => !running && setMode("auto")} disabled={running}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition"
              style={mode === "auto" ? { background: SMRITI.accent, color: "#fff" } : { color: "#6b6b6b" }}>
              <Zap className="h-3.5 w-3.5" /> {t("orc.modeAuto")}
            </button>
            <button onClick={() => !running && setMode("guided")} disabled={running}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition"
              style={mode === "guided" ? { background: SMRITI.accent, color: "#fff" } : { color: "#6b6b6b" }}>
              <UserCheck className="h-3.5 w-3.5" /> {t("orc.modeGuided")}
            </button>
          </div>
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
                  stroke={act ? n.m.accent : "#d9d4ca"} className={active === n.key ? "flow-line" : ""}
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
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SMRITI.accent }}>{t("orc.manager")}</div>
          </div>

          {/* agent nodes */}
          {nodes.map((n) => {
            const isActive = active === n.key, isDone = done.has(n.key);
            return (
              <div key={n.key} onClick={() => n.m.hire && window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: { id: n.m.id } }))}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-center ${n.m.hire ? "cursor-pointer" : ""}`} style={{ left: n.x, top: n.y, width: AV + 36 }}>
                <motion.div animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={{ repeat: isActive ? Infinity : 0, duration: 0.9 }}
                  className="relative mx-auto w-fit rounded-xl"
                  style={{ boxShadow: isActive ? `0 0 0 4px ${n.m.accent}40` : isDone ? `0 0 0 2px ${n.m.accent}` : undefined, opacity: running && !isActive && !isDone ? 0.55 : 1, transition: "opacity .3s" }}>
                  <AgentAvatar photo={n.m.photo} name={n.m.name} tint={n.m.tint} accent={n.m.accent} rounded="rounded-xl" className="flex-none" />
                  {isDone && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white"><CheckCircle2 className="h-4 w-4 text-[#138A72]" /></span>}
                  {isActive && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white"><Loader2 className="h-4 w-4 animate-spin" style={{ color: n.m.accent }} /></span>}
                </motion.div>
                <div className="mt-1 line-clamp-1 text-[11px] font-medium text-graphite deva" style={{ width: AV + 36 }}>{n.m.name}</div>
              </div>
            );
          })}
        </div>

        {/* ---------- dialogue box ---------- */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <AgentAvatar photo={SMRITI.photo} name={t(SMRITI.nameKey)} tint={SMRITI.tint} accent={SMRITI.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
              <div className="text-sm font-semibold text-ink deva">{t("orc.talkTo").replace("{name}", t(SMRITI.nameKey))}</div>
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

            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("orc.ph")} className="field resize-none deva" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={start} disabled={running || (!text.trim() && !image)} className="btn-accent text-[15px]" style={{ background: SMRITI.accent }}>
                {running ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("orc.working")}</> : <><Send className="h-4 w-4" /> {t("orc.delegate")}</>}
              </button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm"><ImagePlus className="h-4 w-4" /> {t("orc.photoPdf")}</button>
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
                  {smritiBusy ? t("orc.reading").replace("{name}", t(SMRITI.nameKey)) : active ? t("orc.handing").replace("{name}", nameOf(active)) : t("orc.working")}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted deva">
                  {t("orc.routing")}
                  <span className="inline-flex gap-0.5">
                    {[0, 1, 2].map((d) => <motion.span key={d} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.1, delay: d * 0.18 }} className="text-ink">.</motion.span>)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {summary && (
            <div className="card flex items-start gap-2 p-4">
              <span className="mt-0.5 inline-flex h-4 w-4 flex-none" style={{ color: SMRITI.accent }}><BrandMark className="h-4 w-4" /></span>
              <p className="text-sm text-graphite deva">{summary}</p>
            </div>
          )}

          {/* Smriti's clarifying question → a fresh reply box */}
          {followUp && !running && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <div className="mb-2 flex items-start gap-2">
                <AgentAvatar photo={SMRITI.photo} name={t(SMRITI.nameKey)} tint={SMRITI.tint} accent={SMRITI.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
                <div>
                  <div className="text-[13px] font-semibold text-ink deva">{t("orc.needDetail").replace("{name}", t(SMRITI.nameKey))}</div>
                  <p className="mt-0.5 text-sm text-graphite deva">{followUp}</p>
                </div>
              </div>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                placeholder={t("orc.answerPh")} className="field resize-none deva" />
              <div className="mt-2 flex justify-end">
                <button onClick={sendReply} disabled={!reply.trim()} className="btn-accent text-sm" style={{ background: SMRITI.accent }}>
                  <Send className="h-4 w-4" /> {t("orc.sendAnswer")}
                </button>
              </div>
            </motion.div>
          )}

          </div>
        </div>

        {/* results — full width so long answers, drafts & contacts have room */}
        <div ref={resultsRef} className="mt-5 space-y-3 scroll-mt-24">
            {/* the dynamically-composed plan (autonomous mode) */}
            {mode === "auto" && plan.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink deva">
                  <span className="inline-flex h-4 w-4 flex-none" style={{ color: SMRITI.accent }}><BrandMark className="h-4 w-4" /></span> {t("orc.planTitle")}
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                  {plan.map((s, i) => {
                    const f = FEATURES.find((x) => x.key === nodeKey(s.agent));
                    return (
                      <span key={i} className="inline-flex items-center gap-1">
                        {i > 0 && <span className="px-0.5 text-muted">→</span>}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist/60 px-2.5 py-1 text-xs font-medium text-graphite deva">
                          {done.has(nodeKey(s.agent)) ? <CheckCircle2 className="h-3.5 w-3.5 text-[#138A72]" />
                            : active === nodeKey(s.agent) ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: f?.accent || SMRITI.accent }} />
                            : <span className="h-1.5 w-1.5 rounded-full" style={{ background: f?.accent || SMRITI.accent }} />}
                          {f ? t(f.nameKey) : s.agent}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* the finished, synthesised deliverable */}
            {final && !running && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5"
                style={{ borderColor: `${SMRITI.accent}55`, boxShadow: `0 0 0 1px ${SMRITI.accent}22` }}>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: SMRITI.accent }}>
                  <Zap className="h-4 w-4" /> {t("orc.doneForYou")}
                </div>
                <h3 className="text-lg font-bold text-ink deva">{final.headline}</h3>
                {final.summary && <p className="mt-1 text-sm text-graphite deva">{final.summary}</p>}
                {final.deliverable && (
                  <div className="mt-3">
                    <CopyBlock text={clean(final.deliverable)} />
                    <ActionBar title={final.headline} text={clean(final.deliverable)} deadline={dated[0]?.deadline} accent={SMRITI.accent} />
                  </div>
                )}
                {final.actions && final.actions.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[13px] font-semibold text-ink deva">{t("orc.nextActions")}</div>
                    <ul className="space-y-1">
                      {final.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-graphite deva">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: SMRITI.accent }} /> <span>{linkify(a)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {fellBack && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber2/40 bg-amber2/10 px-4 py-3 text-sm font-medium text-amber2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span className="deva">{t("orc.quotaA")}<b>{t("orc.quotaB")}</b>{t("orc.quotaC")}</span>
              </div>
            )}
            {!running && feed.length > 0 && (SOS_RE.test(historyRef.current) || feed.some((it) => ["raahat", "sehat", "kavach"].includes(it.agent))) && (
              <SosAlert situation={historyRef.current} domain="this emergency" />
            )}
            {!running && feed.length > 0 && (
              <div className="card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink deva">
                  <CalendarPlus className="h-4 w-4" style={{ color: SMRITI.accent }} /> {t("orc.remindEmail")}
                </div>
                {allTasks.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-mist/50 p-3">
                    <span className="min-w-0 flex-1 text-sm text-graphite deva">
                      {t("orc.plannedPre")} <b>{allTasks.length}</b> {t("orc.plannedPost")
                        .replace("{s}", allTasks.length > 1 ? "s" : "")
                        .replace("{dated}", dated.length > 0 ? t("orc.plannedDated").replace("{m}", String(dated.length)) : "")}
                    </span>
                    <button onClick={() => downloadICS(icsItems(), "saarthi-plan.ics")} className="btn-accent text-sm" style={{ background: SMRITI.accent }}><CalendarPlus className="h-4 w-4" /> {t("orc.addCal")}</button>
                  </div>
                )}
                <NotifyMe accent={SMRITI.accent}
                  getPayload={() => ({
                    title: t("orc.emailTitle"),
                    message: feed.map((it) => `• ${it.title}${it.text ? "\n" + clean(it.text) : ""}`).join("\n\n") + (allTasks.length ? `\n\n${t("orc.planHeading")}\n${icsItems().map((d) => `• ${d.title} — ${new Date(d.deadline).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`).join("\n")}\n${t("orc.icsAttached")}` : ""),
                  })}
                  getICS={allTasks.length ? () => buildICS(icsItems()) : undefined}
                />
              </div>
            )}
            <AnimatePresence>
              {feed.map((it) => (
                <FeedCard key={it.id} it={it} dated={dated} history={historyRef.current} />
              ))}
            </AnimatePresence>

            {!running && feed.length > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-mist py-3 text-sm font-medium text-graphite deva">
                <span className="inline-flex h-4 w-4" style={{ color: SMRITI.accent }}><BrandMark className="h-4 w-4" /></span> {t("orc.doneMsg").replace("{n}", String(done.size)).replace("{s}", done.size === 1 ? "" : "s")}
              </div>
            )}
            {!running && feed.length === 0 && !summary && (
              <p className="px-1 text-sm text-muted deva">{t("orc.empty")}</p>
            )}
        </div>
    </motion.div>
  );
}

/* One result row — plus an inline "continue with this agent" chat that keeps
   the task's context so the user can go deeper in that specific domain. */
function FeedCard({ it, dated, history }: { it: FeedItem; dated: { title: string; deadline: string }[]; history: string }) {
  const { t, lang } = useApp();
  const f = FEATURES.find((x) => x.key === (it.agent as FeatureKey));
  const ok = it.status === "done";
  const canContinue = ok && it.agent !== "weather" && !!f && !!it.text;

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // keep the chat scrolled to the latest turn (contained — doesn't move the page)
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy, open]);

  async function send() {
    const q = input.trim();
    if (!q || busy || !f) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, text: q }];
    setMsgs(next);
    setBusy(true);
    const ctx =
      `You are ${t(f.nameKey)}. Continue helping the user, staying strictly in your domain.\n\n` +
      `The user's original request to the team: ${history}\n\n` +
      `The task you handled: ${it.title}\nYour earlier answer:\n${clean(it.text || "")}\n\n` +
      `Conversation so far:\n${next.map((m) => `${m.role === "user" ? "User" : "You"}: ${m.text}`).join("\n")}`;
    try {
      const r = await callFeature<{ agentName?: string; reply: string }>("assist", { problem: ctx, agentHint: it.agent, language: lang.name });
      setMsgs((m) => [...m, { role: "agent", text: clean(r.reply || "") }]);
    } catch {
      setMsgs((m) => [...m, { role: "agent", text: t("orc.chatReach") }]);
    } finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-4">
      <div className="flex items-center gap-2.5">
        {it.agent === "weather" ? <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: "#E8F0FE" }}><CloudRain className="h-4 w-4 text-[#2D6BFF]" /></span>
          : f ? <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
          : <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-mist"><UserCheck className="h-4 w-4 text-muted" /></span>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink deva">{f ? t(f.nameKey) : it.agentName || t("orc.you")}</div>
          <div className="truncate text-[11px] text-muted deva">{it.title}</div>
        </div>
        {it.status === "running" ? <Loader2 className="h-4 w-4 flex-none animate-spin" style={{ color: f?.accent }} />
          : ok ? <CheckCircle2 className="h-4 w-4 flex-none text-[#138A72]" />
          : <span className="rounded-full bg-[#F7EEDB] px-2 py-0.5 text-[10px] font-semibold text-[#B07A1E]">You</span>}
      </div>

      {it.text && it.status !== "running" && (ok
        ? <div className="mt-2"><CopyBlock text={clean(it.text)} /><ActionBar title={it.title} text={clean(it.text)} deadline={dated.find((d) => d.title === it.title)?.deadline} accent={f?.accent} /></div>
        : <p className="mt-2 whitespace-pre-wrap text-sm text-graphite deva">{linkify(clean(it.text || ""))}</p>)}

      {canContinue && (
        <div className="mt-1.5 border-t border-line/70 pt-2">
          <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: f!.accent }}>
            <MessageCircle className="h-4 w-4" /> {t("orc.continue").replace("{name}", t(f!.nameKey))}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="mt-2 rounded-2xl border border-line bg-mist/40 p-3">
              <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto">
                {msgs.length === 0 && <p className="text-xs text-muted deva">{t("orc.chatHint").replace("{name}", t(f!.nameKey))}</p>}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm deva ${m.role === "user" ? "bg-ink text-white" : "border border-line bg-paper text-graphite"}`}>
                      {m.role === "agent" ? linkify(m.text) : m.text}
                    </div>
                  </div>
                ))}
                {busy && <div className="flex items-center gap-1.5 text-xs text-muted deva"><Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: f!.accent }} /> {t("orc.typing").replace("{name}", t(f!.nameKey))}</div>}
              </div>
              <div className="mt-2 flex items-end gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={t("orc.followPh").replace("{name}", t(f!.nameKey))} className="field flex-1 resize-none deva" />
                <button onClick={send} disabled={busy || !input.trim()} className="btn-accent flex-none text-sm" style={{ background: f!.accent }}><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
