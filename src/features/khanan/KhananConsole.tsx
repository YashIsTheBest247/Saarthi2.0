import { useState } from "react";
import {
  ClipboardCheck, Coins, KeyRound, TrendingUp, Scale, BookOpen, Siren,
  Send, Loader2, Plus, Trash2, CalendarPlus, AlertTriangle, CheckCircle2, Truck,
  MapPin, FileText, ImagePlus, X, ListChecks, ExternalLink, Mountain, Gauge, ArrowUpRight, Check,
} from "lucide-react";
import { AgentConsole, ConsoleModule } from "../console/AgentConsole";
import { Emergency } from "../Emergency";
import { H, Wrap, StatTiles, useLocal, uid } from "../console/kit";
import { useApp } from "../../app/AppContext";
import { callFeature, fileToInlineData, FeatureKey } from "../../lib/api";
import { featureByKey } from "../../lib/features";
import { AgentAvatar } from "../../components/AgentAvatar";
import { BrandMark, LogoIcon } from "../../components/Logo";
import { Thinking, ListBlock, CopyBlock, MockNote } from "../../components/ui";
import { NotifyMe } from "../../components/NotifyMe";
import { downloadICS, sendToSmriti } from "../../lib/reminders";
import { clean } from "../../lib/text";

// Khanan hands off to the rest of the team.
const openAgent = (agent: FeatureKey) => window.dispatchEvent(new CustomEvent("saarthi:open", { detail: { agent } }));
const TEAM: { key: FeatureKey; note: string }[] = [
  { key: "samay", note: "Reminders & task planning" },
  { key: "haq", note: "Mining & MSME schemes you qualify for" },
  { key: "setu", note: "File a complaint / RTI / letter" },
  { key: "kar", note: "Income tax on your revenue" },
];
function WorksWith() {
  const { t } = useApp();
  return (
    <div className="mt-5 rounded-2xl border border-line bg-mist/40 p-4">
      <div className="mb-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT_DARK }}>Khanan works with</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEAM.map(({ key, note }) => {
          const f = featureByKey(key);
          return (
            <button key={key} onClick={() => openAgent(key)} className="flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5 text-left transition-colors hover:bg-mist">
              <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-lg" className="h-9 w-9 flex-none" />
              <div className="min-w-0"><div className="text-sm font-semibold text-ink deva">{t(f.nameKey)}</div><div className="truncate text-xs text-muted deva">{note}</div></div>
              <ArrowUpRight className="ml-auto h-4 w-4 flex-none text-faint" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SmritiButton({ tasks }: { tasks: { title: string; deadline?: string }[] }) {
  const [sent, setSent] = useState(false);
  const send = () => { tasks.forEach((t) => sendToSmriti({ title: t.title, deadline: t.deadline, priority: "High", source: "Khanan" })); setSent(true); };
  if (!tasks.length) return null;
  return (
    <button onClick={send} disabled={sent} className="btn-ghost text-sm disabled:opacity-70">
      {sent ? <><Check className="h-4 w-4 text-[#2E6F52]" /> Sent {tasks.length} to Smriti</> : <><CalendarPlus className="h-4 w-4" /> Send {tasks.length} to Smriti</>}
    </button>
  );
}

const ACCENT = "#B45309";
const ACCENT_DARK = "#8A3F07";
const LOC_KEY = "saarthi.khanan.loc";
const DEFAULT_LOC = "Dhanbad, Jharkhand";
const COALFIELDS = ["Dhanbad, Jharkhand", "Jharia, Jharkhand", "Bokaro, Jharkhand", "Ramgarh, Jharkhand", "Singrauli, Madhya Pradesh", "Korba, Chhattisgarh", "Talcher, Odisha", "Raniganj, West Bengal"];

const SEV: Record<string, string> = { Critical: "#B91C1C", High: "#C2641F", Medium: "#B07A1E", Low: "#2E6F52", Routine: "#2E6F52", Important: "#C2641F", Urgent: "#B91C1C" };
const RISK: Record<string, string> = { High: "#B91C1C", Medium: "#C2641F", Low: "#2E6F52" };
const readyColor = (n: number) => (n >= 80 ? "#2E6F52" : n >= 60 ? "#C2641F" : "#B91C1C");

/* ------------------------- Location selector ------------------------- */
function useLocation() { return useLocal<string>(LOC_KEY, ""); }
function LocationBar({ loc, setLoc }: { loc: string; setLoc: (s: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-mist/40 p-3">
      <MapPin className="h-4 w-4 flex-none" style={{ color: ACCENT }} />
      <span className="text-sm font-medium text-graphite deva">Location</span>
      <input
        list="khanan-coalfields"
        value={loc}
        onChange={(e) => setLoc(e.target.value)}
        placeholder={DEFAULT_LOC}
        className="field min-w-[12rem] flex-1 !rounded-xl !bg-paper !py-2 text-sm"
      />
      <datalist id="khanan-coalfields">{COALFIELDS.map((c) => <option key={c} value={c} />)}</datalist>
      {loc && <button onClick={() => setLoc("")} className="text-xs font-medium text-faint hover:text-ink">clear</button>}
    </div>
  );
}

/* ============================ 1 · COPILOT ============================ */
interface CopilotResult { answer: string; readiness: number; riskLevel: "Low" | "Medium" | "High"; pending?: { item: string; severity: string; detail?: string }[]; recommendedActions?: string[]; contacts?: { name: string; contact: string; why?: string }[]; drafts?: { title: string; body: string }[]; _mock?: boolean }
function Copilot() {
  const { lang } = useApp();
  const [loc, setLoc] = useLocation();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<CopilotResult | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setImage(await fileToInlineData(f)); setFileName(f.name); }

  async function run() {
    if (!question.trim() && !image) return;
    setLoading(true); setR(null);
    try { setR(await callFeature<CopilotResult>("khananCopilot", { question, context, location: loc, image, language: lang.name })); }
    catch { /* mock */ } finally { setLoading(false); }
  }

  return (
    <Wrap>
      <H title="AI Mine-Owner Copilot" sub="Ask in plain words — “Am I ready for a DGMS inspection?” — and get a readiness score, what's pending, and exactly what to fix." />
      <LocationBar loc={loc} setLoc={setLoc} />
      <div className="card p-5">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder="Am I ready for a DGMS inspection?" className="field resize-none deva" />
        <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} placeholder="Optional: a snapshot of your mine (production, workers, permits, what's done / pending)…" className="field mt-3 resize-none deva" />
        {image && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-line bg-mist px-3 py-2">
            <FileText className="h-4 w-4" style={{ color: ACCENT }} />
            <span className="max-w-[14rem] truncate text-sm text-graphite deva">{fileName}</span>
            <button onClick={() => { setImage(null); setFileName(""); }}><X className="h-4 w-4 text-faint" /></button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!question.trim() && !image)} className="btn-accent text-[15px]" style={{ background: ACCENT }}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Assessing…</> : <><BrandMark className="h-4 w-4" /> Ask Khanan</>}
          </button>
          <label className="btn-ghost cursor-pointer text-sm"><ImagePlus className="h-4 w-4" /> Add photo / PDF <input type="file" accept="image/*,application/pdf,.pdf" onChange={onFile} className="hidden" /></label>
        </div>
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label="Reading your operation & DGMS rules…" /></div>}

      {r && !loading && (
        <div className="mt-5 space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-none items-end gap-2">
                <span className="display text-5xl font-bold" style={{ color: readyColor(r.readiness) }}>{r.readiness}</span>
                <span className="mb-1 text-sm text-muted">/ 100 ready</span>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: RISK[r.riskLevel] }}>Risk: {r.riskLevel}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full transition-all" style={{ width: `${r.readiness}%`, background: readyColor(r.readiness) }} /></div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-graphite deva">{clean(r.answer)}</p>
          </div>

          {r.pending?.length ? (
            <div className="card p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted deva"><AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} /> Pending — fix these</h3>
              <div className="space-y-2">
                {r.pending.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3.5">
                    <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: SEV[p.severity] || "#888" }}>{p.severity}</span>
                    <div><div className="font-medium text-ink deva">{clean(p.item)}</div>{p.detail && <div className="text-sm text-muted deva">{clean(p.detail)}</div>}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r.recommendedActions?.length ? <div className="card p-6"><ListBlock title="Recommended actions" items={r.recommendedActions.map(clean)} tone="good" /></div> : null}

          {r.contacts?.length ? (
            <div className="card p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted deva"><AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} /> Who to contact</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {r.contacts.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-mist/40 p-3.5">
                    <div className="font-semibold text-ink deva">{c.name}</div>
                    <div className="mt-0.5 text-sm font-medium deva" style={{ color: ACCENT }}>{c.contact}</div>
                    {c.why && <div className="mt-0.5 text-xs text-muted deva">{clean(c.why)}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r.drafts?.length ? (
            <div className="card p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted deva"><FileText className="h-4 w-4" style={{ color: ACCENT }} /> Ready-to-send reports & emails</h3>
              <div className="space-y-4">
                {r.drafts.map((d, i) => (
                  <div key={i}>
                    <div className="mb-1.5 text-sm font-semibold text-graphite deva">{d.title}</div>
                    <CopyBlock text={d.body} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <SmritiButton tasks={((r.recommendedActions?.length ? r.recommendedActions : (r.pending || []).map((p) => p.item))).map((x) => ({ title: `[Khanan] ${clean(x)}` }))} />
          </div>
          <WorksWith />

          <NotifyMe accent={ACCENT} getPayload={() => ({
            title: `Mine inspection readiness: ${r.readiness}/100 (${r.riskLevel} risk)`,
            message: `${clean(r.answer)}\n\nPENDING:\n${(r.pending || []).map((p) => `• [${p.severity}] ${clean(p.item)}${p.detail ? " — " + clean(p.detail) : ""}`).join("\n")}\n\nACTIONS:\n${(r.recommendedActions || []).map((a) => "• " + clean(a)).join("\n")}`
              + (r.contacts?.length ? `\n\nWHO TO CONTACT:\n${r.contacts.map((c) => `• ${c.name}: ${c.contact}`).join("\n")}` : "")
              + (r.drafts?.length ? `\n\n${r.drafts.map((d) => `--- ${d.title} ---\n${d.body}`).join("\n\n")}` : ""),
          })} />
          {r._mock && <MockNote text="Sample readiness — add a Gemini key for a fully tailored assessment." />}
        </div>
      )}
    </Wrap>
  );
}

/* ====================== 2 · INSPECTION CHECKLIST ===================== */
const CHECKLIST: { cat: string; items: string[] }[] = [
  { cat: "Statutory registers & plans", items: ["Statutory registers up to date", "Approved mine plan & sections", "Safety Management Plan (SMP)", "Manager & competent persons appointed in writing"] },
  { cat: "Worker safety & training", items: ["Vocational training records current", "Worker competency certificates valid", "PPE issued & logged", "Initial / periodical medical exams done"] },
  { cat: "Machinery & electrical", items: ["Equipment inspection register signed", "Electrical installations tested", "Winding / haulage certificates valid", "Brakes & safety devices checked"] },
  { cat: "Ventilation & dust", items: ["Ventilation survey current", "Respirable-dust monitoring logged", "Gas / methane records (if applicable)"] },
  { cat: "Environment", items: ["Consent to Operate (SPCB) valid", "Dust-suppression records", "Water usage & discharge logged", "Plantation / afforestation records"] },
  { cat: "Emergency preparedness", items: ["Emergency response plan", "Mock rehearsals conducted", "First-aid & rescue arrangements"] },
];
const ALL_ITEMS = CHECKLIST.flatMap((c) => c.items);
function Inspection() {
  const [done, setDone] = useLocal<string[]>("saarthi.khanan.checklist", []);
  const toggle = (k: string) => setDone(done.includes(k) ? done.filter((x) => x !== k) : [...done, k]);
  const ready = Math.round((done.length / ALL_ITEMS.length) * 100);
  const gaps = ALL_ITEMS.filter((i) => !done.includes(i));
  return (
    <Wrap>
      <H title="Inspection readiness" sub="Tick what's in place. Your DGMS readiness score updates live — the gaps are what an inspector will flag." />
      <StatTiles accent={ACCENT} tiles={[
        { v: `${ready}%`, l: "Inspection ready" },
        { v: done.length, l: "In place" },
        { v: gaps.length, l: "Gaps to close" },
        { v: CHECKLIST.length, l: "Areas covered" },
      ]} />
      <div className="card mt-5 mb-5 p-5">
        <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">Readiness</span><span className="font-semibold" style={{ color: readyColor(ready) }}>{ready}%</span></div>
        <div className="h-3 rounded-full bg-mist"><div className="h-3 rounded-full transition-all" style={{ width: `${ready}%`, background: readyColor(ready) }} /></div>
      </div>
      <div className="space-y-5">
        {CHECKLIST.map((c) => (
          <div key={c.cat}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT_DARK }}>{c.cat}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {c.items.map((it) => {
                const on = done.includes(it);
                return (
                  <button key={it} onClick={() => toggle(it)} className="card flex items-center gap-3 p-3.5 text-left">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md border-2" style={{ borderColor: on ? ACCENT : "#DCD6CA", background: on ? ACCENT : "transparent" }}>{on && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</span>
                    <span className={`text-sm ${on ? "text-faint line-through" : "text-graphite"} deva`}>{it}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ========================= 3 · ROYALTY & REVENUE ===================== */
const MINERALS = [
  { name: "Coal — non-coking (G6–G9)", rate: 700 },
  { name: "Coal — coking", rate: 900 },
  { name: "Iron ore", rate: 800 },
  { name: "Manganese ore", rate: 600 },
  { name: "Bauxite", rate: 350 },
  { name: "Limestone", rate: 90 },
  { name: "Dolomite", rate: 100 },
  { name: "Minor mineral (sand/stone)", rate: 60 },
];
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
function Royalty() {
  const [mineral, setMineral] = useState(MINERALS[0].name);
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("");
  const suggested = MINERALS.find((m) => m.name === mineral)?.rate ?? 0;
  const onMineral = (name: string) => { setMineral(name); const m = MINERALS.find((x) => x.name === name); if (m) setRate(String(m.rate)); };
  const q = Math.max(0, parseFloat(qty) || 0);
  const rt = Math.max(0, parseFloat(rate) || 0);
  const valid = q > 0 && rt > 0;
  const royalty = q * rt;
  const dmf = royalty * 0.3;     // District Mineral Foundation — 30% of royalty (post-2015 leases)
  const nmet = royalty * 0.02;   // National Mineral Exploration Trust — 2%
  const total = royalty + dmf + nmet;
  const invoice = `ROYALTY STATEMENT — ${mineral}\nQuantity: ${q.toLocaleString("en-IN")} tonnes @ ${inr(rt)}/t\n\nRoyalty:           ${inr(royalty)}\nDMF (30%):         ${inr(dmf)}\nNMET (2%):         ${inr(nmet)}\n---------------------------\nTotal payable:     ${inr(total)}\n\n(Estimate — DMF/NMET on royalty; verify current rates with your state mining dept.)`;
  return (
    <Wrap>
      <H title="Royalty & revenue" sub="Mineral-wise royalty with DMF (30%) and NMET (2%) — a monthly estimate and a ready statement to file." />
      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm"><span className="mb-1 block font-medium text-graphite">Mineral</span>
            <select value={mineral} onChange={(e) => onMineral(e.target.value)} className="field cursor-pointer">{MINERALS.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}</select>
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-graphite">Quantity (tonnes / month)</span>
            <input type="number" inputMode="numeric" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 50000" className="field" />
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-graphite">Rate (₹/tonne)</span>
            <input type="number" inputMode="numeric" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder={`e.g. ${suggested}`} className="field" />
            <button type="button" onClick={() => setRate(String(suggested))} className="mt-1 text-xs font-medium" style={{ color: ACCENT }}>Use suggested ₹{suggested}/t</button>
          </label>
        </div>
      </div>

      {valid ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {([["Royalty", royalty], ["DMF (30%)", dmf], ["NMET (2%)", nmet], ["Total payable", total]] as [string, number][]).map(([l, v], i) => (
              <div key={i} className="card p-5" style={i === 3 ? { background: ACCENT, color: "#fff" } : undefined}>
                <div className={`text-xs uppercase tracking-wide ${i === 3 ? "text-white/80" : "text-muted"}`}>{l}</div>
                <div className="display mt-1 text-2xl font-bold" style={i === 3 ? undefined : { color: ACCENT }}>{inr(v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">Monthly statement</div>
            <CopyBlock text={invoice} />
          </div>
          <button onClick={() => openAgent("kar")} className="btn-ghost mt-4 text-sm"><ArrowUpRight className="h-4 w-4" /> Compute income tax on this revenue with Lekh</button>
          <p className="mt-3 text-xs text-faint deva">Estimate only — Indian royalty rates vary by mineral, grade and state notification. Edit the rate to match your latest IBM/state circular.</p>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted deva">Enter your monthly quantity and rate to see the royalty, DMF, NMET and a ready-to-file statement.</p>
      )}
    </Wrap>
  );
}

/* ========================= 4 · PERMITS & LICENCES ==================== */
interface Permit { id: number; name: string; authority: string; expiry: string }
function Permits() {
  const [list, setList] = useLocal<Permit[]>("saarthi.khanan.permits", []);
  const [name, setName] = useState("");
  const [authority, setAuthority] = useState("");
  const [expiry, setExpiry] = useState("");
  const add = () => { if (!name.trim() || !expiry) return; setList([...list, { id: uid(), name, authority, expiry }].sort((a, b) => a.expiry.localeCompare(b.expiry))); setName(""); setAuthority(""); setExpiry(""); };
  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const expiringSoon = list.filter((p) => daysLeft(p.expiry) <= 45).length;
  return (
    <Wrap>
      <H title="Permits & licences" sub="Track every permit's expiry. Get a colour-coded alert before it lapses — and add the renewal to your calendar or to Smriti." />
      <StatTiles accent={ACCENT} tiles={[
        { v: list.length, l: "Permits tracked" },
        { v: expiringSoon, l: "Expiring ≤ 45 days" },
        { v: list.filter((p) => daysLeft(p.expiry) < 0).length, l: "Expired" },
        { v: list.length - expiringSoon, l: "Healthy" },
      ]} />
      <div className="card mt-5 p-5">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1.2fr_auto_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Permit / licence (e.g. Mining lease)" className="field" />
          <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Authority (e.g. DMO / SPCB)" className="field" />
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="field" />
          <button onClick={add} className="btn-accent text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {list.length === 0 ? <p className="text-sm text-muted">No permits added yet.</p> : list.map((p) => {
          const dl = daysLeft(p.expiry);
          const color = dl < 0 ? "#B91C1C" : dl <= 45 ? "#C2641F" : "#2E6F52";
          const label = dl < 0 ? `Expired ${-dl}d ago` : `${dl} days left`;
          return (
            <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
              <KeyRound className="h-5 w-5 flex-none" style={{ color }} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink deva">{p.name}</div>
                <div className="text-xs text-muted deva">{p.authority || "—"} · expires {new Date(p.expiry).toLocaleDateString("en-IN")}</div>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: color }}>{label}</span>
              <button onClick={() => downloadICS([{ title: `Renew: ${p.name}`, deadline: new Date(p.expiry).toISOString() }], "permit-renewal.ics")} className="btn-ghost text-xs"><CalendarPlus className="h-3.5 w-3.5" /> .ics</button>
              <button onClick={() => { sendToSmriti({ title: `Renew permit: ${p.name}`, deadline: p.expiry, priority: "High", source: "Khanan" }); }} className="btn-ghost text-xs">Remind via Smriti</button>
              <button onClick={() => setList(list.filter((x) => x.id !== p.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

/* ===================== 5 · PREDICTIVE OPS + FLEET ==================== */
interface Pred { area: string; prediction: string; horizon?: string; confidence?: string; risk: string; action?: string }
interface Fleet { asset: string; issue: string; dueIn?: string; severity: string }
interface PredictResult { summary: string; predictions?: Pred[]; fleet?: Fleet[]; _mock?: boolean }
function Predictive() {
  const { lang } = useApp();
  const [loc, setLoc] = useLocation();
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<PredictResult | null>(null);
  async function run() {
    setLoading(true); setR(null);
    try { setR(await callFeature<PredictResult>("khananPredict", { context, location: loc, language: lang.name })); }
    catch { /* mock */ } finally { setLoading(false); }
  }
  return (
    <Wrap>
      <H title="Predictive operations" sub="Forecasts before they bite — revenue, royalty, permit expiry, compliance risk, cash flow, production, staffing, and predictive maintenance for your fleet." />
      <LocationBar loc={loc} setLoc={setLoc} />
      <div className="card p-5">
        <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="Your operation snapshot (optional)… e.g. ~50,000 t/month coal, 220 workers, 6 dumpers + 2 excavators, lease renewal in 9 months, two buyer payments overdue." className="field resize-none deva" />
        <button onClick={run} disabled={loading} className="btn-accent mt-3 text-[15px]" style={{ background: ACCENT }}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Forecasting…</> : <><TrendingUp className="h-4 w-4" /> Run forecast</>}
        </button>
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label="Projecting the months ahead…" /></div>}

      {r && !loading && (
        <div className="mt-5 space-y-4">
          <div className="card flex items-start gap-2 p-4"><span className="mt-0.5 inline-flex h-4 w-4 flex-none" style={{ color: ACCENT }}><BrandMark className="h-4 w-4" /></span><p className="text-sm text-graphite deva">{r.summary}</p></div>

          {r.predictions?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {r.predictions.map((p, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT_DARK }}>{p.area}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: RISK[p.risk] || "#888" }}>{p.risk}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-semibold text-ink deva">{p.prediction}</p>
                  <div className="mt-1 text-xs text-muted deva">{p.horizon}{p.confidence ? ` · ${p.confidence} confidence` : ""}</div>
                  {p.action && <div className="mt-2 text-sm text-graphite deva">→ {p.action}</div>}
                </div>
              ))}
            </div>
          ) : null}

          {r.fleet?.length ? (
            <div className="card p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted deva"><Truck className="h-4 w-4" style={{ color: ACCENT }} /> Fleet — predictive maintenance</h3>
              <div className="space-y-2">
                {r.fleet.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3.5">
                    <Gauge className="mt-0.5 h-4 w-4 flex-none" style={{ color: SEV[f.severity] || "#888" }} />
                    <div className="min-w-0 flex-1"><div className="font-medium text-ink deva">{f.asset}</div><div className="text-sm text-muted deva">{f.issue}{f.dueIn ? ` · due ${f.dueIn}` : ""}</div></div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: SEV[f.severity] || "#888" }}>{f.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <SmritiButton tasks={[...(r.fleet || []).map((f) => ({ title: `[Khanan] Service ${f.asset}: ${f.issue}`, deadline: f.dueIn })), ...(r.predictions || []).filter((p) => p.risk === "High").map((p) => ({ title: `[Khanan] ${p.area}: ${p.action || p.prediction}` }))]} />
          </div>
          <NotifyMe accent={ACCENT} getPayload={() => ({
            title: "Mine forecast & fleet alerts — Khanan",
            message: `${r.summary}\n\nFORECASTS:\n${(r.predictions || []).map((p) => `• [${p.risk}] ${p.area}: ${p.prediction}${p.action ? " → " + p.action : ""}`).join("\n")}\n\nFLEET:\n${(r.fleet || []).map((f) => `• [${f.severity}] ${f.asset}: ${f.issue}${f.dueIn ? " (due " + f.dueIn + ")" : ""}`).join("\n")}`,
          })} />
          {r._mock && <MockNote text="Sample forecast — add a Gemini key for predictions from your real numbers." />}
        </div>
      )}
    </Wrap>
  );
}

/* ======================== 6 · LEGAL & NOTICE ======================== */
interface NoticeResult { summary: string; severity: string; deadline?: string; explanation?: string[]; draftReply: string; documentsNeeded?: string[]; steps?: string[]; _mock?: boolean }
function Notice() {
  const { lang } = useApp();
  const [loc, setLoc] = useLocation();
  const [notice, setNotice] = useState("");
  const [image, setImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<NoticeResult | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setImage(await fileToInlineData(f)); setFileName(f.name); }
  async function run() {
    if (!notice.trim() && !image) return;
    setLoading(true); setR(null);
    try { setR(await callFeature<NoticeResult>("khananNotice", { notice, image, location: loc, language: lang.name })); }
    catch { /* mock */ } finally { setLoading(false); }
  }
  return (
    <Wrap>
      <H title="Legal & notices" sub="Paste or photograph a government / DGMS / pollution-board notice — get it in plain words, a ready reply, the deadline and what to attach." />
      <LocationBar loc={loc} setLoc={setLoc} />
      <div className="card p-5">
        {image && <div className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-line bg-mist px-3 py-2"><FileText className="h-4 w-4" style={{ color: ACCENT }} /><span className="max-w-[12rem] truncate text-sm deva">{fileName}</span><button onClick={() => { setImage(null); setFileName(""); }}><X className="h-4 w-4 text-faint" /></button></div>}
        <textarea value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} placeholder="Paste the notice text here, or upload a photo / PDF…" className="field resize-none deva" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={loading || (!notice.trim() && !image)} className="btn-accent text-[15px]" style={{ background: ACCENT }}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : <><Send className="h-4 w-4" /> Explain & draft reply</>}</button>
          <label className="btn-ghost cursor-pointer text-sm"><ImagePlus className="h-4 w-4" /> Upload <input type="file" accept="image/*,application/pdf,.pdf" onChange={onFile} className="hidden" /></label>
        </div>
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label="Understanding the notice…" /></div>}

      {r && !loading && (
        <div className="mt-5 space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: SEV[r.severity] || "#888" }}>{r.severity}</span>
              {r.deadline && <span className="text-sm font-medium deva" style={{ color: ACCENT_DARK }}>Deadline: {r.deadline}</span>}
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-ink deva">{r.summary}</p>
            {r.explanation?.length ? <div className="mt-4"><ListBlock title="In plain words" items={r.explanation} accent={ACCENT} /></div> : null}
          </div>
          <div className="card p-6">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted deva">Draft reply</div>
            <CopyBlock text={r.draftReply} />
          </div>
          <div className="grid gap-7 sm:grid-cols-2">
            {r.documentsNeeded?.length ? <div className="card p-6"><ListBlock title="Documents to attach" items={r.documentsNeeded} accent={ACCENT} /></div> : null}
            {r.steps?.length ? <div className="card p-6"><ListBlock title="What to do" items={r.steps} tone="good" /></div> : null}
          </div>
          <button onClick={() => openAgent("setu")} className="btn-ghost text-sm"><ArrowUpRight className="h-4 w-4" /> File a formal complaint / RTI with Adhrit</button>
          <NotifyMe accent={ACCENT} getPayload={() => ({ title: `Notice reply (${r.severity}) — deadline ${r.deadline || "n/a"}`, message: `${r.summary}\n\nREPLY:\n${r.draftReply}\n\nATTACH:\n${(r.documentsNeeded || []).map((d) => "• " + d).join("\n")}` })} />
          {r._mock && <MockNote text="Sample — add a Gemini key to analyse your actual notice." />}
        </div>
      )}
    </Wrap>
  );
}

/* ========================= 7 · GUIDES & FORMS ======================= */
interface Resource { name: string; type: string; detail?: string; link?: string }
interface GuideResult { summary: string; steps?: { title: string; detail?: string }[]; resources?: Resource[]; rights?: string[]; tips?: string[]; _mock?: boolean }
function linkHref(link: string) { const u = (link || "").trim(); if (!u || u.startsWith("[")) return null; const f = u.split(/\s|·|,/)[0]; return f.includes(".") ? (f.startsWith("http") ? f : `https://${f}`) : null; }
function Guides() {
  const { t, lang } = useApp();
  const [loc, setLoc] = useLocation();
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<GuideResult | null>(null);
  async function run() { if (!problem.trim()) return; setLoading(true); setR(null); try { setR(await callFeature<GuideResult>("khanan", { problem, location: loc, language: lang.name })); } catch { /* mock */ } finally { setLoading(false); } }
  const groups: Record<string, Resource[]> = {};
  (r?.resources || []).forEach((x) => { (groups[x.type || "Other"] ||= []).push(x); });
  return (
    <Wrap>
      <H title="Guides & forms" sub="Ask any mining process question — leases, permits, DGMS safety, clearances, worker rights — and get the steps, the exact forms & offices, and your rights." />
      <LocationBar loc={loc} setLoc={setLoc} />
      <div className="card p-5">
        <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} placeholder={t("kn.ph")} className="field resize-none deva" />
        <button onClick={run} disabled={loading || !problem.trim()} className="btn-accent mt-3 text-[15px]" style={{ background: ACCENT }}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.running")}</> : <><BookOpen className="h-4 w-4" /> {t("common.run")}</>}</button>
      </div>
      {loading && <div className="card mt-5 p-8"><Thinking label={t("common.running")} /></div>}
      {r && !loading && (
        <div className="mt-5"><div className="card p-6">
          <p className="display text-lg font-semibold leading-snug deva">{r.summary}</p>
          {r.steps?.length ? (
            <div className="mt-5"><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><ListChecks className="h-4 w-4" style={{ color: ACCENT }} /> {t("adv.steps")}</h4>
              <div className="space-y-2">{r.steps.map((s, i) => <div key={i} className="flex gap-3 rounded-2xl border border-line bg-paper p-3.5"><span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span><div><div className="font-medium text-ink deva">{s.title}</div>{s.detail && <div className="text-sm text-muted deva">{s.detail}</div>}</div></div>)}</div>
            </div>
          ) : null}
          {Object.keys(groups).length ? (
            <div className="mt-5"><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><FileText className="h-4 w-4" style={{ color: ACCENT }} /> {t("adv.resources")}</h4>
              <div className="space-y-4">{Object.entries(groups).map(([type, items]) => (
                <div key={type}><div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT_DARK }}>{type}</div>
                  <div className="grid gap-2 sm:grid-cols-2">{items.map((x, i) => {
                    const href = x.link ? linkHref(x.link) : null;
                    const cls = "block rounded-2xl border border-line bg-mist/40 p-3.5 transition-all duration-200" + (href ? " cursor-pointer hover:-translate-y-0.5 hover:border-faint hover:bg-paper hover:shadow-soft" : " hover:border-faint");
                    const inner = (<><div className="flex items-start justify-between gap-2"><span className="font-semibold text-ink deva">{x.name}</span>{href && <ExternalLink className="h-4 w-4 flex-none" style={{ color: ACCENT }} />}</div>{x.detail && <p className="mt-1 text-sm text-muted deva">{x.detail}</p>}{x.link && !href && <p className="mt-1 text-xs text-faint deva">{x.link}</p>}</>);
                    return href ? <a key={i} href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <div key={i} className={cls}>{inner}</div>;
                  })}</div>
                </div>
              ))}</div>
            </div>
          ) : null}
          <div className="mt-5 grid gap-7 sm:grid-cols-2 deva">
            {r.rights?.length ? <ListBlock title={t("adv.rights")} items={r.rights} accent={ACCENT} /> : null}
            {r.tips?.length ? <ListBlock title={t("adv.tips")} items={r.tips} tone="good" /> : null}
          </div>
          {r._mock && <MockNote text={t("common.sample")} />}
        </div><WorksWith /></div>
      )}
    </Wrap>
  );
}

/* ============================== CONSOLE ============================= */
export function KhananConsole({ onBack }: { onBack: () => void }) {
  const modules: ConsoleModule[] = [
    { id: "copilot", label: "Owner Copilot", icon: LogoIcon, render: () => <Copilot /> },
    { id: "inspection", label: "Inspection ready", icon: ClipboardCheck, render: () => <Inspection /> },
    { id: "predict", label: "Predictive ops", icon: TrendingUp, render: () => <Predictive /> },
    { id: "royalty", label: "Royalty & revenue", icon: Coins, render: () => <Royalty /> },
    { id: "permits", label: "Permits & licences", icon: KeyRound, render: () => <Permits /> },
    { id: "notice", label: "Legal & notices", icon: Scale, render: () => <Notice /> },
    { id: "guides", label: "Guides & forms", icon: BookOpen, render: () => <Guides /> },
    { id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="khanan" /> },
  ];
  return <AgentConsole agentKey="khanan" platform="Mining Compliance & Ops Copilot" badge={Mountain} modules={modules} onBack={onBack} />;
}
