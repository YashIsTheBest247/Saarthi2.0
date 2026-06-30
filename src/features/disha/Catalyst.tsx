import { useState, useRef, useEffect } from "react";
import { FileUp, Send, Loader2, ArrowRight, Target, GraduationCap, BookOpen, Video, Code2, Link as LinkIcon, Download, RotateCcw, Check } from "lucide-react";
import { useApp } from "../../app/AppContext";
import { callFeature } from "../../lib/api";
import { Thinking, MockNote } from "../../components/ui";
import { BrandMark } from "../../components/Logo";
import { extractPdfText } from "../../lib/form16";

const ACCENT = "#6D4AA7";
const STATUS: Record<string, string> = { Strong: "#2E6F52", Moderate: "#C2641F", "Critical gap": "#B23A2E" };
const levelOf = (s: number) => (s >= 70 ? "Advanced" : s >= 40 ? "Intermediate" : "Beginner");
const levelColor = (s: number) => (s >= 70 ? "#2E6F52" : s >= 40 ? "#C2641F" : "#B23A2E");

interface Skill { name: string; importance: string; status: string; candidateLevel: string; targetLevel: string; score: number; feedback?: string }
interface Match { summary: string; skillMatchScore: number; skills: Skill[]; strengths?: string[]; gaps?: { skill: string; why: string; improve?: string }[]; learningPlan?: { phase: string; timeline?: string; focus: string; skills?: string[] }[]; resources?: { skill: string; items: { type: string; title: string; url?: string }[] }[]; _mock?: boolean }
interface Turn { evaluation: { correctness: number; depth: number; relevance: number; note?: string }; nextQuestion: string; skill?: string; difficulty: string; done: boolean; confidence: { clarity: number; structure: number; consistency: number }; _mock?: boolean }

