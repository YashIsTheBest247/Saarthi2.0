import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, CheckCircle2, Sparkles, Zap, Code2, ChevronDown, Building2, Plus, Users, KeyRound, Activity, X, Download, FileText, CalendarPlus } from "lucide-react";
import { useApp } from "../app/AppContext";
import { LanguagePicker } from "../components/LanguagePicker";
import { CopyBlock } from "../components/ui";
import { ActionBar } from "../components/ActionBar";
import { clean } from "../lib/text";
import { linkify } from "../lib/linkify";
import { getEmployees, assignEmployeeTask, getWorkforceMe, generateDoc, Employee, EmployeeRun, WorkforceMe } from "../lib/api";
import { getHired, getRuns, hire, fire, recordRun, DEMO_API_KEY, HiredEmployee, FleetRun } from "../lib/fleet";
import { roleIcon } from "../lib/roleIcons";
import { Integrations } from "./Integrations";
import { downloadICS, parseWhen } from "../lib/reminders";
import { BrandMark } from "../components/Logo";

/* short labels for the skill keys an employee can delegate to */
const SKILL_LABEL: Record<string, string> = {
  samajh: "Doc decode", setu: "Formal drafts", kar: "GST / tax", paisa: "Costing",
  samay: "Scheduling", study: "Reports", disha: "Hiring", haq: "Schemes",
  udyam: "Licences", pragyan: "Media", weather: "Live weather", krishi: "Agri",
  khananCopilot: "Mining", sehat: "Health", kavach: "Fraud check", emergency: "Crisis",
};
const ALL_SKILLS = ["samajh", "setu", "kar", "paisa", "samay", "study", "disha", "haq", "udyam", "pragyan", "weather"];

