import { useState, useRef, useEffect } from "react";
import { Siren, Phone, ExternalLink } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature, FeatureKey } from "../lib/api";
import { Thinking, ListBlock, CopyBlock, MockNote } from "../components/ui";

interface EResult {
  headline: string;
  severity: "Act now" | "Urgent" | "Important";
  immediateSteps: { step: string; detail?: string; window?: string }[];
  contacts: { name: string; contact: string; why?: string }[];
  whatToSay?: string;
  whatSaarthiDoes?: string[];
  reassurance?: string;
  _mock?: boolean;
}

const SEV: Record<string, string> = { "Act now": "#C0453B", Urgent: "#E0892E", Important: "#C9A227" };

export const EMERGENCY: Record<string, { domain: string; preset: string }> = {
  kavach: { domain: "online fraud & cyber-crime", preset: "I think I've been scammed — I shared an OTP and money was just debited from my account." },
  samajh: { domain: "documents & legal notices", preset: "I received a legal/court notice and I'm scared I'll be in trouble. I don't understand what it wants." },
  haq: { domain: "government benefits & welfare", preset: "My monthly pension/ration has suddenly stopped and no one is telling me why or where to go." },
  sehat: { domain: "health & medicines", preset: "I think I took the wrong medicine and I'm feeling unwell — what should I do right now?" },
  paisa: { domain: "personal money & debt", preset: "I can't repay my loan EMIs and recovery agents are calling and threatening me. What do I do?" },
  kar: { domain: "income tax", preset: "I just got an income-tax notice and I missed the ITR deadline. I'm panicking — what now?" },
  samay: { domain: "deadlines & work", preset: "I've badly missed a critical deadline at work and don't know how to recover or what to tell my boss." },
  setu: { domain: "consumer & citizen rights", preset: "I paid for a product, got cheated, and the company is completely ignoring my complaints." },
  krishi: { domain: "farming & crop loss", preset: "My crop is suddenly dying and I've suffered loss. What do I do now and what can I claim?" },
  raahat: { domain: "women's safety", preset: "Someone is following me right now and I feel unsafe — what should I do this moment?" },
  disha: { domain: "jobs & careers", preset: "I was suddenly laid off / fired and I'm panicking about money and what to do next." },
  udyam: { domain: "business & MSME", preset: "My business got a GST/compliance notice and I don't know how to respond or what penalty I'm facing." },
  khanan: { domain: "the mining sector (Dhanbad)", preset: "There's been an accident at the coal mine and a worker is injured — what must we do right now and who do we report to?" },
};

function contactHref(c: string): string | null {
  const num = c.replace(/[^\d]/g, "");
  if (/^\d[\d\s-]*$/.test(c.trim()) && num.length >= 3) return `tel:${num}`;
  const url = c.split(/[·|,\s]/).find((p) => p.includes("."));
  return url ? (url.startsWith("http") ? url : `https://${url}`) : null;
}

export function Emergency({ agentKey }: { agentKey: FeatureKey; embedded?: boolean }) {
  const meta = featureByKey(agentKey);
  const { t, lang } = useApp();
  const cfg = EMERGENCY[agentKey] ?? { domain: "everyday life", preset: "" };
  const [text, setText] = useState(cfg.preset);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) {
      const id = window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      return () => window.clearTimeout(id);
    }
  }, [result]);

  async function run() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await callFeature<EResult>("emergency", { agentName: t(meta.nameKey), domain: cfg.domain, situation: text, language: lang.name }));
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#C0453B]/25 bg-[#C0453B]/5 p-4">
        <Siren className="mt-0.5 h-5 w-5 flex-none text-[#C0453B]" />
        <div>
          <h2 className="display text-lg font-bold deva">{t("sos.title")}</h2>
          <p className="mt-0.5 text-sm text-muted deva">{t("sos.sub")}</p>
        </div>
      </div>

      <div className="card p-6">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("sos.ph")} rows={3} className="field resize-none deva" />
        <button onClick={run} disabled={loading || !text.trim()} className="btn-accent mt-4 text-[15px]" style={{ background: "#C0453B" }}>
          <Siren className="h-4 w-4" /> {t("sos.run")}
        </button>
      </div>

      {loading && <div className="card mt-6 p-8"><Thinking label={t("common.running")} /></div>}

      {result && !loading && (
        <div ref={resultRef} className="mt-6 space-y-5 scroll-mt-20">
          <div className="rounded-2xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: SEV[result.severity] || "#C0453B" }}>{result.severity}</span>
            </div>
            <p className="display mt-3 text-xl font-semibold leading-snug deva">{result.headline}</p>
          </div>

          <div className="card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sos.steps")}</h3>
            <div className="space-y-3">
              {result.immediateSteps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#C0453B" }}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-ink deva">{s.step} {s.window && <span className="text-xs font-semibold text-[#C0453B]">· {s.window}</span>}</div>
                    {s.detail && <div className="text-sm text-muted deva">{s.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.contacts?.length ? (
            <div className="card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sos.contacts")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.contacts.map((c, i) => {
                  const href = contactHref(c.contact);
                  const Inner = (
                    <div className="flex h-full items-start gap-3 rounded-2xl border border-line bg-mist/40 p-3">
                      <Phone className="mt-0.5 h-4 w-4 flex-none" style={{ color: meta.accent }} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink deva">{c.name}</div>
                        <div className="text-sm font-medium deva" style={{ color: meta.accent }}>{c.contact}</div>
                        {c.why && <div className="mt-0.5 text-xs text-muted deva">{c.why}</div>}
                      </div>
                      {href && <ExternalLink className="ml-auto h-3.5 w-3.5 flex-none text-faint" />}
                    </div>
                  );
                  return href ? (
                    <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="transition-transform hover:-translate-y-0.5">{Inner}</a>
                  ) : (
                    <div key={i}>{Inner}</div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {result.whatToSay && (
            <div className="card p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sos.say")}</h3>
              <CopyBlock text={result.whatToSay} />
            </div>
          )}

          {result.whatSaarthiDoes?.length ? (
            <div className="rounded-2xl p-5 deva" style={{ background: meta.tint }}>
              <ListBlock title={t("sos.does").replace("{name}", t(meta.nameKey))} items={result.whatSaarthiDoes} accent={meta.accentDark} />
            </div>
          ) : null}

          {result.reassurance && <p className="px-1 text-sm leading-relaxed text-muted deva">{result.reassurance}</p>}
          {result._mock && <MockNote text={t("common.sample")} />}
        </div>
      )}
    </div>
  );
}
