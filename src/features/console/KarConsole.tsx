import { LayoutDashboard, Calculator, ListChecks, Check } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles } from "./kit";
import { Kar } from "../kar/Kar";

const ACCENT = "#A06A1F";
const STEPS = [
  "Collect your Form-16 from your employer",
  "Verify TDS in AIS / Form 26AS",
  "Choose your regime (compare new vs old)",
  "Report capital gains (stocks / mutual funds)",
  "Claim deductions (only if old regime)",
  "File on incometax.gov.in",
  "E-verify within 30 days of filing",
];

export function KarConsole({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useLocal<number[]>("saarthi.kar.checklist", []);
  const toggle = (i: number) => setDone(done.includes(i) ? done.filter((x) => x !== i) : [...done, i]);
  const pct = Math.round((done.length / STEPS.length) * 100);

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Tax dashboard" sub="Your filing progress for AY 2026-27." />
          <StatTiles accent={ACCENT} tiles={[
            { v: `${pct}%`, l: "Filing checklist done" },
            { v: `${done.length}/${STEPS.length}`, l: "Steps completed" },
            { v: "New regime", l: "FY 2025-26 default" },
            { v: "31 Jul", l: "Usual filing due date" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Calculate your tax</h3><p className="text-[15px] text-graphite">Upload your Form-16 or enter details — Lekh computes your tax, compares regimes and exports a PDF.</p></div>
            <button onClick={() => go("calc")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Open calculator</button>
          </div>
        </Wrap>
      ),
    },
    { id: "calc", label: "Calculator", icon: Calculator, render: () => <Wrap><Kar embedded /></Wrap> },
    {
      id: "checklist", label: "Filing checklist", icon: ListChecks,
      render: () => (
        <Wrap>
          <H title="ITR filing checklist" sub="Tick each step so you file correctly and on time." />
          <div className="card mb-5 p-6">
            <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">Progress</span><span className="text-faint">{pct}%</span></div>
            <div className="h-3 rounded-full bg-mist"><div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: ACCENT }} /></div>
          </div>
          <div className="space-y-2">
            {STEPS.map((s, i) => {
              const on = done.includes(i);
              return (
                <button key={i} onClick={() => toggle(i)} className="card flex w-full items-center gap-3 p-4 text-left">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2" style={{ borderColor: on ? ACCENT : "#DCD6CA", background: on ? ACCENT : "transparent" }}>{on && <Check className="h-3.5 w-3.5 text-white" />}</span>
                  <span className={`text-[15px] ${on ? "text-faint line-through" : "text-graphite"}`}>{s}</span>
                </button>
              );
            })}
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="kar" /> });
  return <AgentConsole agentKey="kar" platform="Tax Filing Copilot" badge={Calculator} modules={modules} onBack={onBack} />;
}
