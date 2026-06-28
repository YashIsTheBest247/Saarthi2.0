import { useState } from "react";
import { LayoutDashboard, Sprout, CalendarDays, Plus, Trash2 } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Krishi } from "../Krishi";

const ACCENT = "#4B7A2B";
interface Entry { id: number; crop: string; activity: string; date: string }

export function KrishiConsole({ onBack }: { onBack: () => void }) {
  const [log, setLog] = useLocal<Entry[]>("saarthi.krishi.log", []);
  const [form, setForm] = useState({ crop: "", activity: "" });

  const add = () => {
    if (!form.crop.trim() || !form.activity.trim()) return;
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    setLog([{ id: uid(), crop: form.crop, activity: form.activity, date }, ...log]);
    setForm({ crop: "", activity: "" });
  };
  const crops = new Set(log.map((l) => l.crop.toLowerCase())).size;

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Farm dashboard" sub="Your crop activity and diagnoses in one place." />
          <StatTiles accent={ACCENT} tiles={[
            { v: log.length, l: "Log entries" },
            { v: crops, l: "Crops tracked" },
            { v: log[0]?.date || "—", l: "Last activity" },
            { v: "₹0", l: "Free advice, any language" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Diagnose a crop problem</h3><p className="text-[15px] text-graphite">Snap a photo of your crop or describe the problem — Bhupati diagnoses it and gives an action plan.</p></div>
            <button onClick={() => go("diagnose")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Diagnose now</button>
          </div>
        </Wrap>
      ),
    },
    { id: "diagnose", label: "Diagnose", icon: Sprout, render: () => <Wrap><Krishi embedded /></Wrap> },
    {
      id: "log", label: "Crop log", icon: CalendarDays,
      render: () => (
        <Wrap>
          <H title="Crop calendar & log" sub="Note sowing, spraying, irrigation and harvest so nothing slips." />
          <div className="card p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} placeholder="Crop (e.g. Tomato)" className="field" />
              <input value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Activity (e.g. sprayed neem oil)" className="field" />
              <button onClick={add} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Log</button>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {log.length === 0 ? <p className="text-sm text-muted">No entries yet.</p> : log.map((e) => (
              <div key={e.id} className="card flex items-center justify-between gap-3 p-4">
                <div><span className="font-medium text-ink">{e.crop}</span><span className="text-graphite"> — {e.activity}</span></div>
                <div className="flex items-center gap-3"><span className="text-sm text-faint">{e.date}</span><button onClick={() => setLog(log.filter((x) => x.id !== e.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="krishi" /> });
  return <AgentConsole agentKey="krishi" platform="Kisan Saathi" badge={Sprout} modules={modules} onBack={onBack} />;
}
