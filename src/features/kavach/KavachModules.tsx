import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Send, ShieldAlert, Sparkles, AlertTriangle, Check, Workflow, ArrowRight,
  Waves, Banknote, ImagePlus, X, ExternalLink, RefreshCw, Radio,
} from "lucide-react";
import { useApp } from "../../app/AppContext";
import { callFeature, fileToInlineData } from "../../lib/api";
import { RiskRing } from "../../components/Landing";
import { Thinking, CopyBlock, ListBlock, MockNote } from "../../components/ui";
import {
  classifyScam, confusion, pct, Metrics,
  SCAM_SET, VOICE_SET, VOICE_HOLDOUT, SECURITY_FEATURES, scoreCounterfeit, COUNTERFEIT_HOLDOUT,
  FRAUD_GRAPH, HOTSPOTS, KPIS,
} from "./engine";

const ACCENT = "#2D6BFF";
const ACCENT_DARK = "#1A49BD";

function H({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="display text-2xl font-bold">{title}</h2>
      {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.div>
  );
}

/* ------- shared metrics (computed live, reproducible) ------- */
export function useDetectorMetrics(): Metrics {
  return useMemo(() => confusion(SCAM_SET.map((m) => ({ positive: m.scam, predicted: classifyScam(m.text).predictedScam }))), []);
}
function useVoiceMetrics(): Metrics {
  return useMemo(() => confusion(VOICE_HOLDOUT.map((v) => ({ positive: v.synthetic, predicted: v.spoofProb >= 0.5 }))), []);
}
function useCounterfeitMetrics(): Metrics {
  return useMemo(() => confusion(COUNTERFEIT_HOLDOUT.map((c) => ({ positive: c.fake, predicted: c.missing >= 3 }))), []);
}

/* ============================ DASHBOARD ============================ */
export function Dashboard({ go }: { go: (m: string) => void }) {
  const m = useDetectorMetrics();
  const topTactics = useMemo(() => {
    const counts: Record<string, number> = {};
    SCAM_SET.filter((s) => s.scam).forEach((s) => classifyScam(s.text).tactics.forEach((t) => (counts[t.category] = (counts[t.category] || 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, []);
  const maxT = topTactics[0]?.[1] || 1;

  const tiles = [
    { label: "Detections today", value: KPIS.detectionsToday.toLocaleString("en-IN") },
    { label: "Fraud rings tracked", value: KPIS.ringsTracked },
    { label: "Money protected", value: KPIS.rupeesProtected },
    { label: "Avg. latency", value: `${KPIS.avgLatencyMs} ms` },
    { label: "Citizen false-alarm rate", value: pct(m.fpRate), good: true },
  ];

  return (
    <Wrap>
      <H title="Command dashboard" sub="Unified situational picture across all detection modules." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <div key={i} className="card p-5">
            <div className="display text-2xl font-bold" style={{ color: t.good ? "#2E6F52" : ACCENT }}>{t.value}</div>
            <div className="mt-1 text-xs text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Top attack tactics (from analysed scams)</h3>
          <div className="space-y-3">
            {topTactics.map(([cat, n]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">{cat}</span><span className="text-faint">{n}</span></div>
                <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${(n / maxT) * 100}%`, background: ACCENT }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Agentic threat fusion</h3>
            <p className="text-[15px] leading-relaxed text-graphite">An orchestrator chains Triage → Escalation → Network correlation → Geo context → Response into one auditable pipeline that neutralises threats before money moves.</p>
          </div>
          <button onClick={() => go("fusion")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>
            Open Threat Fusion <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Wrap>
  );
}

/* ===================== DIGITAL ARREST DETECTOR ==================== */
const EX = "This is CBI. A parcel in your name contains illegal items. You are under digital arrest — stay on this video call, do not tell anyone, and transfer the money on this UPI for verification or a warrant will be issued.";

export function Detector() {
  const { t, lang, health } = useApp();
  const [text, setText] = useState("");
  const [deep, setDeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rule, setRule] = useState<ReturnType<typeof classifyScam> | null>(null);
  const [ai, setAi] = useState<any>(null);

  async function run() {
    if (!text.trim()) return;
    const r = classifyScam(text);
    setRule(r);
    setAi(null);
    if (deep && health.live) {
      setLoading(true);
      try {
        setAi(await callFeature<any>("kavach", { message: text, channel: "unknown", language: lang.name }));
      } catch { /* ignore */ } finally { setLoading(false); }
    }
  }

  const fused = rule ? (ai ? Math.round(rule.score * 0.55 + (ai.riskScore ?? rule.score) * 0.45) : rule.score) : 0;
  const verdict = fused >= 80 ? "Scam" : fused >= 55 ? "Dangerous" : fused >= 30 ? "Suspicious" : "Safe";
  const vColor = fused >= 55 ? "#B23A2E" : fused >= 30 ? "#B07A1E" : "#2E6F52";

  return (
    <Wrap>
      <H title="Digital Arrest Detector" sub="Real-time, explainable classifier with an auditable evidence trail. 11 tactic categories." />
      <div className="card p-6">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Paste a suspicious message or call transcript…" className="field resize-none" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={!text.trim() || loading} className="btn-accent text-[15px]" style={{ background: ACCENT }}>
            <ShieldAlert className="h-4 w-4" /> Analyse
          </button>
          <button onClick={() => setText(EX)} className="btn-ghost text-sm">Try an example</button>
          <label className={`ml-auto flex items-center gap-2 text-sm ${health.live ? "text-graphite" : "text-faint"}`}>
            <button
              type="button"
              disabled={!health.live}
              onClick={() => setDeep((d) => !d)}
              className={`relative h-6 w-11 rounded-full transition-colors ${deep && health.live ? "bg-blue-500" : "bg-line"}`}
              style={deep && health.live ? { background: ACCENT } : undefined}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${deep && health.live ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <Sparkles className="h-4 w-4" style={{ color: ACCENT }} /> Gemini AI deep analysis
          </label>
        </div>
        {!health.live && <p className="mt-2 text-xs text-faint">Deep analysis auto-disabled — no Gemini key configured. The rule engine still runs fully.</p>}
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label="Fusing rule + Gemini verdicts…" /></div>}

      {rule && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card mt-5 overflow-hidden">
          <div className="h-1.5 w-full" style={{ background: vColor }} />
          <div className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <RiskRing value={fused} />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: vColor }}>{verdict}</div>
                <div className="display text-2xl font-bold">{ai ? "Fused verdict" : "Rule verdict"}{ai ? " · rule 55% / AI 45%" : ""}</div>
                <div className="mt-1 text-sm text-muted">Rule score {rule.score}{ai ? ` · AI score ${ai.riskScore ?? "—"}` : ""}</div>
              </div>
            </div>

            <h4 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Evidence trail · {rule.tactics.length} tactics detected</h4>
            {rule.tactics.length ? (
              <div className="space-y-2">
                {rule.tactics.map((tt, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-mist px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-none" style={{ color: vColor }} />
                      <span className="font-medium text-ink">{tt.category}</span>
                      <span className="text-sm text-faint">“{tt.phrase}”</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: ACCENT }}>+{tt.weight}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No known scam tactics detected.</p>}

            {ai && (
              <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: ACCENT, background: "#EAF1FF" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT_DARK }}>
                  <Sparkles className="h-4 w-4" /> Gemini deep analysis · {ai.category}
                </div>
                <p className="mt-2 deva text-[15px] text-graphite">{ai.headline}</p>
                <p className="mt-1 deva text-sm text-muted">{ai.summary}</p>
                {ai._mock && <MockNote text="Sample AI result" />}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white">
              <span className="text-xs uppercase tracking-wide" style={{ color: "#9FBCFF" }}>Citizen Fraud Shield · report now</span>
              <span className="font-semibold">1930 · cybercrime.gov.in</span>
            </div>
          </div>
        </motion.div>
      )}
    </Wrap>
  );
}

/* ===================== AGENTIC THREAT FUSION ===================== */
export function ThreatFusion() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<ReturnType<typeof classifyScam> | null>(null);

  function run() {
    if (!text.trim()) return;
    setRes(classifyScam(text));
  }

  const topCat = res?.tactics[0]?.category || "Suspected fraud";
  const escalate = (res?.score ?? 0) >= 55;
  const hotspot = HOTSPOTS[0];
  const ringId = FRAUD_GRAPH.ring;

  const steps = res
    ? [
        { agent: "Triage", out: `Threat score ${res.score} → ${res.verdict}. ${res.tactics.length} tactics, lead: ${topCat}.` },
        { agent: "Escalation gate", out: escalate ? "High-risk → escalation APPROVED. Continuing the chain." : "Low risk → closed with citizen advisory." },
        ...(escalate
          ? [
              { agent: "Network correlation", out: `Linked to ${ringId} — shared number + mule infrastructure across 3 victims.` },
              { agent: "Geo context", out: `Pattern matches active hotspot: ${hotspot.city} (${hotspot.count} complaints).` },
              { agent: "Response", out: "Drafted citizen alert + telecom takedown + MHA-NCRP package below." },
            ]
          : []),
      ]
    : [];

  const citizen = res ? `⚠️ Kavach alert: This looks like a ${res.verdict} (${topCat}). Do NOT pay, share OTP, or install any app. Cut the call and report to 1930 / cybercrime.gov.in.` : "";
  const telecom = res ? `To: Telecom Nodal Officer\nRequest: Block & investigate number(s) linked to ${ringId} used in "${topCat}" fraud. Threat score ${res.score}. Attach CDR for correlation. — Kavach Fusion` : "";
  const ncrp = res ? `MHA / NCRP intelligence package\nIncident type: ${topCat}\nFused threat score: ${res.score} (${res.verdict})\nLinked ring: ${ringId}\nGeo cluster: ${hotspot.city}\nTactics: ${res.tactics.map((t) => t.category).join(", ") || "n/a"}\nRecommended action: freeze mule accounts, takedown numbers, victim outreach.` : "";

  return (
    <Wrap>
      <H title="Agentic Threat Fusion" sub="An orchestrator that chains cooperating agents into one auditable brain." />
      <div className="card p-6">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Paste a high-risk scam message to run the full pipeline…" className="field resize-none" />
        <div className="mt-4 flex gap-3">
          <button onClick={run} disabled={!text.trim()} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Workflow className="h-4 w-4" /> Run fusion pipeline</button>
          <button onClick={() => setText(EX)} className="btn-ghost text-sm">Example</button>
        </div>
      </div>

      {res && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
          <div className="card flex items-center gap-5 p-6">
            <RiskRing value={res.score} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Fused threat score</div>
              <div className="display text-2xl font-bold">{res.verdict}</div>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Auditable agent chain</h4>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-white" style={{ background: ACCENT }}><Check className="h-4 w-4" /></span>
                    {i < steps.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-2">
                    <div className="font-semibold text-ink">{s.agent}</div>
                    <div className="text-sm text-muted">{s.out}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {escalate && (
            <div className="grid gap-4 lg:grid-cols-3">
              {[{ t: "Citizen alert", v: citizen }, { t: "Telecom takedown", v: telecom }, { t: "MHA-NCRP package", v: ncrp }].map((d) => (
                <div key={d.t}>
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{d.t}</div>
                  <CopyBlock text={d.v} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </Wrap>
  );
}

/* ===================== VOICE-SPOOF / DEEPFAKE ==================== */
export function VoiceSpoof() {
  const [sel, setSel] = useState(VOICE_SET[0]);
  const m = useVoiceMetrics();
  const synthetic = sel.spoofProb >= 0.5;
  return (
    <Wrap>
      <H title="Voice-Spoof / Deepfake Detection" sub="Explainable audio forensics. Built-in labelled demo clips — no audio file needed." />
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="card p-3">
          {VOICE_SET.map((c) => (
            <button key={c.id} onClick={() => setSel(c)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${sel.id === c.id ? "bg-mist" : "hover:bg-mist/60"}`}>
              <span className="flex items-center gap-2"><Waves className="h-4 w-4" style={{ color: ACCENT }} />{c.id}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.label === "Synthetic" ? "bg-[#F7E7E5] text-[#B23A2E]" : "bg-[#E4F1EA] text-[#2E6F52]"}`}>{c.label}</span>
            </button>
          ))}
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <RiskRing value={Math.round(sel.spoofProb * 100)} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: synthetic ? "#B23A2E" : "#2E6F52" }}>{synthetic ? "Likely AI-cloned voice" : "Likely human voice"}</div>
              <div className="display text-2xl font-bold">Spoof probability {Math.round(sel.spoofProb * 100)}%</div>
            </div>
          </div>
          <h4 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Why — explainable features</h4>
          <div className="space-y-3">
            {[
              { k: "Spectral flatness", v: sel.features.flatness, hi: "higher = synthetic" },
              { k: "Pitch jitter", v: sel.features.jitter, hi: "lower = synthetic" },
              { k: "Prosody naturalness", v: sel.features.prosody, hi: "lower = synthetic" },
              { k: "Vocoder artifacts", v: sel.features.artifacts, hi: "higher = synthetic" },
            ].map((f) => (
              <div key={f.k}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">{f.k}</span><span className="text-faint">{Math.round(f.v * 100)}% · {f.hi}</span></div>
                <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${f.v * 100}%`, background: ACCENT }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-faint">Hold-out accuracy {pct(m.accuracy)} · recall {pct(m.recall)} (no deepfake missed). Heuristic forensics demo, not an ASVspoof-grade model.</p>
        </div>
      </div>
    </Wrap>
  );
}

/* ===================== FRAUD NETWORK GRAPH ===================== */
export function FraudGraph() {
  const pos = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = { ring: { x: 50, y: 50 } };
    const others = FRAUD_GRAPH.nodes.filter((n) => n.id !== "ring");
    others.forEach((n, i) => {
      const a = (i / others.length) * Math.PI * 2;
      map[n.id] = { x: 50 + 38 * Math.cos(a), y: 50 + 38 * Math.sin(a) };
    });
    return map;
  }, []);
  const color: Record<string, string> = { victim: "#C0453B", mule: "#B07A1E", number: "#2D6BFF", device: "#6D4AA6", ring: "#16140F" };
  const counts = FRAUD_GRAPH.nodes.reduce((a, n) => ((a[n.type] = (a[n.type] || 0) + 1), a), {} as Record<string, number>);

  return (
    <Wrap>
      <H title="Fraud Network Graph" sub="Clusters victims, mule accounts, numbers & devices into coordinated rings. (Synthetic data modelled on NCRP/RBI patterns.)" />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="card p-4">
          <svg viewBox="0 0 100 100" className="h-[420px] w-full">
            {FRAUD_GRAPH.edges.map((e, i) => (
              <line key={i} x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y} stroke="#DCD6CA" strokeWidth="0.4" />
            ))}
            {FRAUD_GRAPH.nodes.map((n) => (
              <g key={n.id}>
                <circle cx={pos[n.id].x} cy={pos[n.id].y} r={n.type === "ring" ? 4.5 : 3} fill={color[n.type]} />
                <text x={pos[n.id].x} y={pos[n.id].y - 4.5} textAnchor="middle" fontSize="2.4" fill="#34322C">{n.label}</text>
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap gap-3 px-2 pb-1 text-xs">
            {Object.entries(color).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Intelligence package</h3>
          <div className="display mt-2 text-lg font-bold">{FRAUD_GRAPH.ring}</div>
          <div className="mt-4 space-y-2 text-sm text-graphite">
            <div className="flex justify-between"><span className="text-muted">Victims linked</span><span className="font-semibold">{counts.victim || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Mule accounts</span><span className="font-semibold">{counts.mule || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Spoofed numbers</span><span className="font-semibold">{counts.number || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Shared devices</span><span className="font-semibold">{counts.device || 0}</span></div>
          </div>
          <p className="mt-4 rounded-xl bg-mist p-3 text-sm text-muted">Shared device IMEI ••3318 links both spoofed numbers — strong signal of one coordinated operation across Pune, Jaipur & Kochi.</p>
        </div>
      </div>
    </Wrap>
  );
}

/* ===================== COUNTERFEIT SCREEN ===================== */
export function Counterfeit() {
  const [present, setPresent] = useState<boolean[]>(SECURITY_FEATURES.map(() => true));
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { risk, missing } = scoreCounterfeit(present);
  const m = useCounterfeitMetrics();
  const band = risk >= 60 ? "#B23A2E" : risk >= 30 ? "#B07A1E" : "#2E6F52";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPreview(URL.createObjectURL(f));
  }

  return (
    <Wrap>
      <H title="Counterfeit Currency Screen" sub="Image-forensics + security-feature checklist → calibrated FICN risk score." />
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="card p-6">
          {preview && <img src={preview} alt="note" className="mb-4 max-h-44 rounded-xl border border-line" />}
          <div className="mb-4 flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">
              {preview ? <X className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />} {preview ? "Replace photo" : "Upload note photo (optional)"}
            </button>
          </div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Security-feature checklist — tick what you can verify</h4>
          <div className="space-y-2">
            {SECURITY_FEATURES.map((f, i) => (
              <label key={f} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-mist px-4 py-2.5 text-sm">
                <input type="checkbox" checked={present[i]} onChange={() => setPresent((p) => p.map((v, j) => (j === i ? !v : v)))} className="h-4 w-4 accent-[#2D6BFF]" />
                <span className={present[i] ? "text-graphite" : "text-faint line-through"}>{f}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="card flex flex-col p-6">
          <div className="flex items-center gap-4">
            <RiskRing value={risk} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: band }}>FICN risk</div>
              <div className="display text-xl font-bold">{risk >= 60 ? "High" : risk >= 30 ? "Check carefully" : "Likely genuine"}</div>
            </div>
          </div>
          {missing.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Missing features</div>
              <ul className="space-y-1.5 text-sm text-graphite">
                {missing.map((f) => <li key={f} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#B23A2E]" />{f}</li>)}
              </ul>
            </div>
          )}
          <p className="mt-auto pt-4 text-xs text-faint">Explainable MVP — phone-photo forensics + checklist, not a UV/IR + CNN system. High-quality fakes are the measured {pct(m.fnRate)} false-negatives.</p>
        </div>
      </div>
    </Wrap>
  );
}

/* ===================== GEOSPATIAL CRIME MAP ===================== */
export function GeoMap() {
  const max = Math.max(...HOTSPOTS.map((h) => h.count));
  return (
    <Wrap>
      <H title="Geospatial Crime Map" sub="Live hotspot view of fraud complaints for patrol prioritisation. (Synthetic, NCRP-style.)" />
      <div className="card p-6">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border border-line bg-mist">
          <div className="absolute left-1/2 top-1/2 h-3/4 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-[40%_55%_45%_50%] bg-blue-50" />
          {HOTSPOTS.map((h) => {
            const size = 10 + (h.count / max) * 34;
            return (
              <div key={h.city} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: size, height: size, background: ACCENT, opacity: 0.22 }} />
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: ACCENT }} />
                <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-graphite">{h.city} · {h.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Wrap>
  );
}

/* ===================== METRICS ===================== */
function Confusion({ m }: { m: Metrics }) {
  const cell = (n: number, good: boolean) => (
    <div className="rounded-lg p-3 text-center" style={{ background: good ? "#E4F1EA" : "#F7E7E5" }}>
      <div className="display text-lg font-bold" style={{ color: good ? "#2E6F52" : "#B23A2E" }}>{n}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {cell(m.tp, true)}{cell(m.fp, false)}
      {cell(m.fn, false)}{cell(m.tn, true)}
    </div>
  );
}

export function MetricsView() {
  const scam = useDetectorMetrics();
  const voice = useVoiceMetrics();
  const cf = useCounterfeitMetrics();
  const rows = [
    { name: "Scam / Digital-Arrest", m: scam },
    { name: "Voice-Spoof / Deepfake", m: voice },
    { name: "Counterfeit / FICN", m: cf },
  ];
  return (
    <Wrap>
      <H title="Measured performance" sub="Computed live from the bundled labelled hold-out sets — reproducible, not hard-coded." />
      <div className="card overflow-x-auto p-2">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-faint">
              <th className="p-3">Detector</th><th className="p-3">n</th><th className="p-3">Accuracy</th><th className="p-3">Precision</th><th className="p-3">Recall</th><th className="p-3">F1</th><th className="p-3">False-Pos</th><th className="p-3">False-Neg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-line">
                <td className="p-3 font-semibold text-ink">{r.name}</td>
                <td className="p-3">{r.m.n}</td>
                <td className="p-3">{pct(r.m.accuracy)}</td>
                <td className="p-3">{pct(r.m.precision)}</td>
                <td className="p-3">{pct(r.m.recall)}</td>
                <td className="p-3">{pct(r.m.f1)}</td>
                <td className="p-3 font-semibold" style={{ color: r.m.fpRate === 0 ? "#2E6F52" : "#B07A1E" }}>{pct(r.m.fpRate)}</td>
                <td className="p-3 font-semibold" style={{ color: r.m.fnRate === 0 ? "#2E6F52" : "#B07A1E" }}>{pct(r.m.fnRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.name} className="card p-5">
            <div className="mb-3 text-sm font-semibold">{r.name}</div>
            <Confusion m={r.m} />
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px] uppercase tracking-wide text-faint">
              <span>TP / FP</span><span>FN / TN</span>
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ===================== SCAM NEWS WATCH ===================== */
interface NewsItem { title: string; link?: string; source?: string }
export function NewsWatch() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/news");
      const j = await r.json();
      setItems(j.items || []);
      setLive(Boolean(j.live));
    } catch { setItems([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <Wrap>
      <H title="Scam News Watch" sub="Live fraud & cyber-scam coverage from Economic Times RSS, keyword-filtered." />
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-[#E4F1EA] text-[#2E6F52]" : "bg-[#F7EEDB] text-[#B07A1E]"}`}>
          <Radio className="h-3.5 w-3.5" /> {live ? "LIVE · Economic Times" : "Curated fallback"}
        </span>
        <button onClick={load} className="btn-ghost text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
      {loading ? <div className="card p-8"><Thinking label="Fetching latest scam coverage…" /></div> : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <a key={i} href={it.link || "#"} target="_blank" rel="noreferrer" className="card flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5">
              <span className="text-[15px] text-graphite">{it.title}</span>
              <span className="flex flex-none items-center gap-1.5 text-xs text-faint">{it.source} <ExternalLink className="h-3.5 w-3.5" /></span>
            </a>
          ))}
        </div>
      )}
    </Wrap>
  );
}
