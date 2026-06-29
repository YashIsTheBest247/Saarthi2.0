import { useState } from "react";
import {
  GraduationCap, PenLine, Siren, Sparkles, FileText, FileType2, Presentation,
  Loader2, CalendarClock, CheckCircle2, CalendarPlus, Send, Download,
} from "lucide-react";
import { AgentConsole, ConsoleModule } from "../console/AgentConsole";
import { Emergency } from "../Emergency";
import { Select } from "../../components/Select";
import { H, Wrap } from "../console/kit";
import { BrandMark } from "../../components/Logo";
import { useApp } from "../../app/AppContext";
import { callFeature } from "../../lib/api";
import { featureByKey } from "../../lib/features";
import { Thinking, MockNote } from "../../components/ui";
import { sendToSmriti, scheduleReminder, notify, downloadICS } from "../../lib/reminders";

const ACCENT = "#7A4FB0";

interface Section { heading?: string; paragraphs: string[] }
interface StudyContent {
  title: string; subtitle?: string; kind: string;
  sections: Section[]; slides?: { title: string; points: string[] }[];
  references?: string[]; wordCount?: number; _mock?: boolean;
}

const KINDS = ["Essay", "Journal entry", "Report", "Speech", "Study notes", "Presentation"];
const LEVELS = ["School", "High school", "College / University"];
const LENGTHS = [
  { value: "about 300 words", label: "Short (~300 words)" },
  { value: "about 600 words", label: "Medium (~600 words)" },
  { value: "about 1000 words", label: "Long (~1000 words)" },
  { value: "1500 or more words", label: "Detailed (1500+ words)" },
];
const TONES = ["Formal academic", "Reflective", "Persuasive", "Simple & clear"];

const EXPORTS: { fmt: "pdf" | "docx" | "pptx"; label: string; icon: typeof FileText }[] = [
  { fmt: "pdf", label: "PDF", icon: FileText },
  { fmt: "docx", label: "Word (.docx)", icon: FileType2 },
  { fmt: "pptx", label: "PowerPoint (.pptx)", icon: Presentation },
];

const fmtDeadline = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

