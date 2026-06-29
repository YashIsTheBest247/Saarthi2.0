import { useState } from "react";
import { Send, Siren, ListChecks, FileText, ExternalLink, LucideIcon } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Emergency } from "../Emergency";
import { H, Wrap } from "./kit";
import { useApp } from "../../app/AppContext";
import { featureByKey } from "../../lib/features";
import { callFeature, FeatureKey } from "../../lib/api";
import { useVoice } from "../../hooks/useVoice";
import { Thinking, VoiceButton, ListBlock, ResultCard, MockNote } from "../../components/ui";
import { NotifyMe } from "../../components/NotifyMe";

interface Resource { name: string; type: string; detail?: string; link?: string }
interface AdvResult {
  summary: string;
  steps?: { title: string; detail?: string }[];
  resources?: Resource[];
  rights?: string[];
  tips?: string[];
  _mock?: boolean;
}

/** A generic structured-advisor console (used by Udyam & Khanan). */
export function AdvisorConsole({
  agentKey,
  badge,
  placeholder,
  example,
  onBack,
}: {
  agentKey: FeatureKey;
  badge: LucideIcon;
  placeholder: string;
  example: string;
  onBack: () => void;
}) {
  const { t } = useApp();
  const meta = featureByKey(agentKey);
  const modules: ConsoleModule[] = [
    { id: "advisor", label: "Advisor", icon: badge, render: () => <Advisor agentKey={agentKey} placeholder={placeholder} example={example} /> },
    { id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey={agentKey} /> },
  ];
  return <AgentConsole agentKey={agentKey} platform={t(meta.tagKey)} badge={badge} modules={modules} onBack={onBack} />;
}

function linkHref(link: string) {
  const url = (link || "").trim();
  if (!url || url.startsWith("[")) return null;
  const first = url.split(/\s|·|,/)[0];
  return first.includes(".") ? (first.startsWith("http") ? first : `https://${first}`) : null;
}

function composeEmail(meta: ReturnType<typeof featureByKey>, name: string, r: AdvResult) {
  const lines: string[] = [r.summary, ""];
  if (r.steps?.length) { lines.push("STEPS:"); r.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.title}${s.detail ? " — " + s.detail : ""}`)); lines.push(""); }
  if (r.resources?.length) { lines.push("RESOURCES:"); r.resources.forEach((x) => lines.push(`• ${x.name} (${x.type})${x.detail ? " — " + x.detail : ""}${x.link ? " — " + x.link : ""}`)); lines.push(""); }
  if (r.rights?.length) { lines.push("YOUR RIGHTS:"); r.rights.forEach((x) => lines.push(`• ${x}`)); lines.push(""); }
  if (r.tips?.length) { lines.push("TIPS:"); r.tips.forEach((x) => lines.push(`• ${x}`)); }
  return { title: `${name} — your plan`, message: lines.join("\n") };
}

function Advisor({ agentKey, placeholder, example }: { agentKey: FeatureKey; placeholder: string; example: string }) {
  const meta = featureByKey(agentKey);
  const { t, lang } = useApp();
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvResult | null>(null);
  const voice = useVoice(lang.speech, setProblem);

  async function run() {
    if (!problem.trim()) return;
    setLoading(true); setResult(null);
    try { setResult(await callFeature<AdvResult>(agentKey, { problem, language: lang.name })); }
    catch { /* mock fallback */ }
    finally { setLoading(false); }
  }

  // group resources by their type label (Registration / Form / Authority / Scheme…)
  const groups: Record<string, Resource[]> = {};
  (result?.resources || []).forEach((r) => { (groups[r.type || "Other"] ||= []).push(r); });

  return (
    <Wrap>
      <H title={t(meta.tagKey)} sub={t(meta.personaKey)} />

      <div className="card p-6 sm:p-7">
        <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={placeholder} rows={4} className="field resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || !problem.trim()} className="btn-accent text-[15px]" style={{ background: meta.accent }}><Send className="h-4 w-4" />{t("common.run")}</button>
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(problem))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
          <button onClick={() => setProblem(example)} className="btn-ghost text-sm">{t("common.example")}</button>
        </div>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div className="mt-6">
          <ResultCard accent={meta.accent}>
            <p className="display text-xl font-semibold leading-snug deva">{result.summary}</p>

            {result.steps?.length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><ListChecks className="h-4 w-4" style={{ color: meta.accent }} /> {t("adv.steps")}</h4>
                <div className="space-y-3">
                  {result.steps.map((s, i) => (
                    <div key={i} className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: meta.accent }}>{i + 1}</span>
                      <div>
                        <div className="font-medium text-ink">{s.title}</div>
                        {s.detail && <div className="text-sm text-muted">{s.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {Object.keys(groups).length ? (
              <div className="mt-6 deva">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><FileText className="h-4 w-4" style={{ color: meta.accent }} /> {t("adv.resources")}</h4>
                <div className="space-y-4">
                  {Object.entries(groups).map(([type, items]) => (
                    <div key={type}>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: meta.accentDark }}>{type}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((x, i) => {
                          const href = x.link ? linkHref(x.link) : null;
                          const cls = "block rounded-2xl border border-line bg-mist/40 p-3.5 transition-all duration-200" + (href ? " cursor-pointer hover:-translate-y-0.5 hover:border-faint hover:bg-paper hover:shadow-soft" : " hover:border-faint");
                          const inner = (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-ink deva">{x.name}</span>
                                {href && <ExternalLink className="h-4 w-4 flex-none" style={{ color: meta.accent }} />}
                              </div>
                              {x.detail && <p className="mt-1 text-sm text-muted deva">{x.detail}</p>}
                              {x.link && !href && <p className="mt-1 text-xs font-medium text-faint deva">{x.link}</p>}
                            </>
                          );
                          return href
                            ? <a key={i} href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
                            : <div key={i} className={cls}>{inner}</div>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-7 sm:grid-cols-2 deva">
              {result.rights?.length ? <ListBlock title={t("adv.rights")} items={result.rights} accent={meta.accent} /> : null}
              {result.tips?.length ? <ListBlock title={t("adv.tips")} items={result.tips} tone="good" /> : null}
            </div>

            <NotifyMe accent={meta.accent} getPayload={() => composeEmail(meta, t(meta.nameKey), result)} />

            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </Wrap>
  );
}
