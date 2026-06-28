import { useState } from "react";
import { Send, Waves, AlertTriangle, Route, Boxes, Users } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature } from "../lib/api";
import { useVoice } from "../hooks/useVoice";
import { FeatureShell } from "../components/FeatureShell";
import { Select } from "../components/Select";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote } from "../components/ui";

interface Hazard {
  type: string;
  level: "Low" | "Moderate" | "High" | "Severe";
  window?: string;
  rationale: string;
}
interface RaahatResult {
  summary: string;
  overallLevel: string;
  hazards: Hazard[];
  immediateActions: string[];
  safeRoutes: string[];
  resourcePlan?: string[];
  vulnerableGroups?: string[];
  advisory?: string;
  disclaimer: string;
  _mock?: boolean;
}

const LEVEL_COLOR: Record<string, string> = {
  Severe: "#C0453B",
  High: "#E0892E",
  Moderate: "#C9A227",
  Low: "#4B9E6B",
  Minimal: "#3F9A7A",
};

const FOCUS = ["Auto-detect", "Flood", "Wildfire", "Cyclone", "Heatwave"];
const EXAMPLE =
  "Heavy rain over Guwahati for the last 3 days. The Brahmaputra is near the danger mark. Low-lying eastern wards are starting to flood and locals are posting photos of water entering homes. IMD has issued an orange alert.";

export function Raahat({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("raahat");
  const { t, lang } = useApp();
  const [location, setLocation] = useState("");
  const [situation, setSituation] = useState("");
  const [focus, setFocus] = useState("Auto-detect");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RaahatResult | null>(null);
  const voice = useVoice(lang.speech, setSituation);

  async function run() {
    if (!situation.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(
        await callFeature<RaahatResult>("raahat", {
          location,
          situation,
          hazardFocus: focus === "Auto-detect" ? "" : focus,
          language: lang.name,
        }),
      );
    } catch {
      /* mock fallback handled server-side */
    } finally {
      setLoading(false);
    }
  }

  const overallColor = LEVEL_COLOR[result?.overallLevel ?? ""] || meta.accent;

  return (
    <FeatureShell meta={meta} onBack={onBack} embedded={embedded}>
      <div className="card p-6 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location / region (e.g. Guwahati, Assam)" className="field deva" />
          <Select value={focus} onChange={setFocus} options={FOCUS.map((f) => ({ value: f, label: f }))} className="sm:w-44" ariaLabel="Hazard focus" />
        </div>
        <textarea value={situation} onChange={(e) => setSituation(e.target.value)} placeholder={t("rh.ph")} rows={4} className="field mt-3 resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || !situation.trim()} className="btn-accent text-[15px]" style={{ background: meta.accent }}><Send className="h-4 w-4" />{t("common.run")}</button>
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(situation))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
          <button onClick={() => { setSituation(EXAMPLE); setLocation("Guwahati, Assam"); }} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: overallColor }}>
                {result.overallLevel} risk
              </span>
            </div>
            <p className="display mt-3 text-xl font-semibold leading-snug deva">{result.summary}</p>

            {result.hazards?.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.hazards.map((h, i) => {
                  const c = LEVEL_COLOR[h.level] || meta.accent;
                  return (
                    <div key={i} className="rounded-2xl border border-line bg-paper p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><Waves className="h-4 w-4" style={{ color: c }} />{h.type}</span>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: c }}>{h.level}</span>
                      </div>
                      {h.window && <div className="mt-1 text-xs font-medium" style={{ color: c }}>peaks {h.window}</div>}
                      <p className="mt-1.5 text-sm leading-relaxed text-muted deva">{h.rationale}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 deva">
              <div className="flex gap-3 rounded-2xl p-5" style={{ background: meta.tint }}>
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" style={{ color: meta.accentDark }} />
                <ListBlock title={t("rh.actions")} items={result.immediateActions} accent={meta.accentDark} />
              </div>
              <div className="grid gap-7 sm:grid-cols-2">
                {result.safeRoutes?.length ? (
                  <div className="flex gap-3"><Route className="mt-0.5 h-5 w-5 flex-none" style={{ color: meta.accent }} /><ListBlock title={t("rh.routes")} items={result.safeRoutes} accent={meta.accent} /></div>
                ) : null}
                {result.resourcePlan?.length ? (
                  <div className="flex gap-3"><Boxes className="mt-0.5 h-5 w-5 flex-none" style={{ color: meta.accent }} /><ListBlock title={t("rh.resources")} items={result.resourcePlan} accent={meta.accent} /></div>
                ) : null}
              </div>
              {result.vulnerableGroups?.length ? (
                <div className="flex gap-3"><Users className="mt-0.5 h-5 w-5 flex-none text-[#C0453B]" /><ListBlock title={t("rh.vulnerable")} items={result.vulnerableGroups} tone="warn" /></div>
              ) : null}
            </div>

            {result.advisory && (
              <div className="mt-6 rounded-2xl border border-line bg-mist px-4 py-3 text-sm text-graphite deva">
                <span className="font-semibold">{t("rh.advisory")}: </span>{result.advisory}
              </div>
            )}
            <p className="mt-4 text-xs text-faint deva">{result.disclaimer}</p>

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </FeatureShell>
  );
}
