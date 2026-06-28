import { useState } from "react";
import { Send, FileText, Search, MessageSquareText, GraduationCap, ExternalLink, Loader2, MapPin } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Select } from "../components/Select";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote, CopyBlock } from "../components/ui";

interface DishaResult {
  summary: string;
  output: string;
  highlights?: string[];
  whereToLook?: string[];
  tips?: string[];
  _mock?: boolean;
}

interface Job { title: string; company: string; location: string; url: string; type?: string; tags?: string[] }

const MODES = [
  { value: "resume", label: "Build résumé", icon: FileText },
  { value: "jobsearch", label: "Job search", icon: Search },
  { value: "interview", label: "Interview prep", icon: MessageSquareText },
  { value: "skills", label: "Skill plan", icon: GraduationCap },
];
const EXAMPLE =
  "2 years as a sales executive in Pune, B.Com graduate. I want to move into a customer-success role. Decent at CRM and client handling.";

export function Disha({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("disha");
  const { t, lang } = useApp();
  const [mode, setMode] = useState("resume");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DishaResult | null>(null);
  const voice = useVoice(lang.speech, setDetails);

  // live job search
  const [jobQ, setJobQ] = useState("");
  const [jobLoc, setJobLoc] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobsBusy, setJobsBusy] = useState(false);

  async function findJobs() {
    setJobsBusy(true);
    setJobs(null);
    try {
      const r = await fetch(`/api/jobs?q=${encodeURIComponent(jobQ)}&loc=${encodeURIComponent(jobLoc)}`);
      const j = await r.json();
      setJobs(j.jobs || []);
    } catch {
      setJobs([]);
    } finally {
      setJobsBusy(false);
    }
  }

  async function run() {
    if (!details.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await callFeature<DishaResult>("disha", { mode, details, language: lang.name }));
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureShell meta={meta} onBack={onBack} embedded={embedded}>
      <div className="card p-6 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => {
              const on = mode === m.value;
              return (
                <button key={m.value} onClick={() => setMode(m.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${on ? "text-white" : "border-line bg-paper text-graphite hover:bg-mist"}`}
                  style={on ? { background: meta.accent, borderColor: meta.accent } : undefined}>
                  <m.icon className="h-4 w-4" /> {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t("ds.ph")} rows={4} className="field mt-3 resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || !details.trim()} className="btn-accent text-[15px]" style={{ background: meta.accent }}><Send className="h-4 w-4" />{t("common.run")}</button>
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(details))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
          <button onClick={() => setDetails(EXAMPLE)} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {/* live job listings (Job search mode) */}
      {mode === "jobsearch" && (
        <div className="card mt-4 p-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Live openings</h3>
          <p className="mb-3 text-[13px] text-muted">Real, current roles you can apply to right now (remote-friendly).</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={jobQ} onChange={(e) => setJobQ(e.target.value)} placeholder="Role / keywords (e.g. react developer)" className="field" />
            <input value={jobLoc} onChange={(e) => setJobLoc(e.target.value)} placeholder="Location (e.g. India / remote)" className="field" />
            <button onClick={findJobs} disabled={jobsBusy} className="btn-accent text-[15px]" style={{ background: meta.accent }}>
              {jobsBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</> : <><Search className="h-4 w-4" /> Find jobs</>}
            </button>
          </div>

          {jobs && (
            <div className="mt-4 space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-muted">No live roles found right now — try different keywords.</p>
              ) : jobs.map((job, i) => (
                <a key={i} href={job.url} target="_blank" rel="noreferrer"
                  className="group flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 transition-all hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{job.title}</div>
                    <div className="truncate text-sm text-muted">{job.company}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location || "Remote"}</span>
                      {job.type && <span className="rounded-full bg-mist px-2 py-0.5">{job.type}</span>}
                      {(job.tags || []).slice(0, 3).map((tg) => <span key={tg} className="rounded-full bg-mist px-2 py-0.5">{tg}</span>)}
                    </div>
                  </div>
                  <span className="arrow-btn flex-none"><ExternalLink className="h-4 w-4" /></span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <p className="display text-xl font-semibold leading-snug deva">{result.summary}</p>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("ds.output")}</div>
              <CopyBlock text={result.output} />
            </div>

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              {result.highlights?.length ? <ListBlock title={t("ds.highlights")} items={result.highlights} accent={meta.accent} /> : null}
              {result.whereToLook?.length ? <ListBlock title={t("ds.where")} items={result.whereToLook} tone="good" /> : null}
            </div>

            {result.tips?.length ? <div className="mt-6 deva"><ListBlock title={t("ds.tips")} items={result.tips} accent={meta.accent} /></div> : null}

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </FeatureShell>
  );
}
