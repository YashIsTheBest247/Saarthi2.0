import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, LayoutDashboard, ScanText, Pill, Activity, ClipboardList,
  Send, ImagePlus, X, Plus, Trash2, Stethoscope, IndianRupee, Info, HeartPulse, Calendar, Siren,
} from "lucide-react";
import { useApp } from "../../app/AppContext";
import { featureByKey } from "../../lib/features";
import { Emergency } from "../Emergency";
import { callFeature, fileToInlineData } from "../../lib/api";
import { useVoice } from "../../hooks/useVoice";
import { LanguagePicker } from "../../components/LanguagePicker";
import { StatusBadge, Thinking, VoiceButton, ListBlock, ResultCard, MockNote, CopyBlock } from "../../components/ui";
import { AgentAvatar } from "../../components/AgentAvatar";

const ACCENT = "#C0453B";
const ACCENT_DARK = "#9A352D";
const TINT = "#FBE9EA";

/* ---------- localStorage hook ---------- */
function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV] as const;
}

interface Med { id: number; name: string; dose: string; timing: string; }
interface Vital { id: number; date: string; bp: string; sugar: string; weight: string; }

function H({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="display text-2xl font-bold deva">{title}</h2>
      {sub && <p className="mt-1 text-[15px] text-muted deva">{sub}</p>}
    </div>
  );
}
function Wrap({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="text-xs text-faint">—</div>;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 26 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================ DECODE ============================ */
function Decode({ onTrack }: { onTrack: (name: string) => void }) {
  const { t, lang } = useApp();
  const [mode, setMode] = useState<"prescription" | "symptom">("prescription");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(lang.speech, setText);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setImage(await fileToInlineData(f)); setPreview(URL.createObjectURL(f));
  }
  async function run() {
    if (!text.trim() && !image) return;
    setLoading(true); setRes(null);
    try { setRes(await callFeature<any>("sehat", { text, mode, image, language: lang.name })); } catch { /* */ } finally { setLoading(false); }
  }

  return (
    <Wrap>
      <H title={t("sv.decode.title")} sub={t("sv.decode.sub")} />
      <div className="card p-6">
        <div className="mb-4 inline-flex rounded-full border border-line bg-mist p-1">
          {([{ id: "prescription", label: t("m.modeRx"), icon: Pill }, { id: "symptom", label: t("m.modeSym"), icon: Stethoscope }] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMode(id)} className={`btn px-4 py-2 text-sm deva ${mode === id ? "text-white" : "text-graphite"}`} style={mode === id ? { background: ACCENT } : undefined}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        {preview && (
          <div className="relative mb-4 inline-block">
            <img src={preview} alt="rx" className="max-h-44 rounded-2xl border border-line" />
            <button onClick={() => { setImage(null); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"><X className="h-4 w-4" /></button>
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={mode === "prescription" ? t("m.phRx") : t("m.phSym")} className="field resize-none deva" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-accent text-[15px] deva" style={{ background: ACCENT }}><Send className="h-4 w-4" />{t("common.run")}</button>
          {mode === "prescription" && (<>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm deva"><ImagePlus className="h-4 w-4" />{t("common.upload")}</button>
          </>)}
          {voice.supported && <VoiceButton listening={voice.listening} onClick={() => (voice.listening ? voice.stop() : voice.start(text))} speakLabel={t("common.speak")} listeningLabel={t("common.listening")} />}
        </div>
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label={t("common.running")} /></div>}
      {res && !loading && (
        <div className="mt-5">
          <ResultCard accent={ACCENT}>
            <p className="display text-lg font-semibold leading-snug deva">{res.summary}</p>
            {res.medicines?.length ? (
              <div className="mt-5 space-y-3">
                {res.medicines.map((m: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-line bg-mist/50 p-4 deva">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-semibold text-ink">{m.brandName} <span className="text-sm font-normal text-muted">{m.genericName}</span></h4>
                      <button onClick={() => onTrack(`${m.brandName} (${m.genericName})`)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs hover:bg-paper" style={{ color: ACCENT }}><Plus className="h-3 w-3" /> track</button>
                    </div>
                    <p className="mt-1 text-sm text-graphite">{m.purpose}</p>
                    {(m.estGenericPrice || m.savingsNote) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        {m.estGenericPrice && <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-white" style={{ background: ACCENT }}><IndianRupee className="h-3 w-3" />{m.estGenericPrice}</span>}
                        {m.savingsNote && <span className="text-verdant">{m.savingsNote}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {res.triage?.length ? <div className="mt-5 deva"><ListBlock title={t("m.triage")} items={res.triage} accent={ACCENT} /></div> : null}
            {res.janAushadhiNote && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-verdant/20 bg-verdant/[0.05] p-4 deva">
                <Info className="mt-0.5 h-5 w-5 flex-none text-verdant" /><div><div className="text-sm font-semibold text-verdant">{t("m.jan")}</div><p className="mt-1 text-sm text-graphite">{res.janAushadhiNote}</p></div>
              </div>
            )}
            {res.whenToSeeDoctor?.length ? <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/[0.04] p-4 deva"><ListBlock title={t("m.doctor")} items={res.whenToSeeDoctor} tone="warn" /></div> : null}
            {res.disclaimer && <p className="mt-4 text-xs text-faint deva">{res.disclaimer}</p>}
            {res._mock && <MockNote text={t("common.sample")} />}
          </ResultCard>
        </div>
      )}
    </Wrap>
  );
}

/* ============================ MEDICINES ============================ */
function Medicines({ meds, setMeds }: { meds: Med[]; setMeds: (m: Med[]) => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({ name: "", dose: "", timing: "" });
  function add() {
    if (!form.name.trim()) return;
    setMeds([...meds, { id: Date.now(), ...form }]);
    setForm({ name: "", dose: "", timing: "" });
  }
  return (
    <Wrap>
      <H title={t("sv.meds.title")} sub={t("sv.meds.sub")} />
      <div className="card p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("sv.meds.name")} className="field deva" />
          <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder={t("sv.meds.dose")} className="field deva" />
          <input value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} placeholder={t("sv.meds.timing")} className="field deva" />
        </div>
        <button onClick={add} disabled={!form.name.trim()} className="btn-accent mt-4 text-[15px] deva" style={{ background: ACCENT }}><Plus className="h-4 w-4" />{t("sv.meds.add")}</button>
      </div>
      <div className="mt-5 space-y-2">
        {meds.length === 0 ? <p className="text-sm text-muted deva">{t("sv.meds.empty")}</p> : meds.map((m) => (
          <div key={m.id} className="card flex items-center justify-between gap-3 p-4 deva">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: ACCENT }}><Pill className="h-4 w-4" /></span>
              <div><div className="font-semibold text-ink">{m.name}</div><div className="text-sm text-muted">{[m.dose, m.timing].filter(Boolean).join(" · ")}</div></div>
            </div>
            <button onClick={() => setMeds(meds.filter((x) => x.id !== m.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ============================ VITALS ============================ */
function Vitals({ vitals, setVitals }: { vitals: Vital[]; setVitals: (v: Vital[]) => void }) {
  const { t } = useApp();
  const [form, setForm] = useState({ bp: "", sugar: "", weight: "" });
  function log() {
    if (!form.bp && !form.sugar && !form.weight) return;
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    setVitals([...vitals, { id: Date.now(), date, ...form }]);
    setForm({ bp: "", sugar: "", weight: "" });
  }
  const sugarVals = vitals.map((v) => parseFloat(v.sugar)).filter((n) => !isNaN(n));
  const weightVals = vitals.map((v) => parseFloat(v.weight)).filter((n) => !isNaN(n));
  return (
    <Wrap>
      <H title={t("sv.vitals.title")} sub={t("sv.vitals.sub")} />
      <div className="card p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={form.bp} onChange={(e) => setForm({ ...form, bp: e.target.value })} placeholder={t("sv.vitals.bp")} className="field deva" />
          <input value={form.sugar} onChange={(e) => setForm({ ...form, sugar: e.target.value })} placeholder={t("sv.vitals.sugar")} inputMode="numeric" className="field deva" />
          <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder={t("sv.vitals.weight")} inputMode="numeric" className="field deva" />
        </div>
        <button onClick={log} className="btn-accent mt-4 text-[15px] deva" style={{ background: ACCENT }}><Activity className="h-4 w-4" />{t("sv.vitals.log")}</button>
      </div>

      {vitals.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card p-5"><div className="mb-1 text-sm font-semibold text-graphite deva">{t("sv.vitals.sugar")}</div><Sparkline values={sugarVals} color={ACCENT} /><div className="mt-1 text-xs text-faint">{sugarVals.slice(-1)[0] ?? "—"} mg/dL</div></div>
          <div className="card p-5"><div className="mb-1 text-sm font-semibold text-graphite deva">{t("sv.vitals.weight")}</div><Sparkline values={weightVals} color={ACCENT_DARK} /><div className="mt-1 text-xs text-faint">{weightVals.slice(-1)[0] ?? "—"} kg</div></div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {vitals.length === 0 ? <p className="text-sm text-muted deva">{t("sv.vitals.empty")}</p> : [...vitals].reverse().map((v) => (
          <div key={v.id} className="card flex items-center justify-between gap-3 p-4 text-sm deva">
            <span className="flex items-center gap-2 text-muted"><Calendar className="h-4 w-4" />{v.date}</span>
            <span className="flex flex-wrap gap-x-4 text-graphite">{v.bp && <span>BP {v.bp}</span>}{v.sugar && <span>Sugar {v.sugar}</span>}{v.weight && <span>{v.weight} kg</span>}</span>
            <button onClick={() => setVitals(vitals.filter((x) => x.id !== v.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ============================ VISIT PREP ============================ */
function VisitPrep({ meds, vitals }: { meds: Med[]; vitals: Vital[] }) {
  const { t } = useApp();
  const [symptoms, setSymptoms] = useState("");
  const [summary, setSummary] = useState("");
  function build() {
    const latest = vitals[vitals.length - 1];
    const lines = [
      "VISIT SUMMARY — prepared with Saarthi · Asha",
      "",
      "Current medicines:",
      ...(meds.length ? meds.map((m) => `• ${m.name}${m.dose ? ` — ${m.dose}` : ""}${m.timing ? ` (${m.timing})` : ""}`) : ["• (none recorded)"]),
      "",
      "Latest vitals:",
      latest ? `• ${latest.date}: ${[latest.bp && `BP ${latest.bp}`, latest.sugar && `Sugar ${latest.sugar}`, latest.weight && `${latest.weight} kg`].filter(Boolean).join(", ")}` : "• (none recorded)",
      "",
      "Symptoms & questions for the doctor:",
      symptoms.trim() ? symptoms.trim() : "• (none added)",
    ];
    setSummary(lines.join("\n"));
  }
  const empty = !meds.length && !vitals.length && !symptoms.trim();
  return (
    <Wrap>
      <H title={t("sv.visit.title")} sub={t("sv.visit.sub")} />
      <div className="card p-6">
        <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} placeholder={t("sv.visit.symptoms")} className="field resize-none deva" />
        <button onClick={build} disabled={empty} className="btn-accent mt-4 text-[15px] deva" style={{ background: ACCENT }}><ClipboardList className="h-4 w-4" />{t("sv.visit.generate")}</button>
        {empty && <p className="mt-2 text-xs text-faint deva">{t("sv.visit.empty")}</p>}
      </div>
      {summary && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sv.visit.title2")}</div>
          <CopyBlock text={summary} />
        </div>
      )}
    </Wrap>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ meds, vitals }: { meds: Med[]; vitals: Vital[] }) {
  const { t } = useApp();
  const latest = vitals[vitals.length - 1];
  const tiles = [
    { v: meds.length, l: t("sv.t.meds") },
    { v: vitals.length, l: t("sv.t.vitals") },
    { v: latest?.sugar || "—", l: t("sv.t.sugar") },
    { v: latest?.weight ? `${latest.weight} kg` : "—", l: t("sv.t.weight") },
  ];
  return (
    <Wrap>
      <H title={t("sv.dash.title")} sub={t("sv.dash.sub")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tl, i) => (
          <div key={i} className="card p-5"><div className="display text-2xl font-bold" style={{ color: ACCENT }}>{tl.v}</div><div className="mt-1 text-xs text-muted deva">{tl.l}</div></div>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sv.dash.today")}</h3>
          {meds.length ? <ul className="space-y-2">{meds.slice(0, 5).map((m) => <li key={m.id} className="flex items-center gap-2 text-[15px] text-graphite deva"><Pill className="h-4 w-4" style={{ color: ACCENT }} />{m.name} <span className="text-faint">{m.timing}</span></li>)}</ul> : <p className="text-sm text-muted deva">{t("sv.dash.empty")}</p>}
        </div>
        <div className="card p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted deva">{t("sv.dash.recent")}</h3>
          {latest ? <div className="text-[15px] text-graphite deva"><div className="text-muted">{latest.date}</div><div className="mt-1 flex flex-wrap gap-x-4">{latest.bp && <span>BP {latest.bp}</span>}{latest.sugar && <span>Sugar {latest.sugar}</span>}{latest.weight && <span>{latest.weight} kg</span>}</div></div> : <p className="text-sm text-muted deva">{t("sv.dash.empty")}</p>}
        </div>
      </div>
    </Wrap>
  );
}

/* ============================ SHELL ============================ */
const MODULES = [
  { id: "dashboard", label: "sv.nav.dashboard", icon: LayoutDashboard },
  { id: "decode", label: "sv.nav.decode", icon: ScanText },
  { id: "meds", label: "sv.nav.meds", icon: Pill },
  { id: "vitals", label: "sv.nav.vitals", icon: Activity },
  { id: "visit", label: "sv.nav.visit", icon: ClipboardList },
  { id: "sos", label: "sv.nav.sos", icon: Siren },
];

export function SehatConsole({ onBack }: { onBack: () => void }) {
  const { t, health } = useApp();
  const meta = featureByKey("sehat");
  const [active, setActive] = useState("dashboard");
  const [meds, setMeds] = useLocal<Med[]>("saarthi.sehat.meds", []);
  const [vitals, setVitals] = useLocal<Vital[]>("saarthi.sehat.vitals", []);

  const render = () => {
    switch (active) {
      case "decode": return <Decode onTrack={(name) => { setMeds([...meds, { id: Date.now(), name, dose: "", timing: "" }]); setActive("meds"); }} />;
      case "meds": return <Medicines meds={meds} setMeds={setMeds} />;
      case "vitals": return <Vitals vitals={vitals} setVitals={setVitals} />;
      case "visit": return <VisitPrep meds={meds} vitals={vitals} />;
      case "sos": return <Emergency agentKey="sehat" />;
      default: return <Dashboard meds={meds} vitals={vitals} />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" />{t("common.back")}</button>
        <div className="flex items-center gap-2">
          <LanguagePicker compact />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div className="relative flex-none">
          <AgentAvatar photo={meta.photo} name={t(meta.nameKey)} tint={meta.tint} accent={meta.accent} rounded="rounded-2xl" className="h-16 w-16" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg text-white ring-2 ring-white" style={{ background: ACCENT }}><HeartPulse className="h-3.5 w-3.5" /></span>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="display text-3xl font-bold deva">{t(meta.nameKey)}</h1>
            <span className="text-base font-medium deva" style={{ color: ACCENT }}>{t("sv.platform")}</span>
          </div>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted deva">{t("sv.tagline")}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible">
          {MODULES.map((mod) => {
            const Icon = mod.icon; const on = active === mod.id;
            return (
              <button key={mod.id} onClick={() => setActive(mod.id)} className={`flex flex-none items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${on ? "text-white" : "border border-line bg-paper text-graphite hover:bg-mist lg:border-transparent lg:bg-transparent"}`} style={on ? { background: ACCENT } : undefined}>
                <Icon className="h-4 w-4 flex-none" /><span className="whitespace-nowrap deva">{t(mod.label)}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              {render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
