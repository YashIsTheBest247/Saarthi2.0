import { useState } from "react";
import { LayoutDashboard, Scale, FolderOpen, Plus, Trash2, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Setu } from "../Setu";

const ACCENT = "#2F6F8F";
const STAGES = ["Drafted", "Filed with company", "Escalated to 1915", "Consumer forum"];
interface Case { id: number; title: string; stage: number }

const RIGHTS = [
  { t: "Defective product / no refund", law: "Consumer Protection Act, 2019", body: "You can demand a refund, replacement or compensation for defective goods or deficient service. File free at the National Consumer Helpline or e-Daakhil.", link: "consumerhelpline.gov.in · 1915" },
  { t: "Right to information", law: "RTI Act, 2005", body: "Any citizen can ask a public authority for records and a reply within 30 days for ₹10. Powerful to unstick a stalled government file.", link: "rtionline.gov.in" },
  { t: "Wrong / inflated utility bill", law: "Electricity Act + consumer forum", body: "Dispute in writing with the discom's grievance cell; if unresolved, approach the Consumer Grievance Redressal Forum (CGRF).", link: "Your state discom portal" },
  { t: "Govt service denied / delayed", law: "CPGRAMS / Citizen Charters", body: "Lodge a public grievance against any central/state department and track it to closure.", link: "pgportal.gov.in" },
  { t: "Online / UPI fraud", law: "IT Act + cyber rules", body: "Report within the golden hour to freeze the transfer. The bank must act on flagged fraudulent transactions.", link: "cybercrime.gov.in · 1930" },
  { t: "Unfair bank / loan charges", law: "RBI ombudsman scheme", body: "If the bank doesn't resolve in 30 days, escalate free to the RBI Banking Ombudsman.", link: "cms.rbi.org.in" },
];

export function SetuConsole({ onBack }: { onBack: () => void }) {
  const [cases, setCases] = useLocal<Case[]>("saarthi.setu.cases", []);
  const [title, setTitle] = useState("");

  const add = () => { if (!title.trim()) return; setCases([...cases, { id: uid(), title, stage: 0 }]); setTitle(""); };
  const advance = (id: number) => setCases(cases.map((c) => (c.id === id ? { ...c, stage: Math.min(c.stage + 1, STAGES.length - 1) } : c)));
  const escalated = cases.filter((c) => c.stage >= 2).length;

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Grievance dashboard" sub="Every complaint you're fighting, and how far it's gone." />
          <StatTiles accent={ACCENT} tiles={[
            { v: cases.length, l: "Open cases" },
            { v: escalated, l: "Escalated" },
            { v: cases.filter((c) => c.stage === 3).length, l: "At consumer forum" },
            { v: cases.filter((c) => c.stage === 0).length, l: "Drafted, not filed" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Start a new complaint</h3><p className="text-[15px] text-graphite">Describe any problem and Adhrit finds the authority, drafts the complaint and maps the escalation path.</p></div>
            <button onClick={() => go("new")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>New complaint</button>
          </div>
        </Wrap>
      ),
    },
    { id: "new", label: "New complaint", icon: Scale, render: () => <Wrap><Setu embedded /></Wrap> },
    {
      id: "cases", label: "Case tracker", icon: FolderOpen,
      render: () => (
        <Wrap>
          <H title="Case tracker" sub="Log each complaint and advance it through the escalation ladder." />
          <div className="card p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case (e.g. Refund refused — Flipkart order)" className="field" />
              <button onClick={add} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Add</button>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {cases.length === 0 ? <p className="text-sm text-muted">No cases tracked yet.</p> : cases.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium text-graphite">{c.title}</span>
                  <button onClick={() => setCases(cases.filter((x) => x.id !== c.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: ACCENT }}>{STAGES[c.stage]}</span>
                  {c.stage < STAGES.length - 1 && <button onClick={() => advance(c.id)} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>advance <ChevronRight className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({
    id: "rights", label: "Know your rights", icon: BookOpen,
    render: () => (
      <Wrap>
        <H title="Rights library" sub="Plain-language know-your-rights cards for common Indian problems." />
        <div className="grid gap-4 sm:grid-cols-2">
          {RIGHTS.map((r) => (
            <div key={r.t} className="card p-5">
              <span className="pill mb-2" style={{ color: ACCENT }}><BookOpen className="h-3.5 w-3.5" /> {r.law}</span>
              <h3 className="display text-lg font-bold">{r.t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{r.body}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: ACCENT }}><ExternalLink className="h-3.5 w-3.5" /> {r.link}</div>
            </div>
          ))}
        </div>
      </Wrap>
    ),
  });

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="setu" /> });
  return <AgentConsole agentKey="setu" platform="Grievance Autopilot" badge={Scale} modules={modules} onBack={onBack} />;
}
