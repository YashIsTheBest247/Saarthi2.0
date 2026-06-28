import { useRef, useState } from "react";
import { Send, ImagePlus, X, FileText, CalendarClock } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, fileToInlineData } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote } from "../components/ui";

interface SamajhResult {
  title: string;
  docType: string;
  summary: string;
  keyPoints?: string[];
  amounts?: { label: string; value: string }[];
  actionItems?: { task: string; deadline?: string }[];
  watchOuts?: string[];
  jargon?: { term: string; meaning: string }[];
  _mock?: boolean;
}

const EXAMPLE =
  "FINAL NOTICE: Premium of Rs 18,500 due on policy LIC-8841. Grace period ends 15th. Policy will lapse and bonus forfeited if unpaid. Revival charges Rs 450 + interest 9.5% p.a. applicable thereafter.";

export function Samajh({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("samajh");
  const { t, lang } = useApp();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SamajhResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(lang.speech, setText);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await fileToInlineData(file));
    if (file.type === "application/pdf") { setPdfName(file.name); setPreview(""); }
    else { setPreview(URL.createObjectURL(file)); setPdfName(""); }
  }
  const clearFile = () => { setImage(null); setPreview(""); setPdfName(""); if (fileRef.current) fileRef.current.value = ""; };

  async function run() {
    if (!text.trim() && !image) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await callFeature<SamajhResult>("samajh", { text, image, language: lang.name });
      setResult(data);
    } catch {
      /* mock fallback on server */
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureShell meta={meta} onBack={onBack} embedded={embedded}>
      <div className="card p-6 sm:p-7">
        {(preview || pdfName) && (
          <div className="relative mb-4 inline-block">
            {preview ? (
              <img src={preview} alt="document" className="max-h-48 rounded-2xl border border-line" />
            ) : (
              <span className="flex items-center gap-2 rounded-2xl border border-line bg-mist px-4 py-3 text-sm font-medium text-graphite"><FileText className="h-4 w-4" /> {pdfName}</span>
            )}
            <button
              onClick={clearFile}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("s.ph")}
          rows={5}
          className="field resize-none deva"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-accent text-[15px]">
            <Send className="h-4 w-4" />
            {t("common.run")}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">
            <ImagePlus className="h-4 w-4" />
            {t("common.upload")}
          </button>
          {voice.supported && (
            <VoiceButton
              listening={voice.listening}
              onClick={() => (voice.listening ? voice.stop() : voice.start(text))}
              speakLabel={t("common.speak")}
              listeningLabel={t("common.listening")}
            />
          )}
          <button onClick={() => setText(EXAMPLE)} className="btn-ghost text-sm">
            {t("common.example")}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card mt-6 p-8">
          <Thinking label={t("common.running")} />
        </div>
      )}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <span className="pill" style={{ color: meta.accent }}>
              <FileText className="h-3.5 w-3.5" /> {result.docType}
            </span>
            <h3 className="display mt-3 text-2xl font-semibold leading-tight deva">{result.title}</h3>
            <p className="deva mt-3 rounded-2xl bg-mist px-5 py-4 leading-relaxed text-graphite">{result.summary}</p>

            {result.amounts?.length ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {result.amounts.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-mist/50 p-4">
                    <div className="text-xs uppercase tracking-wide text-faint deva">{a.label}</div>
                    <div className="display mt-1 text-lg font-semibold deva" style={{ color: meta.accent }}>
                      {a.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              <ListBlock title={t("s.points")} items={result.keyPoints || []} accent={meta.accent} />
              {result.actionItems?.length ? (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("s.actions")}</h4>
                  <ul className="space-y-2.5">
                    {result.actionItems.map((a, i) => (
                      <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-graphite">
                        <CalendarClock className="mt-0.5 h-4 w-4 flex-none" style={{ color: meta.accent }} />
                        <span>
                          {a.task}
                          {a.deadline ? <span className="font-semibold"> · {a.deadline}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {result.watchOuts?.length ? (
              <div className="deva mt-6 rounded-2xl border border-danger/20 bg-danger/[0.04] p-5">
                <ListBlock title={t("s.watch")} items={result.watchOuts} tone="warn" />
              </div>
            ) : null}

            {result.jargon?.length ? (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("s.jargon")}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.jargon.map((j, i) => (
                    <div key={i} className="rounded-2xl border border-line bg-paper p-4 deva">
                      <div className="font-semibold text-ink">{j.term}</div>
                      <div className="mt-1 text-sm text-muted">{j.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </FeatureShell>
  );
}