/** Trigger a client-side file download (for the auto-generated integration artefacts). */
function dl(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function Workforce({ onBack, initialId, initialCustom }: { onBack: () => void; initialId?: string; initialCustom?: boolean }) {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sel, setSel] = useState<Employee | null>(null);
  const [custom, setCustom] = useState(false);
  const [me, setMe] = useState<WorkforceMe | null>(null);
  const [tick, setTick] = useState(0); // bump to re-read localStorage fleet
  const [sector, setSector] = useState<string>("All");
  const runRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false); // apply the landing preselection only once

  useEffect(() => { getEmployees().then(setEmployees); getWorkforceMe().then(setMe); }, [tick]);
  const bump = () => setTick((n) => n + 1);

  // preselect an employee (or the custom panel) when opened from a landing chip
  useEffect(() => {
    if (seeded.current) return;
    if (initialCustom) {
      seeded.current = true; setCustom(true); setSel(null);
      requestAnimationFrame(() => runRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (initialId && employees.length) {
      const e = employees.find((x) => x.id === initialId);
      if (e) { seeded.current = true; setCustom(false); setSel(e); requestAnimationFrame(() => runRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }
    }
  }, [initialId, initialCustom, employees]);

  const sectors = useMemo(() => ["All", ...Array.from(new Set(employees.map((e) => e.sector)))], [employees]);
  const shown = sector === "All" ? employees : employees.filter((e) => e.sector === sector);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" /> {t("common.back")}</button>
        <LanguagePicker compact />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-ink text-white"><Users className="h-7 w-7" /></span>
        <div className="min-w-0">
          <h1 className="display text-3xl font-bold deva">{t("wfx.title")}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted deva">{t("wfx.sub")}</p>
        </div>
      </div>

      {/* how it works */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["1", t("wfx.step1t"), t("wfx.step1d")], ["2", t("wfx.step2t"), t("wfx.step2d")], ["3", t("wfx.step3t"), t("wfx.step3d")]].map(([n, tt, dd]) => (
          <div key={n} className="card flex items-start gap-3 p-4">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
            <div><div className="text-sm font-semibold text-ink deva">{tt}</div><div className="text-xs text-muted deva">{dd}</div></div>
          </div>
        ))}
      </div>

      {/* your fleet */}
      <FleetDashboard me={me} tick={tick} onChange={bump} />

      {/* real integration connectors (Tally / GSTIN / e-way / WhatsApp) */}
      <Integrations />

      {/* sector filter — staff any of the 5 MSME sectors */}
      <div className="mt-8 flex flex-wrap gap-2">
        {sectors.map((s) => (
          <button key={s} onClick={() => setSector(s)}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold transition deva"
            style={sector === s ? { background: "#16140F", color: "#fff", borderColor: "#16140F" } : { borderColor: "var(--line, #e5e1d8)", color: "#555" }}>
            {s === "All" ? t("wfx.allSectors") : s}
          </button>
        ))}
      </div>

      {/* employee catalog */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => {
          const Icon = roleIcon(e.icon);
          return (
          <button key={e.id} onClick={() => { setCustom(false); setSel(e); requestAnimationFrame(() => runRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
            className="card group p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md" style={sel?.id === e.id ? { boxShadow: `0 0 0 2px ${e.accent}` } : {}}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: `${e.accent}1a`, color: e.accent }}><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold text-ink deva">{e.title}</div>
                <div className="truncate text-xs text-muted deva">{e.name} · {e.dept}</div>
              </div>
            </div>
            <p className="mt-2.5 line-clamp-2 text-sm text-graphite deva">{e.tagline}</p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {e.skills.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-graphite">{SKILL_LABEL[s] || s}</span>)}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: e.accent }}><Zap className="h-3.5 w-3.5" /> {t("wfx.hire")}</span>
              <span className="text-[11px] font-medium text-muted">{e.functions?.length || 0} {t("wfx.functionsShort")}</span>
            </div>
          </button>
          );
        })}

        {/* design-your-own */}
        <button onClick={() => { setSel(null); setCustom(true); requestAnimationFrame(() => runRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
          className="card group flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line p-4 text-center transition hover:-translate-y-0.5" style={custom ? { boxShadow: "0 0 0 2px #4B5563" } : {}}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist"><Plus className="h-5 w-5 text-graphite" /></span>
          <div className="text-[15px] font-bold text-ink deva">{t("wfx.customTitle")}</div>
          <p className="text-xs text-muted deva">{t("wfx.customSub")}</p>
        </button>
      </div>

      {/* task / run panel */}
      <div ref={runRef} className="mt-8 scroll-mt-24">
        <AnimatePresence mode="wait">
          {sel && <TaskPanel key={sel.id} employee={sel} onRan={bump} />}
          {custom && <CustomPanel key="custom" onRan={bump} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── assign a task to a catalog employee, run it, show the deliverable + integration ── */
function TaskPanel({ employee, onRan }: { employee: Employee; onRan: () => void }) {
  const { t, lang } = useApp();
  const [task, setTask] = useState(employee.samples[0] || "");
  const [fn, setFn] = useState<string | null>(null); // selected depth function
  const [run, setRun] = useState<EmployeeRun | null>(null);
  const [busy, setBusy] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setTask(employee.samples[0] || ""); setFn(null); setRun(null); }, [employee.id]);
  // flow down to the answer when a task is assigned
  useEffect(() => { if (busy || run) requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [busy, run]);
  const activeFn = employee.functions?.find((f) => f.id === fn) || null;

  async function assign() {
    if (!task.trim() || busy) return;
    setBusy(true); setRun(null);
    try {
      const r = await assignEmployeeTask(employee.id, { task: task.trim(), function: fn || undefined, today: new Date().toDateString(), language: lang.name });
      setRun(r);
      hire({ id: employee.id, title: employee.title, name: employee.name, icon: employee.icon, accent: employee.accent });
      recordRun({ employeeId: employee.id, title: employee.title, icon: employee.icon, accent: employee.accent, task: task.trim(), headline: r.result?.headline || "Completed" });
      onRan();
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="card p-5" style={{ borderColor: `${employee.accent}55` }}>
        <div className="flex items-center gap-3">
          {(() => { const Icon = roleIcon(employee.icon); return <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl" style={{ background: `${employee.accent}1a`, color: employee.accent }}><Icon className="h-6 w-6" /></span>; })()}
          <div className="min-w-0">
            <div className="text-lg font-bold text-ink deva">{employee.title} <span className="text-sm font-normal text-muted">· {employee.name}</span></div>
            <div className="text-xs text-muted deva">{employee.sector} · {employee.subSector}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-graphite deva">{employee.jd}</p>

        {/* depth functions — the role's concrete duties, each a callable workflow */}
        {employee.functions?.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted deva">{t("wfx.functions")}</div>
            <div className="flex flex-wrap gap-1.5">
              {employee.functions.map((f) => (
                <button key={f.id} title={f.desc} onClick={() => setFn(fn === f.id ? null : f.id)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition deva"
                  style={fn === f.id ? { background: employee.accent, color: "#fff", borderColor: employee.accent } : { borderColor: "var(--line,#e5e1d8)", color: "#555" }}>
                  {f.name}
                </button>
              ))}
            </div>
            {activeFn && <p className="mt-2 text-xs text-graphite deva"><b>{activeFn.name}:</b> {activeFn.desc}</p>}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {employee.samples.map((s, i) => (
            <button key={i} onClick={() => setTask(s)} className="rounded-full border border-line bg-mist/50 px-3 py-1 text-xs text-graphite transition hover:bg-mist deva">{s.length > 46 ? s.slice(0, 44) + "…" : s}</button>
          ))}
        </div>

        <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} placeholder={activeFn ? activeFn.desc : t("wfx.taskPh")} className="field mt-3 resize-none deva" />
        <div className="mt-3 flex items-center gap-2">
          <button onClick={assign} disabled={busy || !task.trim()} className="btn-accent text-[15px]" style={{ background: employee.accent }}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("wfx.working").replace("{name}", employee.name)}</> : <><Send className="h-4 w-4" /> {t("wfx.assign")}</>}
          </button>
        </div>
      </div>

      <div ref={resultRef} className="scroll-mt-24"><RunResult run={run} busy={busy} accent={employee.accent} /></div>
      <Integration employeeId={employee.id} accent={employee.accent} sampleTask={employee.samples[0] || "..."} />
    </motion.div>
  );
}

/* ── design a bespoke employee from a job description ── */
function CustomPanel({ onRan }: { onRan: () => void }) {
  const { t, lang } = useApp();
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [skills, setSkills] = useState<string[]>(["samajh", "study", "samay"]);
  const [task, setTask] = useState("");
  const [run, setRun] = useState<EmployeeRun | null>(null);
  const [busy, setBusy] = useState(false);
  const accent = "#4B5563";
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (busy || run) requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [busy, run]);

  const toggle = (s: string) => setSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  async function assign() {
    if (!task.trim() || !jd.trim() || busy) return;
    setBusy(true); setRun(null);
    const roleTitle = title.trim() || "AI Specialist";
    try {
      const r = await assignEmployeeTask("custom", { task: task.trim(), today: new Date().toDateString(), language: lang.name, custom: { title: roleTitle, jd: jd.trim(), skills } });
      setRun(r);
      hire({ id: "custom:" + roleTitle, title: roleTitle, name: "Custom", icon: "sparkles", accent });
      recordRun({ employeeId: "custom", title: roleTitle, icon: "sparkles", accent, task: task.trim(), headline: r.result?.headline || "Completed" });
      onRan();
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink deva"><Building2 className="h-4 w-4" /> {t("wfx.customTitle")}</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("wfx.roleTitle")} className="field deva" />
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={3} placeholder={t("wfx.jdPh")} className="field mt-3 resize-none deva" />
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-graphite deva">{t("wfx.giveSkills")}</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SKILLS.map((s) => (
              <button key={s} onClick={() => toggle(s)} className="rounded-full px-3 py-1 text-xs font-semibold transition deva"
                style={skills.includes(s) ? { background: accent, color: "#fff" } : { background: "#eee", color: "#555" }}>{SKILL_LABEL[s] || s}</button>
            ))}
          </div>
        </div>
        <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={2} placeholder={t("wfx.taskPh")} className="field mt-3 resize-none deva" />
        <button onClick={assign} disabled={busy || !task.trim() || !jd.trim()} className="btn-accent mt-3 text-[15px]" style={{ background: accent }}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("wfx.hiring")}</> : <><Zap className="h-4 w-4" /> {t("wfx.hireRun")}</>}
        </button>
      </div>
      <div ref={resultRef} className="scroll-mt-24"><RunResult run={run} busy={busy} accent={accent} /></div>
    </motion.div>
  );
}

/* Fetch a generated PDF/Word for a deliverable and download it. */
async function saveDoc(title: string, text: string, format: "pdf" | "docx") {
  const blob = await generateDoc(title, text, format);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${(title || "document").replace(/[^a-z0-9]+/gi, "_").slice(0, 40)}.${format}`; a.click();
  URL.revokeObjectURL(url);
}

/* ── shared: the plan chips, per-step summaries, and final deliverable ── */
function RunResult({ run, busy, accent }: { run: EmployeeRun | null; busy: boolean; accent: string }) {
  const { t } = useApp();
  const [docBusy, setDocBusy] = useState<"" | "pdf" | "docx">("");
  const doExport = async (fmt: "pdf" | "docx") => {
    if (!run?.result?.deliverable) return;
    setDocBusy(fmt);
    try { await saveDoc(run.docKind || run.employee?.title || "document", clean(run.result.deliverable), fmt); }
    finally { setDocBusy(""); }
  };
  return (
    <AnimatePresence mode="wait">
      {busy ? (
        <motion.div key="busy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="card flex items-center gap-3 p-4">
          <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink text-white"><BrandMark className="h-4 w-4" /></motion.span>
          <span className="text-sm text-graphite deva">{t("wfx.thinking")}</span>
        </motion.div>
      ) : run ? (
        <ResultBody key="result" run={run} accent={accent} docBusy={docBusy} doExport={doExport} />
      ) : null}
    </AnimatePresence>
  );
}

/* the finished-run body — separated so it can animate in as one unit */
function ResultBody({ run, accent, docBusy, doExport }: { run: EmployeeRun; accent: string; docBusy: "" | "pdf" | "docx"; doExport: (f: "pdf" | "docx") => void }) {
  const { t } = useApp();
  const r = run.result;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="space-y-3">
      {run.function && (
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${accent}1a`, color: accent }}>
          <Zap className="h-3.5 w-3.5" /> {t("wfx.ranFunction")}: {run.function.name}
        </div>
      )}
      {run.plan?.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink deva"><BrandMark className="h-4 w-4" /> {t("wfx.planTitle")}</div>
          <div className="flex flex-wrap items-center gap-1">
            {run.plan.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="px-0.5 text-muted">→</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist/60 px-2.5 py-1 text-xs font-medium text-graphite">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#138A72]" /> {SKILL_LABEL[s.agent] || s.agent}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      {r && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5" style={{ borderColor: `${accent}55`, boxShadow: `0 0 0 1px ${accent}22` }}>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: accent }}><Zap className="h-4 w-4" /> {t("wfx.doneForYou")}</div>
          <h3 className="text-lg font-bold text-ink deva">{r.headline}</h3>
          {r.summary && <p className="mt-1 text-sm text-graphite deva">{r.summary}</p>}
          {r.deliverable && (
            <div className="mt-3"><CopyBlock text={clean(r.deliverable)} /><ActionBar title={r.headline} text={clean(r.deliverable)} accent={accent} /></div>
          )}
          {r.actions && r.actions.length > 0 && (
            <ul className="mt-3 space-y-1">
              {r.actions.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-graphite deva"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: accent }} /> <span>{linkify(a)}</span></li>)}
            </ul>
          )}

          {/* autonomous scheduling — dated follow-ups the agent set, one-tap to calendar */}
          {r.reminders && r.reminders.length > 0 && (
            <div className="mt-4 border-t border-line/70 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink deva"><CalendarPlus className="h-4 w-4" style={{ color: accent }} /> {t("wfx.scheduled")}</div>
              <ul className="space-y-1">
                {r.reminders.map((rm, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm text-graphite deva">
                    <span>{rm.title}</span>
                    {rm.when && <span className="flex-none rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-muted">{rm.when}</span>}
                  </li>
                ))}
              </ul>
              <button onClick={() => downloadICS(r.reminders!.map((rm) => ({ title: rm.title, deadline: parseWhen(rm.when).toISOString() })), "saarthi-followups.ics")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-mist" style={{ borderColor: `${accent}55`, color: accent }}>
                <CalendarPlus className="h-3.5 w-3.5" /> {t("wfx.addCal")}
              </button>
            </div>
          )}

          {/* ready-to-file document export (project report / Samadhaan / bid / export docs…) */}
          {run.docKind && run.result?.deliverable && (
            <div className="mt-4 border-t border-line/70 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink deva"><FileText className="h-4 w-4" style={{ color: accent }} /> {t("wfx.docReady").replace("{kind}", run.docKind)}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => doExport("pdf")} disabled={docBusy !== ""} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-mist" style={{ borderColor: `${accent}55`, color: accent }}>
                  {docBusy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
                </button>
                <button onClick={() => doExport("docx")} disabled={docBusy !== ""} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-mist" style={{ borderColor: `${accent}55`, color: accent }}>
                  {docBusy === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Word
                </button>
              </div>
            </div>
          )}

          {/* auto-generated integration artefacts (Tally XML / e-way JSON) */}
          {run.artifacts && run.artifacts.length > 0 && (
            <div className="mt-4 border-t border-line/70 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink deva"><Download className="h-4 w-4" style={{ color: accent }} /> {t("wfx.artifacts")}</div>
              <div className="flex flex-wrap gap-2">
                {run.artifacts.map((a, i) => (
                  <button key={i} onClick={() => dl(a.filename, a.content, a.mime)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-mist" style={{ borderColor: `${accent}55`, color: accent }}>
                    <Download className="h-3.5 w-3.5" /> {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* auto-validated GSTINs */}
          {run.gstinChecks && run.gstinChecks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {run.gstinChecks.map((gc, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${gc.valid ? "bg-[#138A72]/10 text-[#0f6e5b]" : "bg-[#C0453B]/10 text-[#a53a31]"}`}>
                  {gc.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  <span className="font-mono">{gc.gstin}</span> {gc.valid ? (gc.state || t("wfx.gstinOk")) : t("wfx.gstinBad")}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── integration snippet: how an org wires this employee into its own systems ── */
function Integration({ employeeId, accent, sampleTask }: { employeeId: string; accent: string; sampleTask: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://getsaarthi.vercel.app";
  const url = `${origin}/api/employees/${employeeId}/task`;
  const snippet = useMemo(() => `# Assign a task to your AI employee from any system (ERP, cron, Zapier…)
curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${DEMO_API_KEY}" \\
  -d '{"task": "${sampleTask.replace(/"/g, '\\"').slice(0, 60)}…", "language": "English"}'
# → returns the plan, each step, and the finished deliverable as JSON`, [url, sampleTask]);

  return (
    <div className="card p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-sm font-semibold text-ink deva">
        <Code2 className="h-4 w-4" style={{ color: accent }} /> {t("wfx.integrate")}
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted deva">{t("wfx.integrateSub")}</p>
          <CopyBlock text={snippet} />
          <p className="text-xs text-muted deva">{t("wfx.integrateNote")}</p>
        </div>
      )}
    </div>
  );
}

/* ── Your Fleet: hired employees, tasks completed, org API key & usage ── */
function FleetDashboard({ me, tick, onChange }: { me: WorkforceMe | null; tick: number; onChange: () => void }) {
  const { t } = useApp();
  const hired: HiredEmployee[] = useMemo(() => getHired(), [tick]);
  const runs: FleetRun[] = useMemo(() => getRuns(), [tick]);
  const tenant = me?.tenant;

  return (
    <div className="mt-6 card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-ink deva"><Building2 className="h-4 w-4" /> {t("wfx.fleetTitle")}</div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {hired.length} {t("wfx.fleetHired")}</span>
          <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> {runs.length} {t("wfx.fleetTasks")}</span>
        </div>
      </div>

      {/* org / API key strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-mist/50 p-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><KeyRound className="h-4 w-4" /> {tenant?.tenant || "Open Demo"}</span>
        <code className="rounded-md bg-paper px-2 py-1 text-xs text-graphite">x-api-key: {DEMO_API_KEY}</code>
        {tenant && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-graphite">{tenant.plan} · {tenant.runs} {t("wfx.fleetApiRuns")}</span>}
        <span className="text-[11px] text-muted">{me?.enforced ? t("wfx.fleetEnforced") : t("wfx.fleetOpen")}</span>
      </div>

      {hired.length === 0 ? (
        <p className="text-sm text-muted deva">{t("wfx.fleetEmpty")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {hired.map((e) => {
            const last = runs.find((r) => r.title === e.title);
            const Icon = roleIcon(e.icon);
            return (
              <div key={e.id} className="group relative flex items-center gap-2.5 rounded-2xl border border-line p-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg" style={{ background: `${e.accent}1a`, color: e.accent }}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink deva">{e.title}</div>
                  <div className="truncate text-[11px] text-muted deva">{last ? last.headline : t("wfx.fleetIdle")}</div>
                </div>
                <button onClick={() => { fire(e.id); onChange(); }} title={t("wfx.fleetRelease")} className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-mist"><X className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
