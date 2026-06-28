import { useRef, useState } from "react";
import { Send, ImagePlus, X, Wallet, IndianRupee, CalendarClock, FileText } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, fileToInlineData } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote } from "../components/ui";

interface PaisaResult {
  summary: string;
  totals?: { label: string; value: string }[];
  breakdown?: { category: string; amount: string; note?: string }[];
  leaks?: string[];
  dues?: { item: string; due?: string }[];
  plan?: string[];
  savingEstimate?: string;
  _mock?: boolean;
}

const EXAMPLE =
  "Swiggy 450, Zomato 380, Netflix 199, Spotify 119, rent 12000, electricity 1800, petrol 1500, shopping 2200, credit card bill due 5th";

export function Paisa({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("paisa");
  const { t, lang } = useApp();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaisaResult | null>(null);
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
      setResult(await callFeature<PaisaResult>("paisa", { text, image, language: lang.name }));
    } catch {
      /* mock fallback */
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
              <img src={preview} alt="bill" className="max-h-44 rounded-2xl border border-line" />
            ) : (
              <span className="flex items-center gap-2 rounded-2xl border border-line bg-mist px-4 py-3 text-sm font-medium text-graphite"><FileText className="h-4 w-4" /> {pdfName}</span>
            )}
            <button onClick={clearFile} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"><X className="h-4 w-4" /></button>
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("pa.ph")} rows={4} className="field resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-accent text-[15px]"><Send className="h-4 w-4" />{t("common.run")}</button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
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

            {result.totals?.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {result.totals.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-mist p-4 deva">
                    <div className="text-xs uppercase tracking-wide text-faint">{a.label}</div>
                    <div className="display mt-1 text-lg font-bold" style={{ color: meta.accent }}>{a.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {result.breakdown?.length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("pa.breakdown")}</h4>
                <div className="space-y-2">
                  {result.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-2.5">
                      <div>
                        <div className="font-medium text-ink">{b.category}</div>
                        {b.note && <div className="text-xs text-muted">{b.note}</div>}
                      </div>
                      <div className="display font-bold" style={{ color: meta.accent }}>{b.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              {result.leaks?.length ? <ListBlock title={t("pa.leaks")} items={result.leaks} tone="warn" /> : null}
              {result.plan?.length ? <ListBlock title={t("pa.plan")} items={result.plan} tone="good" /> : null}
            </div>

            {result.dues?.length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("pa.dues")}</h4>
                <div className="flex flex-wrap gap-2">
                  {result.dues.map((d, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist px-3 py-1.5 text-sm">
                      <CalendarClock className="h-3.5 w-3.5" style={{ color: meta.accent }} />{d.item}{d.due ? ` · ${d.due}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {result.savingEstimate && (
              <div className="mt-6 flex items-center justify-between rounded-2xl px-5 py-4 text-white" style={{ background: meta.accent }}>
                <span className="text-xs uppercase tracking-wide text-white/80 deva">{t("pa.saving")}</span>
                <span className="display flex items-center gap-1 text-lg font-bold"><IndianRupee className="h-4 w-4" />{result.savingEstimate.replace(/^₹/, "")}</span>
              </div>
            )}

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </FeatureShell>
  );
}
