import { useEffect, useMemo, useState } from "react";
import { Plug, CheckCircle2, XCircle, Loader2, Download, MessageCircle, ChevronDown, ShieldCheck } from "lucide-react";
import { useApp } from "../app/AppContext";
import { getConnectors, validateGstin, tallyXml, ewayJson, waSend, Connector, GstinResult } from "../lib/api";

function download(name: string, text: string, type = "application/xml") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* The connector console: live status + working, real integration tools. */
export function Integrations() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  useEffect(() => { getConnectors().then(setConnectors); }, []);

  return (
    <div className="mt-4 card p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-sm font-bold text-ink deva">
        <Plug className="h-4 w-4" /> {t("int.title")}
        <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-graphite">{connectors.filter((c) => c.live).length}/{connectors.length} {t("int.live")}</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* status grid */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {connectors.map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded-2xl border border-line p-3">
                {c.live ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#138A72]" /> : <XCircle className="mt-0.5 h-4 w-4 flex-none text-muted" />}
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink deva">{c.name}</div>
                  <div className="text-[11px] text-muted deva">{c.needs ? `${t("int.needs")}: ${c.needs}` : c.note}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GstinTool />
            <WhatsAppTool />
            <TallyTool />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── GSTIN validator (real check-digit) ── */
function GstinTool() {
  const { t } = useApp();
  const [g, setG] = useState("27AAPFU0939F1ZV");
  const [res, setRes] = useState<GstinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setRes(await validateGstin(g.trim())); } catch { /* */ } finally { setBusy(false); } };
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink deva"><ShieldCheck className="h-4 w-4" /> {t("int.gstin")}</div>
      <div className="flex gap-2">
        <input value={g} onChange={(e) => setG(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" className="field flex-1 font-mono text-sm" />
        <button onClick={run} disabled={busy} className="btn-primary text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("int.check")}</button>
      </div>
      {res && (
        <div className={`mt-2 rounded-xl px-3 py-2 text-sm ${res.valid ? "bg-[#138A72]/10 text-[#0f6e5b]" : "bg-[#C0453B]/10 text-[#a53a31]"}`}>
          <div className="font-semibold">{res.valid ? t("int.valid") : t("int.invalid")}</div>
          <div className="text-xs">{res.reason}{res.state ? ` · ${res.state}` : ""}{res.pan ? ` · PAN ${res.pan}` : ""}</div>
        </div>
      )}
    </div>
  );
}

/* ── WhatsApp composer (keyless wa.me link, real) ── */
function WhatsAppTool() {
  const { t } = useApp();
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<{ link: string; note?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { const r = await waSend(phone.trim(), msg.trim()); setOut(r); } catch { /* */ } finally { setBusy(false); } };
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink deva"><MessageCircle className="h-4 w-4" /> {t("int.wa")}</div>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="field text-sm" />
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder={t("int.waMsg")} className="field mt-2 resize-none text-sm" />
      <button onClick={run} disabled={busy || !phone.trim()} className="btn-primary mt-2 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("int.waSend")}</button>
      {out && <a href={out.link} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold text-[#2D6BFF] underline">{t("int.waOpen")}</a>}
    </div>
  );
}

/* ── Tally voucher + e-way bill generator (real, import-ready) ── */
function TallyTool() {
  const { t } = useApp();
  const [party, setParty] = useState("Acme Traders");
  const [inv, setInv] = useState("INV-001");
  const [item, setItem] = useState("Widget");
  const [qty, setQty] = useState("120");
  const [rate, setRate] = useState("450");
  const [gstPct, setGstPct] = useState("18");
  const [busy, setBusy] = useState(false);

  const amount = useMemo(() => (Number(qty) || 0) * (Number(rate) || 0), [qty, rate]);
  const gstAmt = useMemo(() => amount * (Number(gstPct) || 0) / 100, [amount, gstPct]);

  const genTally = async () => {
    setBusy(true);
    try {
      const r = await tallyXml({ voucherNo: inv, party, date: new Date().toISOString().slice(0, 10),
        items: [{ name: item, qty: Number(qty), rate: Number(rate), amount }], gstAmount: gstAmt });
      download(`tally-${inv || "voucher"}.xml`, r.xml);
    } catch { /* */ } finally { setBusy(false); }
  };
  const genEway = async () => {
    setBusy(true);
    try {
      const r = await ewayJson({ docNo: inv, items: [{ name: item, qty: Number(qty), taxRate: Number(gstPct), taxable: amount }] });
      download(`eway-${inv || "bill"}.json`, JSON.stringify(r.payload, null, 2), "application/json");
    } catch { /* */ } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-line p-4 lg:col-span-2">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink deva"><Download className="h-4 w-4" /> {t("int.tally")}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input value={party} onChange={(e) => setParty(e.target.value)} placeholder={t("int.party")} className="field text-sm" />
        <input value={inv} onChange={(e) => setInv(e.target.value)} placeholder={t("int.invNo")} className="field text-sm" />
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder={t("int.item")} className="field text-sm" />
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("int.qty")} className="field text-sm" />
        <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder={t("int.rate")} className="field text-sm" />
        <input value={gstPct} onChange={(e) => setGstPct(e.target.value)} placeholder="GST %" className="field text-sm" />
      </div>
      <div className="mt-2 text-xs text-muted deva">{t("int.total")}: ₹{amount.toLocaleString("en-IN")} + GST ₹{gstAmt.toLocaleString("en-IN")} = <b>₹{(amount + gstAmt).toLocaleString("en-IN")}</b></div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={genTally} disabled={busy} className="btn-primary text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("int.tallyBtn")}</button>
        <button onClick={genEway} disabled={busy} className="btn-ghost text-sm"><Download className="h-4 w-4" /> {t("int.ewayBtn")}</button>
      </div>
    </div>
  );
}
