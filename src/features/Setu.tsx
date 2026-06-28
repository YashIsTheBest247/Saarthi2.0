import { useRef, useState } from "react";
import { Send, ImagePlus, X, Scale, Building2, ExternalLink, ArrowUpRight } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, fileToInlineData } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote, CopyBlock } from "../components/ui";

interface SetuResult {
  summary: string;
  authority: string;
  draftComplaint: string;
  yourRights?: string[];
  escalation?: { step: string; where: string }[];
  portals?: { name: string; link?: string }[];
  followUp?: string[];
  _mock?: boolean;
}

const EXAMPLE =
  "I ordered a phone online for ₹15,000. It arrived with a cracked screen. The seller is refusing a refund or replacement.";

export function Setu({ onBack }: { onBack: () => void }) {
  const meta = featureByKey("setu");
  const { t, lang } = useApp();
  const [problem, setProblem] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetuResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(lang.speech, setProblem);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await fileToInlineData(file));
    setPreview(URL.createObjectURL(file));
  }

  async function run() {
    if (!problem.trim() && !image) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await callFeature<SetuResult>("setu", { problem, image, language: lang.name }));
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
            <img src={preview} alt="proof" className="max-h-44 rounded-2xl border border-line" />
            <button onClick={() => { setImage(null); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"><X className="h-4 w-4" /></button>
          </div>
        )}
        <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("st.ph")} rows={4} className="field resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!problem.trim() && !image)} className="btn-accent text-[15px]"><Send className="h-4 w-4" />{t("common.run")}</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm"><ImagePlus className="h-4 w-4" />{t("common.upload")}</button>
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(problem))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
          <button onClick={() => setProblem(EXAMPLE)} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <p className="display text-xl font-semibold leading-snug deva">{result.summary}</p>

            <div className="mt-5 flex gap-3 rounded-2xl p-5 deva" style={{ background: meta.tint }}>
              <Building2 className="mt-0.5 h-5 w-5 flex-none" style={{ color: meta.accent }} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.accentDark }}>{t("st.authority")}</div>
                <p className="mt-1 text-[15px] text-ink">{result.authority}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("st.draftLabel")}</div>
              <CopyBlock text={result.draftComplaint} />
            </div>

            {result.escalation?.length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("st.escalation")}</h4>
                <div className="relative space-y-3">
                  {result.escalation.map((e, i) => (
                    <div key={i} className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: meta.accent }}>{i + 1}</span>
                      <div>
                        <div className="font-medium text-ink">{e.step}</div>
                        <div className="text-sm text-muted">{e.where}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              {result.yourRights?.length ? <ListBlock title={t("st.rights")} items={result.yourRights} accent={meta.accent} /> : null}
              {result.followUp?.length ? <ListBlock title={t("st.followup")} items={result.followUp} tone="good" /> : null}
            </div>

            {result.portals?.length ? (
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("st.portals")}</h4>
                <div className="flex flex-wrap gap-2">
                  {result.portals.map((p, i) =>
                    p.link ? (
                      <a key={i} href={p.link.startsWith("http") ? p.link : `https://${p.link.split(" ")[0]}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist px-3 py-1.5 text-sm font-medium hover:border-faint" style={{ color: meta.accent }}>
                        {p.name} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span key={i} className="pill">{p.name}</span>
                    ),
                  )}
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
