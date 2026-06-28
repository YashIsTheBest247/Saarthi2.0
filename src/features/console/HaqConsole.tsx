import { useState } from "react";
import { LayoutDashboard, Search, Bookmark, Plus, Trash2, BadgeCheck, FileCheck, Check } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Haq } from "../Haq";

const ACCENT = "#1F7A55";
const STAGES = ["To apply", "Applied", "Received"];
interface Saved { id: number; name: string; stage: number }

const DOCS = [
  "Aadhaar card", "PAN card", "Bank passbook (account + IFSC)", "Aadhaar-linked mobile number",
  "Ration card", "Income certificate", "Caste certificate (if applicable)", "Domicile / residence proof",
  "Passport-size photographs", "Land records (for farmer schemes)", "Disability certificate (if applicable)", "Bank account seeded with Aadhaar (DBT)",
];

export function HaqConsole({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocal<Saved[]>("saarthi.haq.saved", []);
  const [name, setName] = useState("");
  const [docsDone, setDocsDone] = useLocal<number[]>("saarthi.haq.docs", []);
  const toggleDoc = (i: number) => setDocsDone(docsDone.includes(i) ? docsDone.filter((x) => x !== i) : [...docsDone, i]);

  const add = () => { if (!name.trim()) return; setSaved([...saved, { id: uid(), name, stage: 0 }]); setName(""); };
  const cycle = (id: number) => setSaved(saved.map((s) => (s.id === id ? { ...s, stage: (s.stage + 1) % STAGES.length } : s)));
  const applied = saved.filter((s) => s.stage >= 1).length;
  const received = saved.filter((s) => s.stage === 2).length;

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Schemes dashboard" sub="Track the benefits you've found and where each one stands." />
          <StatTiles accent={ACCENT} tiles={[
            { v: saved.length, l: "Schemes saved" },
            { v: applied, l: "Applied" },
            { v: received, l: "Received" },
            { v: saved.length - applied, l: "Still to apply" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Find more schemes</h3><p className="text-[15px] text-graphite">Tell Haq about yourself and discover every central + state scheme you likely qualify for.</p></div>
            <button onClick={() => go("find")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Find my schemes</button>
          </div>
        </Wrap>
      ),
    },
    { id: "find", label: "Find schemes", icon: Search, render: () => <Wrap><Haq embedded /></Wrap> },
    {
      id: "saved", label: "My schemes", icon: Bookmark,
      render: () => (
        <Wrap>
          <H title="Saved schemes tracker" sub="Save schemes and track your application from 'to apply' to 'received'." />
          <div className="card p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scheme name (e.g. PM-KISAN)" className="field" />
              <button onClick={add} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Save</button>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {saved.length === 0 ? <p className="text-sm text-muted">No schemes saved yet.</p> : saved.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3 p-4">
                <span className="text-[15px] font-medium text-graphite">{s.name}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => cycle(s.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: s.stage === 2 ? "#2E6F52" : s.stage === 1 ? "#C2641F" : "#7A7264" }}>
                    <BadgeCheck className="h-3.5 w-3.5" /> {STAGES[s.stage]}
                  </button>
                  <button onClick={() => setSaved(saved.filter((x) => x.id !== s.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({
    id: "docs", label: "Documents", icon: FileCheck,
    render: () => (
      <Wrap>
        <H title="Documents checklist" sub="Keep the papers most government schemes ask for ready — tick as you collect them." />
        <div className="card mb-5 p-6">
          <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">Ready</span><span className="text-faint">{docsDone.length}/{DOCS.length}</span></div>
          <div className="h-3 rounded-full bg-mist"><div className="h-3 rounded-full transition-all" style={{ width: `${(docsDone.length / DOCS.length) * 100}%`, background: ACCENT }} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOCS.map((d, i) => {
            const on = docsDone.includes(i);
            return (
              <button key={i} onClick={() => toggleDoc(i)} className="card flex items-center gap-3 p-4 text-left">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2" style={{ borderColor: on ? ACCENT : "#DCD6CA", background: on ? ACCENT : "transparent" }}>{on && <Check className="h-3.5 w-3.5 text-white" />}</span>
                <span className={`text-[15px] ${on ? "text-faint line-through" : "text-graphite"}`}>{d}</span>
              </button>
            );
          })}
        </div>
      </Wrap>
    ),
  });

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="haq" /> });
  return <AgentConsole agentKey="haq" platform="Scheme Finder" badge={Search} modules={modules} onBack={onBack} />;
}
