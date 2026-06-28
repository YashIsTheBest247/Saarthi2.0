import { useState } from "react";
import { LayoutDashboard, Wallet, PiggyBank, Plus, Trash2, Calculator, TrendingUp } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Siren } from "lucide-react";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles, uid } from "./kit";
import { Paisa } from "../Paisa";
import { inr } from "../kar/taxEngine";

const ACCENT = "#138A72";
interface Sub { id: number; name: string; amount: string }
const num = (s: string) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };

export function PaisaConsole({ onBack }: { onBack: () => void }) {
  const [income, setIncome] = useLocal("saarthi.paisa.income", "");
  const [subs, setSubs] = useLocal<Sub[]>("saarthi.paisa.subs", []);
  const [form, setForm] = useState({ name: "", amount: "" });
  const [emi, setEmi] = useState({ principal: "", rate: "", months: "" });
  const [sip, setSip] = useState({ monthly: "", ret: "", years: "" });

  const total = subs.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const inc = parseFloat(income) || 0;
  const remaining = inc - total;

  // EMI
  const P = num(emi.principal), r = num(emi.rate) / 1200, n = num(emi.months);
  const emiVal = r > 0 && n > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : n > 0 ? P / n : 0;
  const emiTotal = emiVal * n, emiInterest = emiTotal - P;
  // SIP
  const M = num(sip.monthly), i = num(sip.ret) / 1200, sn = num(sip.years) * 12;
  const sipFV = i > 0 ? M * ((Math.pow(1 + i, sn) - 1) / i) * (1 + i) : M * sn;
  const sipInvested = M * sn, sipGain = sipFV - sipInvested;

  const add = () => {
    if (!form.name.trim() || !form.amount.trim()) return;
    setSubs([...subs, { id: uid(), name: form.name, amount: form.amount }]);
    setForm({ name: "", amount: "" });
  };

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Money dashboard" sub="Your recurring spends and budget at a glance." />
          <StatTiles accent={ACCENT} tiles={[
            { v: inr(total), l: "Recurring / month" },
            { v: subs.length, l: "Active subscriptions" },
            { v: inc ? inr(inc) : "—", l: "Monthly income" },
            { v: inc ? inr(remaining) : "—", l: "Left after recurring" },
          ]} />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recurring spends</h3>
              {subs.length ? <ul className="space-y-2">{subs.slice(0, 6).map((s) => <li key={s.id} className="flex justify-between text-[15px] text-graphite"><span>{s.name}</span><span className="font-medium">{inr(parseFloat(s.amount) || 0)}</span></li>)}</ul> : <p className="text-sm text-muted">Add recurring spends in the Budget tab.</p>}
            </div>
            <div className="card flex flex-col justify-between p-6">
              <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Analyse a month</h3><p className="text-[15px] text-graphite">Paste your bank SMS or spends and let Nidhi find the leaks and build a save plan.</p></div>
              <button onClick={() => go("analyse")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Analyse my spends</button>
            </div>
          </div>
        </Wrap>
      ),
    },
    {
      id: "analyse", label: "Analyse", icon: Wallet,
      render: () => <Wrap><Paisa embedded /></Wrap>,
    },
    {
      id: "budget", label: "Budget", icon: PiggyBank,
      render: () => (
        <Wrap>
          <H title="Budget & subscriptions" sub="Track recurring spends so nothing silently drains your account." />
          <div className="card p-6">
            <label className="mb-1.5 block text-sm font-medium text-graphite">Monthly income (optional)</label>
            <input value={income} onChange={(e) => setIncome(e.target.value)} inputMode="numeric" placeholder="e.g. 60000" className="field mb-5" />
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Subscription / recurring (e.g. Netflix)" className="field" />
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="₹ / month" inputMode="numeric" className="field" />
            </div>
            <button onClick={add} className="btn-accent mt-4 text-[15px]" style={{ background: ACCENT }}><Plus className="h-4 w-4" /> Add</button>
          </div>
          {inc > 0 && (
            <>
              <div className="card mt-5 p-6">
                <div className="mb-1 flex justify-between text-sm"><span className="text-graphite">Recurring vs income</span><span className="text-faint">{inr(total)} / {inr(inc)}</span></div>
                <div className="h-3 rounded-full bg-mist"><div className="h-3 rounded-full" style={{ width: `${Math.min(100, (total / inc) * 100)}%`, background: total > inc ? "#B23A2E" : ACCENT }} /></div>
              </div>
              <div className="card mt-5 p-6">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Suggested 50 / 30 / 20 split</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: "Needs 50%", v: inc * 0.5 }, { l: "Wants 30%", v: inc * 0.3 }, { l: "Savings 20%", v: inc * 0.2 }].map((b) => (
                    <div key={b.l} className="rounded-2xl border border-line bg-mist p-4 text-center"><div className="display text-lg font-bold" style={{ color: ACCENT }}>{inr(b.v)}</div><div className="mt-1 text-xs text-muted">{b.l}</div></div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="mt-5 space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="card flex items-center justify-between p-4">
                <span className="text-[15px] text-graphite">{s.name}</span>
                <div className="flex items-center gap-4"><span className="font-medium">{inr(parseFloat(s.amount) || 0)}</span><button onClick={() => setSubs(subs.filter((x) => x.id !== s.id))} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        </Wrap>
      ),
    },
    {
      id: "calc", label: "Calculators", icon: Calculator,
      render: () => (
        <Wrap>
          <H title="Money calculators" sub="Plan loans and investments — figures update live." />
          <div className="grid gap-5 lg:grid-cols-2">
            {/* EMI */}
            <div className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><Calculator className="h-4 w-4" style={{ color: ACCENT }} /> Loan EMI</h3>
              <div className="space-y-3">
                <label className="block"><span className="mb-1 block text-xs text-muted">Loan amount (₹)</span><input value={emi.principal} onChange={(e) => setEmi({ ...emi, principal: e.target.value })} inputMode="numeric" className="field" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1 block text-xs text-muted">Interest % p.a.</span><input value={emi.rate} onChange={(e) => setEmi({ ...emi, rate: e.target.value })} inputMode="decimal" className="field" /></label>
                  <label className="block"><span className="mb-1 block text-xs text-muted">Tenure (months)</span><input value={emi.months} onChange={(e) => setEmi({ ...emi, months: e.target.value })} inputMode="numeric" className="field" /></label>
                </div>
              </div>
              <div className="mt-5 rounded-2xl p-5 text-white" style={{ background: ACCENT }}>
                <div className="text-xs uppercase tracking-wide text-white/80">Monthly EMI</div>
                <div className="display text-3xl font-bold">{inr(Math.round(emiVal))}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-line bg-mist p-3"><div className="text-xs text-faint">Total interest</div><div className="font-semibold">{inr(Math.round(emiInterest))}</div></div>
                <div className="rounded-xl border border-line bg-mist p-3"><div className="text-xs text-faint">Total payment</div><div className="font-semibold">{inr(Math.round(emiTotal))}</div></div>
              </div>
            </div>
            {/* SIP */}
            <div className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted"><TrendingUp className="h-4 w-4" style={{ color: ACCENT }} /> SIP / investment</h3>
              <div className="space-y-3">
                <label className="block"><span className="mb-1 block text-xs text-muted">Monthly investment (₹)</span><input value={sip.monthly} onChange={(e) => setSip({ ...sip, monthly: e.target.value })} inputMode="numeric" className="field" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1 block text-xs text-muted">Return % p.a.</span><input value={sip.ret} onChange={(e) => setSip({ ...sip, ret: e.target.value })} inputMode="decimal" className="field" /></label>
                  <label className="block"><span className="mb-1 block text-xs text-muted">Years</span><input value={sip.years} onChange={(e) => setSip({ ...sip, years: e.target.value })} inputMode="numeric" className="field" /></label>
                </div>
              </div>
              <div className="mt-5 rounded-2xl p-5 text-white" style={{ background: ACCENT }}>
                <div className="text-xs uppercase tracking-wide text-white/80">Future value</div>
                <div className="display text-3xl font-bold">{inr(Math.round(sipFV))}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-line bg-mist p-3"><div className="text-xs text-faint">Invested</div><div className="font-semibold">{inr(Math.round(sipInvested))}</div></div>
                <div className="rounded-xl border border-line bg-mist p-3"><div className="text-xs text-faint">Est. gains</div><div className="font-semibold text-verdant">{inr(Math.round(sipGain))}</div></div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-faint">Estimates for guidance — actual returns vary with the market.</p>
        </Wrap>
      ),
    },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="paisa" /> });
  return <AgentConsole agentKey="paisa" platform="Money Autopilot" badge={Wallet} modules={modules} onBack={onBack} />;
}
