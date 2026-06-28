import { useState } from "react";
import { LayoutDashboard, ScanText, FolderOpen, Plus, Trash2 } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Samajh } from "../Samajh";

const ACCENT = "#C2641F";
interface Doc { id: number; title: string; note: string }

export function SamajhConsole({ onBack }: { onBack: () => void }) {
  const [docs, setDocs] = useLocal<Doc[]>("saarthi.samajh.docs", []);
  const [form, setForm] = useState({ title: "", note: "" });

  const add = () => { if (!form.title.trim()) return; setDocs([{ id: uid(), title: form.title, note: form.note }, ...docs]); setForm({ title: "", note: "" }); };

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Documents dashboard" sub="Decoded bills, letters and notices — kept in one place." />
          <StatTiles accent={ACCENT} tiles={[
            { v: docs.length, l: "Saved documents" },
            { v: docs[0]?.title ? "1" : "0", l: "Most recent" },
            { v: "any", l: "Bill · notice · policy" },
            { v: "₹0", l: "No charge, no login" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Decode a document</h3><p className="text-[15px] text-graphite">Paste or snap any confusing document — Vidya explains it in plain words and flags hidden charges.</p></div>
            <button onClick={() => go("decode")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Decode a document</button>
          </div>
        </Wrap>
      ),
    },
    { id: "decode", label: "Decode", icon: ScanText, render: () => <Wrap><Samajh embedded /></Wrap> },
    {
      id: "saved", label: "Saved", icon: FolderOpen,
      render: () => (
        <Wrap>
          <H title="Saved documents" sub="Keep a note of important documents and their key points." />
          <div className="card p-6">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title (e.g. LIC premium notice)" className="field" />
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Key points / deadline to remember" className="field mt-3 resize-none" />
            <button onClick={add} className="btn-accent mt-3 text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Save</button>
          </div>
          <div className="mt-5 space-y-2">
            {docs.length === 0 ? <p className="text-sm text-muted">No saved documents yet.</p> : docs.map((d) => (
              <div key={d.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">{d.title}</span>
                  <button onClick={() => setDocs(docs.filter((x) => x.id !== d.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
                {d.note && <p className="mt-1 text-sm text-muted">{d.note}</p>}
              </div>
            ))}
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="samajh" /> });
  return <AgentConsole agentKey="samajh" platform="Document Decoder" badge={ScanText} modules={modules} onBack={onBack} />;
}