function Composer() {
  const { lang } = useApp();
  const meta = featureByKey("study");
  const [kind, setKind] = useState("Essay");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("High school");
  const [length, setLength] = useState("about 600 words");
  const [tone, setTone] = useState("Formal academic");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<StudyContent | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handoff(c: StudyContent, dl: string) {
    sendToSmriti({ title: `Submit: ${c.title}`, deadline: dl, priority: "High", estimateMins: 30, source: "Acharya" });
    scheduleReminder(`Submit: ${c.title}`, dl);
    setSent(true);
    await notify("Added to Smriti ✅", `“${c.title}” is on your board — reminder set for ${fmtDeadline(dl)}.`);
  }

  async function write() {
    if (!topic.trim()) return;
    setLoading(true); setContent(null); setSent(false);
    try {
      const c = await callFeature<StudyContent>("study", {
        topic, kind, level, length, tone, deadline: deadline ? fmtDeadline(deadline) : "",
        today: new Date().toDateString(), language: lang.name,
      });
      setContent(c);
      if (deadline) handoff(c, deadline); // after completing, send it to Smriti
    } catch {
      /* graceful: mock fallback handled server-side */
    } finally {
      setLoading(false);
    }
  }

  async function exportDoc(fmt: "pdf" | "docx" | "pptx") {
    if (!content) return;
    setExporting(fmt);
    try {
      const res = await fetch("/api/study/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: fmt, font: "Times New Roman", size: 12 }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${content.title.replace(/[^a-z0-9]+/gi, "_") || "Document"}.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore — keep the UI calm */
    } finally {
      setExporting(null);
    }
  }

  return (
    <Wrap>
      <H title="Write my homework" sub="Tell Acharya what to write and when it's due. You get a polished, human-sounding document — Times New Roman, 12pt — and Smriti reminds you to submit." />

      <div className="card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Assignment</span>
            <Select value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: k }))} ariaLabel="Assignment type" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Level</span>
            <Select value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l, label: l }))} ariaLabel="Academic level" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Topic / prompt</span>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="e.g. Write a history journal on the Salt March of 1930 — its causes, the march itself, and why it mattered." className="field resize-none deva" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Length</span>
            <Select value={length} onChange={setLength} options={LENGTHS} ariaLabel="Length" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Tone</span>
            <Select value={tone} onChange={setTone} options={TONES.map((t) => ({ value: t, label: t }))} ariaLabel="Tone" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><CalendarClock className="h-3.5 w-3.5" /> Deadline (Smriti will remind you)</span>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="field max-w-xs" />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={write} disabled={loading || !topic.trim()} className="btn-accent text-[15px]" style={{ background: ACCENT }}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing…</> : <><PenLine className="h-4 w-4" /> Write it for me</>}
          </button>
          <span className="text-xs text-faint">Formatted in Times New Roman, 12pt · exports to PDF / Word / PPT</span>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label="Acharya is researching and writing…" /></div>}

      {content && !loading && (
        <div className="mt-6 space-y-5">
          {/* export + handoff bar */}
          <div className="card flex flex-wrap items-center gap-2 p-4">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white" style={{ background: ACCENT }}><BrandMark className="h-4 w-4" /></span>
            <span className="text-sm font-medium text-graphite">Done — {content.wordCount ? `~${content.wordCount} words. ` : ""}Download as:</span>
            {EXPORTS.map((e) => {
              const Icon = e.icon;
              return (
                <button key={e.fmt} onClick={() => exportDoc(e.fmt)} disabled={!!exporting} className="btn-ghost text-sm">
                  {exporting === e.fmt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />} {e.label}
                </button>
              );
            })}
            {deadline && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {sent
                  ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F1EA] px-3 py-1.5 text-xs font-semibold text-[#2E6F52]"><CheckCircle2 className="h-3.5 w-3.5" /> Sent to Smriti · {fmtDeadline(deadline)}</span>
                  : <button onClick={() => handoff(content, deadline)} className="btn-accent text-sm" style={{ background: "#2E3A7B" }}><Send className="h-4 w-4" /> Send to Smriti</button>}
                <button onClick={() => downloadICS([{ title: `Submit: ${content.title}`, deadline }], "submission-reminder.ics")} className="btn-ghost text-sm"><CalendarPlus className="h-4 w-4" /> .ics</button>
              </div>
            )}
          </div>

          {/* document preview */}
          <article className="card px-7 py-8 sm:px-10" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <h1 className="text-center text-2xl font-bold text-ink">{content.title}</h1>
            {content.subtitle && <p className="mt-1 text-center text-[15px] italic text-muted">{content.subtitle}</p>}
            <div className="mx-auto mt-6 max-w-2xl space-y-4 text-[17px] leading-8 text-graphite">
              {content.sections?.map((s, i) => (
                <section key={i}>
                  {s.heading && <h2 className="mb-1 mt-5 text-lg font-bold text-ink">{s.heading}</h2>}
                  {s.paragraphs?.map((p, j) => <p key={j} className="text-justify" style={{ textIndent: "1.6em" }}>{p}</p>)}
                </section>
              ))}
              {content.references?.length ? (
                <section>
                  <h2 className="mb-1 mt-5 text-lg font-bold text-ink">References</h2>
                  <ol className="list-decimal space-y-1 pl-6 text-[15px]">{content.references.map((r, i) => <li key={i}>{r}</li>)}</ol>
                </section>
              ) : null}
            </div>
            {content._mock && <div className="mx-auto mt-5 max-w-2xl"><MockNote text="Sample piece — add a Gemini key for fully custom writing." /></div>}
          </article>

          <div className="flex items-start gap-3 rounded-2xl p-5 deva" style={{ background: meta.tint }}>
            <span className="mt-0.5 flex-none" style={{ color: ACCENT }}><BrandMark className="h-5 w-5" /></span>
            <p className="text-sm text-graphite">Acharya writes original drafts to learn from and build on. Always review, add your own voice, and follow your institution's academic-integrity rules before submitting.</p>
          </div>
        </div>
      )}
    </Wrap>
  );
}

export function StudyConsole({ onBack }: { onBack: () => void }) {
  const modules: ConsoleModule[] = [
    { id: "write", label: "Write", icon: PenLine, render: () => <Composer /> },
    { id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="study" /> },
  ];
  return <AgentConsole agentKey="study" platform="Study & Homework" badge={GraduationCap} modules={modules} onBack={onBack} />;
}
