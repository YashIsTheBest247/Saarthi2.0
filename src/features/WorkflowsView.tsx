import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Workflow, Play, Loader2, Siren, CloudRain, CheckCircle2, Sparkle, Circle, CalendarPlus } from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES } from "../lib/features";
import { FeatureKey } from "../lib/api";
import { LanguagePicker } from "../components/LanguagePicker";
import { AgentAvatar } from "../components/AgentAvatar";
import { CopyBlock, ListBlock } from "../components/ui";
import { BrandMark } from "../components/Logo";
import { notify, downloadTasksICS } from "../lib/reminders";
import { WorkflowBuilder } from "./WorkflowBuilder";
import { Plus } from "lucide-react";

interface WfMeta { id: string; k: string; accent: string; agents: string[]; example: string }

const WF: WfMeta[] = [
  { id: "resolve-grievance", k: "wf.grievance", accent: "#2F6F8F", agents: ["samajh", "setu", "samay"], example: "I ordered a phone for ₹15,000; it came damaged and the seller refuses a refund." },
  { id: "msme-launch", k: "wf.msme", accent: "#138A72", agents: ["udyam", "haq", "samay"], example: "I want to start a small home-based pickle unit and sell online. What registrations, licences and schemes do I need?" },
  { id: "health-savings", k: "wf.health", accent: "#C0453B", agents: ["sehat", "samay"], example: "Glycomet 500 twice daily, Ecosprin 75 after dinner." },
  { id: "explainer", k: "wf.explainer", accent: "#6D4AA7", agents: ["pragyan", "samay"], example: "Explain how UPI works in simple terms, for a 60-second video." },
];

const agentMeta = (k: string) => FEATURES.find((f) => f.key === (k as FeatureKey));

// non-face nodes (utility steps that aren't one of the 11 agents)
const nonFace: Record<string, { icon: typeof Siren; color: string; labelKey: string }> = {
  weather: { icon: CloudRain, color: "#0E8FA8", labelKey: "wf.node.weather" },
  emergency: { icon: Siren, color: "#C0453B", labelKey: "wf.node.sos" },
};

interface StepResult { key: string; agent: string; label: string; data: any }

/** A single node (face or utility) used in every chain rendering. */
function Node({ agent, size = "h-8 w-8" }: { agent: string; size?: string }) {
  const { t } = useApp();
  const m = agentMeta(agent);
  if (m) return <AgentAvatar photo={m.photo} name={t(m.nameKey)} tint={m.tint} accent={m.accent} rounded="rounded-lg" className={`${size} flex-none`} />;
  const nf = nonFace[agent] || nonFace.emergency;
  const Icon = nf.icon;
  return <span className={`${size} flex flex-none items-center justify-center rounded-lg text-white`} style={{ background: nf.color }}><Icon className="h-4 w-4" /></span>;
}

