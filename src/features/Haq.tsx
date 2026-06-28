import { useState } from "react";
import { Search, ExternalLink, BadgeCheck, ListChecks, FileText } from "lucide-react";
import { useApp } from "../app/AppContext";
import { featureByKey } from "../lib/features";
import { callFeature } from "../lib/api";
import { FeatureShell } from "../components/FeatureShell";
import { Select } from "../components/Select";
import { Thinking, ResultCard, MockNote, Reveal } from "../components/ui";

interface Scheme {
  name: string;
  level: string;
  category: string;
  benefit: string;
  whyYouQualify: string;
  howToApply?: string[];
  documents?: string[];
  officialLink?: string;
  confidence: string;
}
interface HaqResult {
  summary: string;
  schemes: Scheme[];
  _mock?: boolean;
}

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan",
  "Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal","Other",
];
const OCCUPATIONS = ["Farmer","Daily wage worker","Self-employed / small shop","Student","Homemaker","Private job","Unemployed","Senior citizen","Other"];
const SPECIAL = ["Woman","Farmer","Student","Senior citizen","Person with disability","Widow","BPL / low income","Construction worker"];

const confColor = (c: string) => (/high/i.test(c) ? "#1F6F5C" : /likely/i.test(c) ? "#C2641F" : "#7A7264");

export function Haq({ onBack, embedded }: { onBack?: () => void; embedded?: boolean }) {
  const meta = featureByKey("haq");
  const { t, lang } = useApp();
  const [form, setForm] = useState({ age: "", gender: "Female", state: "Maharashtra", occupation: "Farmer", income: "Below ₹1 lakh", category: "General" });
  const [special, setSpecial] = useState<string[]>(["Farmer"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HaqResult | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (s: string) => setSpecial((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const data = await callFeature<HaqResult>("haq", {
        profile: { ...form, special: special.join(", ") },
        language: lang.name,
      });
      setResult(data);
    } catch {
      /* mock fallback */
    } finally {
      setLoading(false);
    }
  }

  const ProfileField = ({ k, label, opts }: { k: string; label: string; opts: string[] }) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite deva">{label}</span>
      <Select value={(form as any)[k]} onChange={(v) => set(k, v)} options={opts.map((o) => ({ value: o, label: o }))} ariaLabel={label} />
    </label>
  );

  return (
    <FeatureShell meta={meta} onBack={onBack} embedded={embedded}>
      <div className="card p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-graphite deva">{t("h.age")}</span>
            <input
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="e.g. 34"
              inputMode="numeric"
              className="field"
            />
          </label>
          <ProfileField k="gender" label={t("h.gender")} opts={["Female", "Male", "Other"]} />
          <ProfileField k="state" label={t("h.state")} opts={STATES} />
          <ProfileField k="occupation" label={t("h.occupation")} opts={OCCUPATIONS} />
          <ProfileField k="income" label={t("h.income")} opts={["Below ₹1 lakh", "₹1–3 lakh", "₹3–6 lakh", "₹6–10 lakh", "Above ₹10 lakh"]} />
          <ProfileField k="category" label={t("h.category")} opts={["General", "OBC", "SC", "ST", "EWS"]} />
        </div>

        <div className="mt-5">
          <span className="mb-2 block text-sm font-medium text-graphite deva">{t("h.special")}</span>
          <div className="flex flex-wrap gap-2">
            {SPECIAL.map((s) => {
              const on = special.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                    on ? "border-transparent text-white" : "border-line bg-mist text-graphite hover:border-faint"
                  }`}
                  style={on ? { background: meta.accent } : undefined}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={run} disabled={loading} className="btn-accent mt-6 text-[15px]">
          <Search className="h-4 w-4" />
          {t("h.find")}
        </button>
      </div>

      {loading && (
        <div className="card mt-6 p-8">
          <Thinking label={t("common.running")} />
        </div>
      )}

      {result && !loading && (
        <div className="mt-6 space-y-5">
          <ResultCard accent={meta.accent}>
            <p className="display text-xl font-semibold leading-snug deva">{result.summary}</p>
            {result._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>

          {result.schemes?.map((s, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="display text-xl font-semibold deva">{s.name}</h3>
                      <span className="pill" style={{ color: meta.accent }}>{s.level}</span>
                      <span className="pill">{s.category}</span>
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: confColor(s.confidence) }}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {s.confidence}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-mist px-5 py-4 deva">
                  <div className="text-xs font-semibold uppercase tracking-wide text-faint">{t("h.benefit")}</div>
                  <div className="mt-1 text-[15px] font-medium text-ink">{s.benefit}</div>
                  <div className="mt-3 text-sm text-muted">
                    <span className="font-semibold text-graphite">{t("h.why")}: </span>
                    {s.whyYouQualify}
                  </div>
                </div>

                <div className="mt-4 grid gap-5 sm:grid-cols-2 deva">
                  {s.howToApply?.length ? (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite">
                        <ListChecks className="h-4 w-4" style={{ color: meta.accent }} /> {t("h.apply")}
                      </h4>
                      <ol className="space-y-1.5 text-sm text-muted">
                        {s.howToApply.map((step, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="font-semibold" style={{ color: meta.accent }}>{j + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {s.documents?.length ? (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite">
                        <FileText className="h-4 w-4" style={{ color: meta.accent }} /> {t("h.docs")}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {s.documents.map((d, j) => (
                          <span key={j} className="pill">{d}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {s.officialLink && (
                  <a
                    href={s.officialLink.startsWith("http") ? s.officialLink : `https://${s.officialLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold link-underline"
                    style={{ color: meta.accent }}
                  >
                    {t("h.official")}: {s.officialLink}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </FeatureShell>
  );
}