/* ---------- tiny SVG charts (no extra deps) ---------- */
function Radar({ skills }: { skills: Skill[] }) {
  const s = skills.slice(0, 8); const n = s.length; if (n < 3) return null;
  const cx = 150, cy = 140, R = 105;
  const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = s.map((sk, i) => pt(i, (sk.score / 100) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 300 290" className="w-full" style={{ maxHeight: 280 }}>
      {[0.25, 0.5, 0.75, 1].map((g, gi) => <polygon key={gi} points={s.map((_, i) => pt(i, g * R).join(",")).join(" ")} fill="none" stroke="#e3e0da" strokeWidth="1" />)}
      {s.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e3e0da" strokeWidth="1" />; })}
      <polygon points={poly} fill={`${ACCENT}33`} stroke={ACCENT} strokeWidth="2" />
      {s.map((sk, i) => { const [x, y] = pt(i, (sk.score / 100) * R); return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />; })}
      {s.map((sk, i) => { const [x, y] = pt(i, R + 16); return <text key={i} x={x} y={y} textAnchor={x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle"} fontSize="10" fill="#454239">{sk.name.slice(0, 14)}</text>; })}
    </svg>
  );
}
function Bars({ skills }: { skills: Skill[] }) {
  return (
    <div className="space-y-2.5">
      {skills.map((sk, i) => (
        <div key={i}>
          <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-graphite deva">{sk.name}</span><span className="font-semibold" style={{ color: levelColor(sk.score) }}>{sk.score}</span></div>
          <div className="h-2.5 rounded-full bg-mist"><div className="h-2.5 rounded-full" style={{ width: `${sk.score}%`, background: levelColor(sk.score) }} /></div>
        </div>
      ))}
    </div>
  );
}
const RES_ICON: Record<string, typeof Video> = { Video, Docs: BookOpen, Practice: Code2, Course: GraduationCap };

export function Catalyst() {
  const { lang } = useApp();
  const [step, setStep] = useState<"input" | "match" | "interview" | "report">("input");
  const [jd, setJd] = useState(""); const [resume, setResume] = useState("");
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);

  // interview state
  const [msgs, setMsgs] = useState<{ who: "ai" | "you"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [count, setCount] = useState(0);
  const [diff, setDiff] = useState("medium");
  const [answerScores, setAnswerScores] = useState<number[]>([]);
  const [iBusy, setIBusy] = useState(false);
  const [iMock, setIMock] = useState(false);
  const [conf, setConf] = useState({ clarity: 0, structure: 0, consistency: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  // keep the interview chat scrolled to the newest question/answer
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, iBusy]);

  async function onPdf(e: React.ChangeEvent<HTMLInputElement>, set: (s: string) => void) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const txt = await extractPdfText(f); if (txt.trim()) set(txt.trim()); } catch { /* not a text pdf */ }
    e.target.value = "";
  }

  async function analyze() {
    if (!jd.trim() || !resume.trim()) return;
    setBusy(true); setMatch(null);
    try { setMatch(await callFeature<Match>("skillmatch", { jd, resume, language: lang.name })); setStep("match"); }
    catch { /* */ } finally { setBusy(false); }
  }

  const skillNames = () => (match?.skills || []).slice(0, 8).map((s) => s.name).join(", ");
  const history = (extra?: { who: "ai" | "you"; text: string }) => [...msgs, ...(extra ? [extra] : [])].map((m) => `${m.who === "ai" ? "Interviewer" : "Candidate"}: ${m.text}`).join("\n");

  async function startInterview() {
    setStep("interview"); setMsgs([]); setCount(0); setAnswerScores([]); setIBusy(true);
    try {
      const t = await callFeature<Turn>("interview", { skills: skillNames(), history: "", count: 0, language: lang.name });
      setIMock(!!t._mock); setDiff(t.difficulty || "medium");
      setMsgs([{ who: "ai", text: t.nextQuestion }]); setCount(1);
    } catch { /* */ } finally { setIBusy(false); }
  }

  async function answer() {
    if (!input.trim() || iBusy) return;
    const a = input.trim(); setInput("");
    const withYou: { who: "ai" | "you"; text: string }[] = [...msgs, { who: "you", text: a }];
    setMsgs(withYou); setIBusy(true);
    try {
      const t = await callFeature<Turn>("interview", { skills: skillNames(), history: history({ who: "you", text: a }), count, language: lang.name });
      const e = t.evaluation || { correctness: 0.5, depth: 0.5, relevance: 0.5 };
      const sc = e.correctness * 0.5 + e.depth * 0.3 + e.relevance * 0.2;
      const scores = [...answerScores, sc]; setAnswerScores(scores);
      setDiff(t.difficulty || diff);
      if (t.done || count >= 5) {
        setConf(t.confidence || { clarity: 0.7, structure: 0.7, consistency: 0.7 });
        finishReport(scores, t.confidence || { clarity: 0.7, structure: 0.7, consistency: 0.7 });
      } else {
        setMsgs([...withYou, { who: "ai", text: t.nextQuestion }]); setCount(count + 1);
      }
    } catch { /* */ } finally { setIBusy(false); }
  }

  const [scores, setScores] = useState({ assessment: 0, confidence: 0, final: 0 });
  function finishReport(ansScores: number[], confidence: { clarity: number; structure: number; consistency: number }) {
    const assessment = ansScores.length ? Math.round((ansScores.reduce((a, b) => a + b, 0) / ansScores.length) * 100) : 0;
    const confScore = Math.round((confidence.clarity * 0.4 + confidence.structure * 0.3 + confidence.consistency * 0.3) * 100);
    const skillMatch = match?.skillMatchScore || 0;
    const final = Math.round(skillMatch * 0.4 + assessment * 0.4 + confScore * 0.2);
    setScores({ assessment, confidence: confScore, final });
    setStep("report");
  }

  function reset() { setStep("input"); setMatch(null); setMsgs([]); setCount(0); setAnswerScores([]); }

  async function downloadReport() {
    if (!match) return;
    const payload = {
      title: "Catalyst Skill Report",
      scores: { final: scores.final, skillMatch: match.skillMatchScore, assessment: scores.assessment, confidence: scores.confidence },
      summary: match.summary,
      skills: match.skills,
      strengths: match.strengths,
      gaps: match.gaps,
      learningPlan: match.learningPlan,
      resources: match.resources,
    };
    try {
      const res = await fetch("/api/catalyst-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { const b = await res.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "Catalyst-Skill-Report.pdf"; a.click(); URL.revokeObjectURL(u); }
    } catch { /* */ }
  }

  const Stepper = () => (
    <div className="mb-5 flex items-center gap-2 text-xs font-semibold">
      {["Input", "Skill match", "Interview", "Report"].map((s, i) => {
        const idx = ["input", "match", "interview", "report"].indexOf(step);
        const on = i <= idx;
        return <div key={s} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: on ? ACCENT : "#cbc6bd" }}>{i + 1}</span><span className={on ? "text-ink" : "text-faint"}>{s}</span>{i < 3 && <span className="mx-1 text-faint">→</span>}</div>;
      })}
    </div>
  );

  return (
    <div>
      <div className="mb-1 flex items-center gap-2"><span className="inline-flex h-5 w-5" style={{ color: ACCENT }}><BrandMark className="h-5 w-5" /></span><h2 className="display text-2xl font-bold">Catalyst AI · Skill Assessment</h2></div>
      <p className="mb-5 text-[15px] text-muted deva">Beyond resumes — extract skills, find real gaps, run an adaptive SkillLens interview, and get a scored, personalized learning roadmap.</p>
      <Stepper />

      {/* STEP 1 — INPUT */}
      {step === "input" && (
        <div className="grid gap-4 md:grid-cols-2">
          {[["Job Description", jd, setJd, "Paste the JD here…"], ["Your Resume", resume, setResume, "Paste your resume here…"]].map(([label, val, set, ph], i) => (
            <div key={i} className="card p-5">
              <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-graphite">{label as string}</span>
                <label className="btn-ghost cursor-pointer text-xs"><FileUp className="h-3.5 w-3.5" /> Upload PDF<input type="file" accept="application/pdf,.pdf" onChange={(e) => onPdf(e, set as (s: string) => void)} className="hidden" /></label>
              </div>
              <textarea value={val as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} rows={8} placeholder={ph as string} className="field resize-none text-sm deva" />
            </div>
          ))}
          <div className="md:col-span-2">
            <button onClick={analyze} disabled={busy || !jd.trim() || !resume.trim()} className="btn-accent text-[15px]" style={{ background: ACCENT }}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><BrandMark className="h-4 w-4" /> Analyze skills</>}</button>
          </div>
          {busy && <div className="md:col-span-2 card p-8"><Thinking label="Extracting & matching skills…" /></div>}
        </div>
      )}

      {/* STEP 2 — MATCH */}
      {step === "match" && match && (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex flex-none items-end gap-2"><span className="display text-5xl font-bold" style={{ color: levelColor(match.skillMatchScore) }}>{match.skillMatchScore}</span><span className="mb-1 text-sm text-muted">/ 100 skill match</span></div>
              <p className="min-w-0 flex-1 text-[15px] text-graphite deva">{match.summary}</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-6"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Skill radar</h3><Radar skills={match.skills} /></div>
            <div className="card p-6"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Per-skill match</h3><Bars skills={match.skills} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {match.skills.map((s, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink deva">{s.name}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: STATUS[s.status] || "#888" }}>{s.status}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted"><span style={{ color: levelColor(0) }}>{s.candidateLevel}</span><ArrowRight className="h-3 w-3" /><span className="font-semibold" style={{ color: "#2E6F52" }}>{s.targetLevel}</span><span className="ml-auto font-bold" style={{ color: levelColor(s.score) }}>{s.score}/100</span></div>
                {s.feedback && <p className="mt-1.5 text-sm text-graphite deva">{s.feedback}</p>}
              </div>
            ))}
          </div>
          {match.gaps?.length ? (
            <div className="card p-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Target className="h-4 w-4" style={{ color: "#B23A2E" }} /> Critical gaps</h3>
              <div className="space-y-2">{match.gaps.map((g, i) => <div key={i} className="rounded-2xl border border-line bg-mist/40 p-3.5"><div className="font-semibold text-ink deva">{g.skill}</div><div className="text-sm text-muted deva">{g.why}</div>{g.improve && <div className="mt-1 text-sm deva" style={{ color: ACCENT }}>→ {g.improve}</div>}</div>)}</div>
            </div>
          ) : null}
          <button onClick={startInterview} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Send className="h-4 w-4" /> Start SkillLens interview</button>
          {match._mock && <MockNote text="Sample assessment — add a Gemini/Groq key for a fully tailored one." />}
        </div>
      )}

      {/* STEP 3 — INTERVIEW */}
      {step === "interview" && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-graphite">SkillLens interview · Q{Math.min(count, 5)}/5</span>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: diff === "hard" ? "#B23A2E" : diff === "easy" ? "#2E6F52" : "#C2641F" }}>difficulty: {diff}</span>
          </div>
          <div ref={chatRef} className="max-h-[22rem] space-y-3 overflow-y-auto rounded-2xl bg-mist/40 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.who === "you" ? "flex justify-end" : "flex gap-2"}>
                {m.who === "ai" && <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-white" style={{ background: ACCENT }}><BrandMark className="h-3.5 w-3.5" /></span>}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm deva ${m.who === "you" ? "rounded-br-md text-white" : "rounded-tl-md border border-line bg-paper text-graphite"}`} style={m.who === "you" ? { background: ACCENT } : undefined}>{m.text}</div>
              </div>
            ))}
            {iBusy && <div className="flex gap-2"><span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-white" style={{ background: ACCENT }}><Loader2 className="h-3.5 w-3.5 animate-spin" /></span><div className="rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm text-muted">SkillLens is evaluating…</div></div>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); answer(); }} className="mt-3 flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" className="field flex-1 deva" disabled={iBusy} />
            <button type="submit" disabled={iBusy || !input.trim()} className="btn-accent" style={{ background: ACCENT }}><Send className="h-4 w-4" /></button>
          </form>
          {iMock && <MockNote text="Sample interview — add a Gemini/Groq key for a real adaptive one." />}
        </div>
      )}

      {/* STEP 4 — REPORT */}
      {step === "report" && match && (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-end gap-3"><span className="display text-6xl font-bold" style={{ color: levelColor(scores.final) }}>{scores.final}</span><div className="mb-2"><div className="text-sm text-muted">overall readiness</div><div className="text-sm font-bold" style={{ color: levelColor(scores.final) }}>{levelOf(scores.final)}</div></div></div>
              <button onClick={downloadReport} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Download PDF report</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[["Skill match", match.skillMatchScore, "× 0.4"], ["Assessment", scores.assessment, "× 0.4"], ["Confidence", scores.confidence, "× 0.2"]].map(([l, v, w], i) => (
                <div key={i} className="rounded-2xl bg-mist/50 p-4"><div className="text-xs uppercase tracking-wide text-muted">{l as string} <span className="text-faint">{w as string}</span></div><div className="display mt-1 text-2xl font-bold" style={{ color: levelColor(v as number) }}>{v as number}</div></div>
              ))}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-6"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Skill radar</h3><Radar skills={match.skills} /></div>
            <div className="card p-6"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Per-skill match</h3><Bars skills={match.skills} /></div>
          </div>
          {match.learningPlan?.length ? (
            <div className="card p-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><GraduationCap className="h-4 w-4" style={{ color: ACCENT }} /> Personalized learning plan</h3>
              <div className="space-y-3">{match.learningPlan.map((p, i) => <div key={i} className="flex gap-3 rounded-2xl border border-line bg-paper p-4"><span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span><div><div className="font-medium text-ink deva">{p.phase} {p.timeline && <span className="text-xs font-semibold text-faint">· {p.timeline}</span>}</div><div className="text-sm text-muted deva">{p.focus}</div>{p.skills?.length ? <div className="mt-1 flex flex-wrap gap-1">{p.skills.map((s, j) => <span key={j} className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite">{s}</span>)}</div> : null}</div></div>)}</div>
            </div>
          ) : null}
          {match.resources?.length ? (
            <div className="card p-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><BookOpen className="h-4 w-4" style={{ color: ACCENT }} /> Learning resources</h3>
              <div className="space-y-4">{match.resources.map((r, i) => (
                <div key={i}><div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>{r.skill}</div>
                  <div className="grid gap-2 sm:grid-cols-2">{r.items.map((it, j) => { const Ic = RES_ICON[it.type] || LinkIcon; const inner = (<><Ic className="h-4 w-4 flex-none" style={{ color: ACCENT }} /><span className="min-w-0 flex-1 truncate text-sm deva">{it.title}</span><span className="text-[10px] font-semibold text-faint">{it.type}</span></>); return it.url ? <a key={j} href={it.url.startsWith("http") ? it.url : `https://${it.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-line bg-mist/40 p-2.5 transition-colors hover:bg-paper hover:border-faint">{inner}</a> : <div key={j} className="flex items-center gap-2 rounded-xl border border-line bg-mist/40 p-2.5">{inner}</div>; })}</div>
                </div>
              ))}</div>
            </div>
          ) : null}
          <button onClick={reset} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Assess another candidate</button>
        </div>
      )}
    </div>
  );
}