/* compact per-agent rendering of a step's output */
function StepBody({ agent, data }: { agent: string; data: any }) {
  const { t } = useApp();
  if (!data) return null;
  const head = data.summary || data.headline || data.title || data.diagnosis || "";
  return (
    <div className="mt-2 space-y-3">
      {head && <p className="text-[15px] leading-relaxed text-graphite deva">{head}</p>}

      {agent === "weather" && data.forecast?.length ? (
        <div className="flex flex-wrap gap-2">{data.forecast.map((f: string, i: number) => <span key={i} className="rounded-full border border-line bg-mist px-3 py-1 text-xs text-graphite">{f}</span>)}</div>
      ) : null}
      {agent === "kavach" && (
        <div className="flex flex-wrap items-center gap-2">
          {data.verdict && <span className="rounded-full bg-[#B23A2E] px-3 py-1 text-xs font-bold text-white">{data.verdict} · {data.riskScore}</span>}
          {data.helpline && <span className="text-sm text-muted">{data.helpline}</span>}
        </div>
      )}
      {agent === "samajh" && data.watchOuts?.length ? <ListBlock title={t("wf.body.watchOuts")} items={data.watchOuts} tone="warn" /> : null}
      {agent === "setu" && (
        <>
          {data.authority && <div className="rounded-xl bg-mist p-3 text-sm deva"><b>{t("wf.body.authority")}:</b> {data.authority}</div>}
          {data.draftComplaint && <CopyBlock text={data.draftComplaint} />}
        </>
      )}
      {agent === "emergency" && data.immediateSteps?.length ? (
        <ListBlock title={t("wf.body.doNow")} items={data.immediateSteps.map((s: any) => s.step || s)} tone="warn" />
      ) : null}
      {agent === "emergency" && data.contacts?.length ? (
        <div className="flex flex-wrap gap-2">{data.contacts.map((c: any, i: number) => <span key={i} className="rounded-full border border-line bg-mist px-3 py-1 text-xs">{c.name}: {c.contact}</span>)}</div>
      ) : null}
      {agent === "krishi" && data.actionPlan?.length ? <ListBlock title={t("wf.body.actionPlan")} items={data.actionPlan.map((a: any) => a.step || a)} tone="good" /> : null}
      {agent === "haq" && data.schemes?.length ? <ListBlock title={t("wf.body.schemes")} items={data.schemes.map((s: any) => s.name || s)} accent="#2F6F8F" /> : null}
      {agent === "disha" && data.output && <CopyBlock text={data.output} />}
      {agent === "paisa" && data.plan?.length ? <ListBlock title={t("wf.body.savePlan")} items={data.plan} tone="good" /> : null}
      {agent === "paisa" && data.savingEstimate && <div className="text-sm font-semibold text-[#138A72]">{t("wf.body.saving")} {data.savingEstimate}</div>}
      {agent === "sehat" && data.medicines?.length ? (
        <ListBlock title={t("wf.body.generics")} items={data.medicines.map((m: any) => `${m.brandName} → ${m.genericName}${m.savingsNote ? ` (${m.savingsNote})` : ""}`)} accent="#C0453B" />
      ) : null}
      {agent === "study" && (
        <div className="space-y-2">
          {data.wordCount ? <div className="text-sm text-muted">{data.kind ? `${data.kind} · ` : ""}~{data.wordCount} {t("wf.body.words")}</div> : null}
          {data.sections?.[0]?.paragraphs?.[0] && <p className="text-sm leading-relaxed text-graphite deva line-clamp-3">{data.sections[0].paragraphs[0]}</p>}
          <div className="text-xs text-faint">{t("wf.body.exportNote")}</div>
        </div>
      )}
      {agent === "samay" && data.tasks?.length ? (
        <div className="space-y-2">
          <ListBlock title={t("wf.body.scheduled")} items={data.tasks.map((tk: any) => `${tk.title}${tk.deadline ? ` — ${tk.deadline}` : ""}`)} tone="good" />
          <button onClick={() => downloadTasksICS(data.tasks)} className="btn-ghost text-sm"><CalendarPlus className="h-4 w-4" /> {t("wf.body.addCal")}</button>
        </div>
      ) : null}
    </div>
  );
}

