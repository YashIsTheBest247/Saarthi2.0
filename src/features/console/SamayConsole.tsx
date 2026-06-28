import { useEffect, useState } from "react";
import {
  LayoutDashboard, Target, ListTodo, Timer, Trophy, Plus, Trash2, Check, Flag,
  CalendarPlus, Download, Play, Pause, RotateCcw, AlertTriangle, LifeBuoy, Flame, X,
} from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { BrandMark } from "../../components/Logo";
import { Emergency } from "../Emergency";
import { Select } from "../../components/Select";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Samay } from "../Samay";
import { confetti } from "../../lib/confetti";
import {
  Task, Goal, Habit, Recur, onTimeProb, realityCheck, nextRecurrence,
  isOverdue, inToday, inWeek, rescue, gcalLink, downloadICS, todayStr, habitStreak,
} from "./samayLib";

const ACCENT = "#2E3A7B";
const PRIOS = ["High", "Medium", "Low"];
const prioColor = (p: string) => (p === "High" ? "#B23A2E" : p === "Medium" ? "#B07A1E" : "#2E6F52");
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDeadline = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const WORK = 25 * 60, BREAK = 5 * 60;

export function SamayConsole({ onBack }: { onBack: () => void }) {
  const [tasks, setTasks] = useLocal<Task[]>("saarthi.samay.tasks", []);
  const [goals, setGoals] = useLocal<Goal[]>("saarthi.samay.goals", []);
  const [habits, setHabits] = useLocal<Habit[]>("saarthi.samay.habits", []);
  const [focus, setFocus] = useLocal("saarthi.samay.focus", { sessions: 0, streak: 0, lastDate: "" });

  const [form, setForm] = useState<{ title: string; priority: string; deadline: string; estimateMins: string; recur: Recur }>({ title: "", priority: "High", deadline: "", estimateMins: "", recur: "none" });
  const [filter, setFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [editing, setEditing] = useState<number | null>(null);
  const [rescueOpen, setRescueOpen] = useState(false);

  // pomodoro runtime
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secs, setSecs] = useState(WORK);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (secs <= 0) {
      if (mode === "work") {
        confetti(70);
        const today = todayStr();
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = focus.lastDate === today ? focus.streak : focus.lastDate === y ? focus.streak + 1 : 1;
        setFocus({ sessions: focus.sessions + 1, streak, lastDate: today });
        setMode("break"); setSecs(BREAK);
      } else { setMode("work"); setSecs(WORK); }
      setRunning(false);
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, secs, mode]); // eslint-disable-line

  /* task ops */
  function addTask() {
    if (!form.title.trim()) return;
    setTasks([...tasks, { id: uid(), title: form.title, priority: form.priority as Task["priority"], done: false, deadline: form.deadline || undefined, estimateMins: form.estimateMins ? parseInt(form.estimateMins) : undefined, recur: form.recur }]);
    setForm({ title: "", priority: "High", deadline: "", estimateMins: "", recur: "none" });
  }
  function toggleDone(t: Task) {
    if (!t.done) {
      confetti(60);
      if (t.recur && t.recur !== "none" && t.deadline) {
        setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)).concat([{ ...t, id: uid(), done: false, deadline: nextRecurrence(t.deadline, t.recur) }]));
      } else setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)));
    } else setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: false } : x)));
  }
  const setDeadline = (id: number, v: string) => setTasks(tasks.map((x) => (x.id === id ? { ...x, deadline: v || undefined } : x)));

  const rc = realityCheck(tasks);
  const open = tasks.filter((t) => !t.done).length;
  const overdue = tasks.filter(isOverdue).length;
  const dueToday = tasks.filter((t) => !t.done && inToday(t)).length;
  const next3 = rescue(tasks);
  const filtered = tasks.filter((t) => (filter === "all" ? true : filter === "today" ? inToday(t) : filter === "week" ? inWeek(t) : isOverdue(t)));
  const counts = {
    all: tasks.length,
    today: tasks.filter(inToday).length,
    week: tasks.filter(inWeek).length,
    overdue: tasks.filter(isOverdue).length,
  };

  /* ----------------------------- TASKS TAB ----------------------------- */
  const TasksTab = (
    <Wrap>
      <H title="Task board" sub="Add deadlines & estimates — Smriti forecasts whether you'll make it." />

      {rc.total > 0 && (
        <div className="card mb-5 flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 flex-none" style={{ color: rc.risk ? "#B23A2E" : "#2E6F52" }} />
          <div className="text-[15px] text-graphite">
            <span className="font-semibold">Reality-Check:</span> you'll finish <b>{rc.onTime}/{rc.total}</b> on time{rc.risk ? <> — <span className="font-semibold text-danger">{rc.risk} at risk</span></> : ""}. <span className="text-muted">~{rc.totalHrs} hrs of work queued.</span>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New task" className="field" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={PRIOS.map((p) => ({ value: p, label: p }))} ariaLabel="Priority" />
            <input value={form.estimateMins} onChange={(e) => setForm({ ...form, estimateMins: e.target.value })} placeholder="mins" inputMode="numeric" className="field" />
            <Select value={form.recur} onChange={(v) => setForm({ ...form, recur: v as Recur })} ariaLabel="Repeat"
              options={[{ value: "none", label: "Once" }, { value: "daily", label: "Daily" }, { value: "weekdays", label: "Weekdays" }, { value: "weekly", label: "Weekly" }]} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="field max-w-xs" />
          <button onClick={addTask} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["all", "today", "week", "overdue"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors ${filter === f ? "border-transparent text-white" : "border-line bg-paper text-graphite hover:bg-mist"}`} style={filter === f ? { background: ACCENT } : undefined}>
            {f === "week" ? "This week" : f} <span className="opacity-70">{counts[f]}</span>
          </button>
        ))}
        {tasks.some((t) => t.deadline) && <button onClick={() => downloadICS(tasks)} className="btn-ghost ml-auto text-sm"><Download className="h-4 w-4" /> Export .ics</button>}
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? <p className="text-sm text-muted">No tasks here.</p> : filtered.map((t) => {
          const prob = onTimeProb(t);
          return (
            <div key={t.id} className={`card p-4 ${t.done ? "opacity-55" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => toggleDone(t)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2" style={{ borderColor: t.done ? "#2E6F52" : "#DCD6CA", background: t.done ? "#2E6F52" : "transparent" }}>{t.done && <Check className="h-3.5 w-3.5 text-white" />}</span>
                  <span className={`truncate text-[15px] text-graphite ${t.done ? "line-through" : ""}`}>{t.title}</span>
                </button>
                <div className="flex flex-none items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: prioColor(t.priority) }}><Flag className="h-3 w-3" />{t.priority}</span>
                  <button onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-9 text-xs">
                {editing === t.id ? (
                  <input type="datetime-local" autoFocus value={toLocalInput(t.deadline)} onChange={(e) => setDeadline(t.id, e.target.value)} onBlur={() => setEditing(null)} className="rounded-lg border border-line px-2 py-1" />
                ) : (
                  <button onClick={() => setEditing(t.id)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isOverdue(t) ? "border-danger/40 text-danger" : "border-line text-graphite"}`}>
                    <CalendarPlus className="h-3 w-3" /> {t.deadline ? fmtDeadline(t.deadline) : "set deadline"}
                  </button>
                )}
                {t.recur && t.recur !== "none" && <span className="rounded-full bg-mist px-2 py-1 text-graphite">{t.recur}</span>}
                {t.estimateMins ? <span className="text-faint">{t.estimateMins}m</span> : null}
                {prob != null && !t.done && <span className="rounded-full px-2 py-1 font-semibold" style={{ background: prob >= 70 ? "#E4F1EA" : prob >= 40 ? "#F7EEDB" : "#F7E7E5", color: prob >= 70 ? "#2E6F52" : prob >= 40 ? "#B07A1E" : "#B23A2E" }}>{prob}% on time</span>}
                {t.deadline && <a href={gcalLink(t)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-faint hover:text-ink"><CalendarPlus className="h-3 w-3" /> Google Cal</a>}
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );

  /* ----------------------------- FOCUS TAB ----------------------------- */
  const total = mode === "work" ? WORK : BREAK;
  const ringPct = (total - secs) / total;
  const r = 54, c = 2 * Math.PI * r;
  const FocusTab = (
    <Wrap>
      <H title="Focus timer" sub="Pomodoro focus sessions build your streak. 25 min work · 5 min break." />
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="card flex flex-col items-center p-8">
          <div className="relative h-44 w-44">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" stroke="#EEF0F6" strokeWidth="9" />
              <circle cx="60" cy="60" r={r} fill="none" stroke={mode === "work" ? ACCENT : "#2E6F52"} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - ringPct * c} style={{ transition: "stroke-dashoffset 0.9s linear" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="display text-4xl font-bold">{pad(Math.floor(secs / 60))}:{pad(secs % 60)}</div>
              <div className="text-xs uppercase tracking-wide text-muted">{mode}</div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setRunning((x) => !x)} className="btn-accent text-[15px]" style={{ background: ACCENT }}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? "Pause" : "Start"}</button>
            <button onClick={() => { setRunning(false); setMode("work"); setSecs(WORK); }} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-6 text-center"><Flame className="mx-auto h-7 w-7 text-clay-500" /><div className="display mt-2 text-3xl font-bold" style={{ color: ACCENT }}>{focus.streak}</div><div className="text-sm text-muted">day focus streak</div></div>
          <div className="card p-6 text-center"><Timer className="mx-auto h-7 w-7" style={{ color: ACCENT }} /><div className="display mt-2 text-3xl font-bold">{focus.sessions}</div><div className="text-sm text-muted">total focus sessions</div></div>
        </div>
      </div>
    </Wrap>
  );

  /* ----------------------------- GOALS TAB ----------------------------- */
  const [gForm, setGForm] = useState({ title: "", target: "" });
  const [hName, setHName] = useState("");
  const GoalsTab = (
    <Wrap>
      <H title="Goals & habits" sub="Bigger ambitions and daily habits, tracked with streaks." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Trophy className="h-4 w-4" style={{ color: ACCENT }} /> Goals</h3>
          <div className="card mb-3 p-4">
            <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
              <input value={gForm.title} onChange={(e) => setGForm({ ...gForm, title: e.target.value })} placeholder="Goal (e.g. Read 12 books)" className="field" />
              <input value={gForm.target} onChange={(e) => setGForm({ ...gForm, target: e.target.value })} placeholder="target" inputMode="numeric" className="field" />
              <button onClick={() => { if (!gForm.title.trim()) return; setGoals([...goals, { id: uid(), title: gForm.title, target: parseInt(gForm.target) || 1, progress: 0 }]); setGForm({ title: "", target: "" }); }} className="btn-accent" style={{ background: ACCENT }}><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="card p-4">
                <div className="flex items-center justify-between"><span className="font-medium text-ink">{g.title}</span><div className="flex items-center gap-2"><button onClick={() => setGoals(goals.map((x) => x.id === g.id ? { ...x, progress: Math.max(0, x.progress - 1) } : x))} className="h-6 w-6 rounded-full border border-line">−</button><span className="text-sm tabular-nums">{g.progress}/{g.target}</span><button onClick={() => { const np = Math.min(g.target, g.progress + 1); if (np === g.target && g.progress < g.target) confetti(50); setGoals(goals.map((x) => x.id === g.id ? { ...x, progress: np } : x)); }} className="h-6 w-6 rounded-full border border-line">+</button><button onClick={() => setGoals(goals.filter((x) => x.id !== g.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button></div></div>
                <div className="mt-2 h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${(g.progress / g.target) * 100}%`, background: ACCENT }} /></div>
              </div>
            ))}
            {goals.length === 0 && <p className="text-sm text-muted">No goals yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Flame className="h-4 w-4 text-clay-500" /> Habits</h3>
          <div className="card mb-3 p-4">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Habit (e.g. Walk 30 min)" className="field" />
              <button onClick={() => { if (!hName.trim()) return; setHabits([...habits, { id: uid(), name: hName, dates: [] }]); setHName(""); }} className="btn-accent" style={{ background: ACCENT }}><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="space-y-2">
            {habits.map((h) => {
              const today = todayStr(); const has = h.dates.includes(today);
              return (
                <div key={h.id} className="card flex items-center justify-between gap-3 p-4">
                  <button onClick={() => { setHabits(habits.map((x) => x.id === h.id ? { ...x, dates: has ? x.dates.filter((d) => d !== today) : [...x.dates, today] } : x)); if (!has) confetti(36); }} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ borderColor: has ? "#2E6F52" : "#DCD6CA", background: has ? "#2E6F52" : "transparent" }}>{has && <Check className="h-4 w-4 text-white" />}</span>
                    <span className="font-medium text-ink">{h.name}</span>
                  </button>
                  <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 text-sm text-clay-600"><Flame className="h-3.5 w-3.5" />{habitStreak(h.dates)}</span><button onClick={() => setHabits(habits.filter((x) => x.id !== h.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button></div>
                </div>
              );
            })}
            {habits.length === 0 && <p className="text-sm text-muted">No habits yet.</p>}
          </div>
        </div>
      </div>
    </Wrap>
  );

  /* ----------------------------- DASHBOARD ----------------------------- */
  const dashboard = (go: (id: string) => void) => (
    <Wrap>
      <H title="Productivity dashboard" sub="Your daily standup, forecast and the one thing to do next." />

      {/* daily standup */}
      <div className="card mb-5 overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: ACCENT }} />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex-none" style={{ color: ACCENT }}><BrandMark className="h-5 w-5" /></span>
            <p className="text-[15px] text-graphite">
              <span className="font-semibold">Daily standup:</span> {dueToday} due today, {overdue} overdue.{" "}
              {next3[0] ? <>Start with <b>{next3[0].title}</b>.</> : "Nothing urgent — add a task to begin."}
            </p>
          </div>
          <button onClick={() => setRescueOpen((x) => !x)} className="btn px-4 py-2 text-sm bg-clay-500 text-white hover:bg-clay-600"><LifeBuoy className="h-4 w-4" /> Rescue mode</button>
        </div>
        {rescueOpen && (
          <div className="border-t border-line bg-mist/60 p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">I'm overwhelmed — just do these 3:</div>
            {next3.length ? <ol className="space-y-2">{next3.map((t, i) => <li key={t.id} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span><span className="text-[15px] text-graphite">{t.title}</span>{isOverdue(t) && <span className="text-xs font-semibold text-danger">overdue</span>}</li>)}</ol> : <p className="text-sm text-muted">No open tasks — you're clear!</p>}
          </div>
        )}
      </div>

      <StatTiles accent={ACCENT} tiles={[
        { v: open, l: "Open tasks" },
        { v: dueToday, l: "Due today" },
        { v: overdue, l: "Overdue" },
        { v: focus.streak, l: "Focus streak (days)" },
      ]} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">On-time forecast</h3>
          {rc.total ? <p className="text-[15px] text-graphite">You'll finish <b>{rc.onTime}/{rc.total}</b> deadlines on time{rc.risk ? <> — <span className="font-semibold text-danger">{rc.risk} at risk</span>. Consider moving or cutting some.</> : ". You're on track. 🎯"}</p> : <p className="text-sm text-muted">Add tasks with deadlines to see your forecast.</p>}
          <button onClick={() => go("tasks")} className="btn-accent mt-4 text-sm" style={{ background: ACCENT }}>Open task board</button>
        </div>
        <div className="card flex flex-col justify-between p-6">
          <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Plan a brain-dump</h3><p className="text-[15px] text-graphite">Dump tasks, an email or syllabus and Smriti prioritizes, schedules and drafts the work.</p></div>
          <button onClick={() => go("plan")} className="btn-accent mt-4 w-fit text-sm" style={{ background: ACCENT }}>Plan my work</button>
        </div>
      </div>
    </Wrap>
  );

  const modules: ConsoleModule[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, render: (go) => dashboard(go) },
    { id: "plan", label: "Plan", icon: Target, render: () => <Wrap><Samay embedded /></Wrap> },
    { id: "tasks", label: "Task board", icon: ListTodo, render: () => TasksTab },
    { id: "focus", label: "Focus", icon: Timer, render: () => FocusTab },
    { id: "goals", label: "Goals & habits", icon: Trophy, render: () => GoalsTab },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="samay" /> });
  return <AgentConsole agentKey="samay" platform="Chief of Staff" badge={Target} modules={modules} onBack={onBack} />;
}
