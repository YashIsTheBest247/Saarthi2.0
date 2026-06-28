import { useRef, useState } from "react";
import { Send, ImagePlus, X, Clock, CalendarClock, Flag, FileText } from "lucide-react";
import { BrandMark } from "../components/Logo";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, fileToInlineData } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Thinking, VoiceButton, ResultCard, MockNote, CopyBlock } from "../components/ui";

interface Task {
  title: string;
  deadline?: string;
  priority: "High" | "Medium" | "Low";
  estimate?: string;
  category?: string;
  why?: string;
  firstStep: string;
  draft?: string;
}
interface Block {
  block: string;
  task: string;
  focus?: string;
}
interface SamayResult {
  summary: string;
  topPriority: string;
  tasks: Task[];
  schedule?: Block[];
  _mock?: boolean;
}

const EXAMPLE =
  "Physics assignment Ch.5 due Friday 5pm, prepare sales deck for Monday client meeting, pay rent by 5th, buy mom's birthday gift before Sunday, reply to professor's email about project.";

const prio = (p: string) =>
  p === "High" ? { c: "#B23A2E", bg: "#F7E7E5" } : p === "Medium" ? { c: "#B07A1E", bg: "#F7EEDB" } : { c: "#2E6F52", bg: "#E4F1EA" };

export function Samay({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("samay");
  const { t, lang } = useApp();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SamayResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(lang.speech, setText);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await fileToInlineData(file));
    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  }
  function clearFile() {
    setImage(null); setPreview(""); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function run() {
    if (!text.trim() && !image) return;
    setLoading(true);
    setResult(null);
    try {
      const today = new Date().toDateString();
      setResult(await callFeature<SamayResult>("samay", { text, image, today, language: lang.name }));
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureShell meta={meta} onBack={onBack} embedded={embedded}>
      <div className="card p-6 sm:p-7">
        {preview && (
          <div className="relative mb-4 inline-block">
            <img src={preview} alt="notes" className="max-h-44 rounded-2xl border border-line" />
            <button onClick={clearFile} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {image && !preview && (
          <div className="relative mb-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-mist px-4 py-3">
            <FileText className="h-5 w-5" style={{ color: meta.accent }} />
            <span className="max-w-[14rem] truncate text-sm font-medium text-graphite deva">{fileName || "Document"}</span>
            <button onClick={clearFile} className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("sm.ph")}
          rows={5}
          className="field resize-none deva"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-accent text-[15px]">
            <Send className="h-4 w-4" />
            {t("common.run")}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">
            <ImagePlus className="h-4 w-4" />
            {t("common.upload")} <span className="ml-1 text-faint">(photo / PDF)</span>
          </button>
          {voice.supported && (
            <VoiceButton
              listening={voice.listening}
              onClick={() => (voice.listening ? voice.stop() : voice.start(text))}
              speakLabel={t("common.speak")}
              listeningLabel={t("common.listening")}
            />
          )}
          <button onClick={() => setText(EXAMPLE)} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6 space-y-5">
          <ResultCard accent={meta.accent}>
            <p className="display text-lg font-semibold leading-snug deva">{result.summary}</p>
            {/* do this first */}
            <div className="mt-4 flex gap-3 rounded-2xl p-5" style={{ background: meta.tint }}>
              <span className="mt-0.5 flex-none" style={{ color: meta.accent }}><BrandMark className="h-5 w-5" /></span>
              <div className="deva">
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.accentDark }}>{t("sm.first")}</div>
                <p className="mt-1 text-[15px] font-medium text-ink">{result.topPriority}</p>
              </div>
            </div>
            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>

          {/* tasks */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sm.tasks")}</h3>
            <div className="space-y-3">
              {result.tasks?.map((task, i) => {
                const p = prio(task.priority);
                return (
                  <div key={i} className="card p-5 deva">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="text-[17px] font-semibold text-ink">{task.title}</h4>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: p.bg, color: p.c }}>
                        <Flag className="h-3 w-3" /> {task.priority}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      {task.deadline && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" style={{ color: meta.accent }} />{task.deadline}</span>}
                      {task.estimate && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" style={{ color: meta.accent }} />{t("sm.estimate")} {task.estimate}</span>}
                      {task.category && <span className="pill">{task.category}</span>}
                    </div>
                    {task.why && <p className="mt-2 text-sm text-muted">{task.why}</p>}
                    <div className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm">
                      <span className="font-semibold text-graphite">{t("sm.step")}: </span>
                      <span className="text-graphite">{task.firstStep}</span>
                    </div>
                    {task.draft && (
                      <div className="mt-3">
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">{t("sm.draft")}</div>
                        <CopyBlock text={task.draft} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* focus plan */}
          {result.schedule?.length ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sm.schedule")}</h3>
              <div className="card overflow-hidden">
                {result.schedule.map((b, i) => (
                  <div key={i} className="flex gap-4 border-b border-line p-5 last:border-0 deva">
                    <div className="w-32 flex-none text-sm font-semibold" style={{ color: meta.accent }}>{b.block}</div>
                    <div className="flex-1">
                      <div className="font-medium text-ink">{b.task}</div>
                      {b.focus && <div className="mt-0.5 text-sm text-muted">{b.focus}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </FeatureShell>
  );
}