/** One-line chain of nodes used on the picker cards + runner header. */
function Chain({ agents }: { agents: string[] }) {
  return (
    <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto">
      {agents.map((a, i) => (
        <div key={i} className="flex flex-none items-center gap-1.5">
          <Node agent={a} />
          {i < agents.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-faint" />}
        </div>
      ))}
    </div>
  );
}

export function WorkflowsView({ onBack, initialId, initialBuild }: { onBack: () => void; initialId?: string; initialBuild?: boolean }) {
  const { t, lang } = useApp();
  const preset = initialId ? WF.find((w) => w.id === initialId) ?? null : null;
  const [sel, setSel] = useState<WfMeta | null>(preset);
  const [building, setBuilding] = useState(!!initialBuild);
  const [seed, setSeed] = useState(preset?.example ?? "");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(-1); // index currently executing (-1 = none)
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setSel(null); setSeed(""); setSteps([]); setActive(-1); setDone(false); setError("");
  }

  // Live, step-by-step run: each step is fetched in turn so the chain visibly progresses.
  async function run(wf: WfMeta) {
    if (!seed.trim()) return;
    setRunning(true); setSteps([]); setDone(false); setError(""); setActive(0);
    const today = new Date().toDateString();
    let results: Record<string, any> = {};
    const acc: StepResult[] = [];
    try {
      for (let i = 0; i < wf.agents.length; i++) {
        setActive(i);
        const r = await fetch("/api/workflow/step", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: wf.id, index: i, seed: { text: seed }, results, language: lang.name, today }),
        });
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        results = { ...results, [j.key]: j.data };
        acc.push({ key: j.key, agent: j.agent, label: j.label, data: j.data });
        setSteps([...acc]);
      }
      setDone(true);
      notify(t("wf.notify"), `${t(`${wf.k}.t`)} — ${acc.length} ${t("wf.notifyB")}`);
    } catch {
      setError(t("wf.err"));
    } finally {
      setActive(-1); setRunning(false);
    }
  }

  // translated step label, falling back to the server's English label
  const stepLabel = (key: string, fallback: string): string => {
    const k = `wf.step.${sel?.id ?? ""}.${key}`;
    const v = t(k);
    return v === k ? fallback : v;
  };

  // status of a node in the live pipeline: done / active / pending
  const statusOf = (i: number): "done" | "active" | "pending" => {
    if (i < steps.length) return "done";
    if (i === active && running) return "active";
    return "pending";
  };

  if (building) return <WorkflowBuilder onBack={() => setBuilding(false)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={sel ? reset : onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" />{sel ? t("wf.all") : t("common.back")}</button>
        <LanguagePicker compact />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-ink text-white"><Workflow className="h-7 w-7" /></span>
        <div>
          <h1 className="display text-3xl font-bold deva">{t("wf.title")}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted deva">{t("wf.sub")}</p>
        </div>
      </div>

      {/* picker */}
      {!sel && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button onClick={() => setBuilding(true)} className="group flex flex-col items-start rounded-2xl border-2 border-dashed border-line bg-paper/50 p-5 text-left transition-all hover:-translate-y-1 hover:border-[#2D6BFF] hover:shadow-float sm:col-span-2">
            <div className="flex w-full items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white" style={{ background: "#2D6BFF" }}><Plus className="h-5 w-5" /></span>
              <div>
                <div className="display text-lg font-bold deva">{t("wf.build")}</div>
                <p className="text-sm text-muted deva">{t("wf.buildSub")}</p>
              </div>
            </div>
          </button>
          {WF.map((wf) => (
            <button key={wf.id} onClick={() => { setSel(wf); setSeed(wf.example); setSteps([]); setDone(false); setError(""); }} className="card p-5 text-left transition-all hover:-translate-y-1 hover:shadow-float">
              <div className="display text-lg font-bold deva">{t(`${wf.k}.t`)}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted deva">{t(`${wf.k}.d`)}</p>
              <div className="mt-4"><Chain agents={wf.agents} /></div>
            </button>
          ))}
        </div>
      )}

      {/* runner */}
      {sel && (
        <div className="mt-8">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="display text-lg font-bold deva">{t(`${sel.k}.t`)}</div>
              <Chain agents={sel.agents} />
            </div>
            <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={4} placeholder={t(`${sel.k}.s`)} className="field mt-4 resize-none deva" />
            <button onClick={() => run(sel)} disabled={running || !seed.trim()} className="btn-accent mt-4 text-[15px]" style={{ background: sel.accent }}>
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("wf.running")}</> : <><Play className="h-4 w-4" /> {t("wf.run")}</>}
            </button>
          </div>

          {/* LIVE pipeline — shows each node progress in real time while running */}
          {(running || steps.length > 0) && (
            <div className="card mt-5 overflow-hidden p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <span className="relative flex h-2 w-2">
                  {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: sel.accent }} />}
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: running ? sel.accent : "#138A72" }} />
                </span>
                {running ? t("wf.working") : t("wf.complete")}
                <span className="ml-auto normal-case text-faint">{steps.length}/{sel.agents.length} {t("wf.steps")}</span>
              </div>
              <div className="no-scrollbar flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-1">
                {sel.agents.map((a, i) => {
                  const st = statusOf(i);
                  return (
                    <div key={i} className="flex flex-none items-center gap-2">
                      <motion.div
                        animate={st === "active" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                        transition={{ repeat: st === "active" ? Infinity : 0, duration: 1.1 }}
                        className="relative flex w-24 flex-col items-center gap-1.5 rounded-2xl border p-3 text-center"
                        style={{ borderColor: st === "pending" ? "var(--line,#e7e3da)" : sel.accent, background: st === "done" ? "rgba(19,138,114,0.06)" : st === "active" ? `${sel.accent}10` : "transparent", opacity: st === "pending" ? 0.5 : 1 }}
                      >
                        <Node agent={a} />
                        <span className="line-clamp-1 text-[11px] font-medium text-graphite deva">{nonFace[a] ? t(nonFace[a].labelKey) : t(agentMeta(a)?.nameKey || "")}</span>
                        <span className="absolute -right-1.5 -top-1.5">
                          {st === "done" && <CheckCircle2 className="h-4 w-4 text-[#138A72]" fill="white" />}
                          {st === "active" && <Loader2 className="h-4 w-4 animate-spin" style={{ color: sel.accent }} />}
                          {st === "pending" && <Circle className="h-4 w-4 text-faint" />}
                        </span>
                      </motion.div>
                      {i < sel.agents.length - 1 && <ArrowRight className="h-4 w-4 flex-none" style={{ color: i < steps.length ? sel.accent : "#cfcabd" }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && <div className="card mt-5 p-6 text-sm text-muted">{error}</div>}

          {/* step results stream in as each agent finishes */}
          <div className="mt-6 space-y-3">
            <AnimatePresence>
              {steps.map((s, i) => (
                <motion.div key={s.key + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: sel.accent }}>{i + 1}</span>
                    <Node agent={s.agent} />
                    <span className="font-semibold text-ink deva">{stepLabel(s.key, s.label)}</span>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-[#138A72]" />
                  </div>
                  <StepBody agent={s.agent} data={s.data} />
                </motion.div>
              ))}
            </AnimatePresence>

            {done && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 rounded-2xl bg-mist py-4 text-sm font-medium text-graphite">
                <span className="inline-flex h-4 w-4" style={{ color: sel.accent }}><BrandMark className="h-4 w-4" /></span> {t("wf.doneA")} {steps.length} {t("wf.doneB")}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
