import { useRef, useState } from "react";
import { Send, ImagePlus, X, Sprout, Activity, CalendarClock } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, fileToInlineData } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote } from "../components/ui";

interface KrishiResult {
  summary: string;
  diagnosis: string;
  severity?: "Low" | "Medium" | "High";
  actionPlan?: { step: string; when?: string }[];
  prevention?: string[];
  schemes?: string[];
  advisory?: string[];
  disclaimer?: string;
  _mock?: boolean;
}

const EXAMPLE =
  "My tomato plants have yellow spots with dark edges on the lower leaves, spreading for 3 days. Location Nashik, Maharashtra.";

const sevColor = (s?: string) => (s === "High" ? "#B23A2E" : s === "Medium" ? "#B07A1E" : "#2E6F52");

export function Krishi({ onBack }: { onBack: () => void }) {
  const meta = featureByKey("krishi");
  const { t, lang } = useApp();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KrishiResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(lang.speech, setText);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await fileToInlineData(file));
    setPreview(URL.createObjectURL(file));
  }

  async function run() {
    if (!text.trim() && !image) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await callFeature<KrishiResult>("krishi", { text, image, language: lang.name }));
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureShell meta={meta} onBack={onBack}>
      <div className="card p-6 sm:p-7">
        {preview && (
          <div className="relative mb-4 inline-block">
            <img src={preview} alt="crop" className="max-h-48 rounded-2xl border border-line" />
            <button onClick={() => { setImage(null); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"><X className="h-4 w-4" /></button>
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("kr.ph")} rows={4} className="field resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-accent text-[15px]"><Send className="h-4 w-4" />{t("common.run")}</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm"><ImagePlus className="h-4 w-4" />{t("common.upload")}</button>
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(text))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
          <button onClick={() => setText(EXAMPLE)} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <p className="display text-xl font-semibold leading-snug deva">{result.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl p-5 deva" style={{ background: meta.tint }}>
              <Sprout className="h-5 w-5 flex-none" style={{ color: meta.accent }} />
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.accentDark }}>{t("kr.diagnosis")}</div>
                <p className="mt-0.5 text-[15px] font-medium text-ink">{result.diagnosis}</p>
              </div>
              {result.severity && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: sevColor(result.severity) }}>
                  <Activity className="h-3.5 w-3.5" />{t("kr.severity")}: {result.severity}
                </span>
              )}
            </div>

            {result.actionPlan?.length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("kr.plan")}</h4>
                <div className="space-y-3">
                  {result.actionPlan.map((a, i) => (
                    <div key={i} className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: meta.accent }}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="font-medium text-ink">{a.step}</div>
                        {a.when && <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><CalendarClock className="h-3.5 w-3.5" />{a.when}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              {result.prevention?.length ? <ListBlock title={t("kr.prevention")} items={result.prevention} tone="good" /> : null}
              {result.advisory?.length ? <ListBlock title={t("kr.advisory")} items={result.advisory} accent={meta.accent} /> : null}
            </div>

            {result.schemes?.length ? (
              <div className="mt-6 deva"><ListBlock title={t("kr.schemes")} items={result.schemes} accent={meta.accent} /></div>
            ) : null}

            {result.disclaimer && <p className="mt-5 text-xs leading-relaxed text-faint deva">{result.disclaimer}</p>}

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </FeatureShell>
  );
}
