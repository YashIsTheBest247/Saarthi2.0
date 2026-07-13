// ─────────────────────────────────────────────────────────────────────────────
// Saarthi AI Workforce · real integration connectors
//
// These are the "tools" that let an AI employee INTEGRATE with an organisation's
// systems and produce integration-ready artefacts — deterministic and real
// (no fake external calls). Where a connector needs the org's own credentials
// (WhatsApp Business, a GSP e-way API), it degrades to a genuinely useful,
// keyless artefact (import-ready XML/JSON, a wa.me deep link).
//
//   • validateGSTIN  — the official GSTIN check-digit algorithm (on-device, exact)
//   • tallyInvoiceXML — Tally.ERP/Prime import-ready Sales voucher XML
//   • ewayBillPayload — NIC e-way-bill JSON payload (upload-ready shape)
//   • whatsappLink / sendDispatch — wa.me deep link (keyless) + optional provider
// ─────────────────────────────────────────────────────────────────────────────

/* ---- Indian GST state codes (first 2 digits of a GSTIN) ---- */
export const GST_STATES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The official GSTIN check-digit (15th char) computed from the first 14 chars. */
export function gstinCheckDigit(first14) {
  const mod = GSTIN_ALPHABET.length; // 36
  let factor = 2, sum = 0;
  for (let i = first14.length - 1; i >= 0; i--) {
    const cp = GSTIN_ALPHABET.indexOf(first14[i].toUpperCase());
    if (cp < 0) return null;
    let addend = factor * cp;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / mod) + (addend % mod);
    sum += addend;
  }
  return GSTIN_ALPHABET[(mod - (sum % mod)) % mod];
}

/** Validate an Indian GSTIN: format, state code, embedded PAN and check digit. */
export function validateGSTIN(raw) {
  const gstin = String(raw || "").trim().toUpperCase();
  const fmt = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!fmt.test(gstin)) return { gstin, valid: false, reason: "Format invalid (expected 15-char GSTIN)." };
  const stateCode = gstin.slice(0, 2);
  const state = GST_STATES[stateCode];
  if (!state) return { gstin, valid: false, reason: `Unknown state code '${stateCode}'.` };
  const pan = gstin.slice(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return { gstin, valid: false, reason: "Embedded PAN invalid." };
  const expected = gstinCheckDigit(gstin.slice(0, 14));
  const ok = expected && expected === gstin[14];
  return {
    gstin, valid: !!ok, stateCode, state, pan,
    checkDigit: gstin[14], expectedCheckDigit: expected,
    reason: ok ? "Valid GSTIN (format, state, PAN and check digit all pass)." : `Check digit mismatch (expected ${expected}).`,
  };
}

/* ---- helpers ---- */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n2 = (x) => (Math.round((Number(x) || 0) * 100) / 100).toFixed(2);
// Tally wants dates as YYYYMMDD; accept an ISO/whatever string and best-effort format.
const tallyDate = (d) => {
  const s = String(d || "").replace(/[^0-9]/g, "");
  if (/^\d{8}$/.test(s)) return s;
  return "20250401"; // safe default (caller should pass a real date)
};

/**
 * Tally.ERP 9 / Tally Prime import-ready Sales voucher XML.
 * inv = { date, voucherNo, party, salesLedger?, items:[{name, qty, rate, amount}], amount, gstLedger?, gstAmount?, narration? }
 * Post this to the Tally HTTP gateway (default http://localhost:9000) or import via XML.
 */
export function tallyInvoiceXML(inv = {}) {
  const party = esc(inv.party || "Cash");
  const salesLedger = esc(inv.salesLedger || "Sales");
  const date = tallyDate(inv.date);
  const items = Array.isArray(inv.items) ? inv.items : [];
  const base = items.length ? items.reduce((s, it) => s + (Number(it.amount) || (Number(it.qty) || 0) * (Number(it.rate) || 0)), 0) : (Number(inv.amount) || 0);
  const gst = Number(inv.gstAmount) || 0;
  const total = base + gst;

  const inventory = items.map((it) => `
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${esc(it.name)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <RATE>${n2(it.rate)}/nos</RATE>
            <ACTUALQTY>${n2(it.qty)} nos</ACTUALQTY>
            <BILLEDQTY>${n2(it.qty)} nos</BILLEDQTY>
            <AMOUNT>${n2(it.amount || (Number(it.qty) || 0) * (Number(it.rate) || 0))}</AMOUNT>
          </ALLINVENTORYENTRIES.LIST>`).join("");

  const gstLedger = gst > 0 ? `
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(inv.gstLedger || "Output GST")}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${n2(gst)}</AMOUNT>
        </LEDGERENTRIES.LIST>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${esc(inv.voucherNo || "AUTO")}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
            <NARRATION>${esc(inv.narration || "")}</NARRATION>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${party}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${n2(total)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${n2(base)}</AMOUNT>
            </LEDGERENTRIES.LIST>${gstLedger}${inventory}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * NIC e-way-bill JSON payload (upload-ready shape for the EWB portal / GSP API).
 * bill = { docNo, docDate, fromGstin, fromPin, fromState, toGstin, toPin, toState,
 *          items:[{name, hsn, qty, taxRate, taxable}], transMode, transDistance, vehicleNo }
 */
export function ewayBillPayload(bill = {}) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const taxable = items.reduce((s, it) => s + (Number(it.taxable) || 0), 0);
  const stCode = (g, fallback) => (String(g || "").slice(0, 2) || fallback || "");
  return {
    version: "1.0.0621",
    billLists: [{
      supplyType: bill.supplyType || "O",       // O = outward
      subSupplyType: bill.subSupplyType || "1",  // 1 = supply
      docType: bill.docType || "INV",
      docNo: bill.docNo || "AUTO",
      docDate: bill.docDate || "01/04/2025",
      fromGstin: bill.fromGstin || "URP",
      fromPincode: Number(bill.fromPin) || 0,
      fromStateCode: Number(stCode(bill.fromGstin, bill.fromState)) || 0,
      toGstin: bill.toGstin || "URP",
      toPincode: Number(bill.toPin) || 0,
      toStateCode: Number(stCode(bill.toGstin, bill.toState)) || 0,
      totalValue: taxable,
      cgstValue: 0, sgstValue: 0, igstValue: 0,
      totInvValue: taxable,
      transporterId: bill.transporterId || "",
      transMode: bill.transMode || "1",          // 1 = road
      transDistance: String(bill.transDistance || "0"),
      vehicleNo: bill.vehicleNo || "",
      vehicleType: bill.vehicleType || "R",
      itemList: items.map((it, i) => ({
        itemNo: i + 1,
        productName: it.name || `Item ${i + 1}`,
        hsnCode: Number(it.hsn) || 0,
        quantity: Number(it.qty) || 0,
        qtyUnit: it.unit || "NOS",
        taxableAmount: Number(it.taxable) || 0,
        cgstRate: 0, sgstRate: 0,
        igstRate: Number(it.taxRate) || 0,
      })),
    }],
  };
}

/* ---- WhatsApp ---- */
/** Keyless wa.me deep link (opens WhatsApp with prefilled text) — always real. */
export function whatsappLink(phone, text) {
  const num = String(phone || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text || "")}`;
}

/**
 * Send via a provider if the org configured one (WHATSAPP_API_URL + WHATSAPP_API_TOKEN,
 * e.g. Meta Cloud API / Gupshup); otherwise return the wa.me link to open manually.
 */
export async function sendWhatsApp(phone, text) {
  const url = process.env.WHATSAPP_API_URL, token = process.env.WHATSAPP_API_TOKEN;
  const link = whatsappLink(phone, text);
  if (!url || !token) return { ok: false, mode: "link", link, note: "No provider configured — open the link to send." };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: String(phone).replace(/[^0-9]/g, ""), type: "text", text: { body: text } }),
    });
    return { ok: r.ok, mode: "provider", status: r.status, link };
  } catch (err) {
    return { ok: false, mode: "link", link, note: String(err?.message || err) };
  }
}

/** Which connectors are live vs. need the org's credentials (for the console). */
export function connectorStatus() {
  return [
    { id: "gstin", name: "GSTIN validation", live: true, needs: null, note: "On-device check-digit algorithm." },
    { id: "tally", name: "Tally voucher (XML)", live: true, needs: null, note: "Import-ready Sales voucher XML." },
    { id: "eway", name: "E-way bill (JSON)", live: true, needs: null, note: "NIC upload-ready payload." },
    { id: "whatsapp", name: "WhatsApp", live: true, needs: (process.env.WHATSAPP_API_URL ? null : "WHATSAPP_API_URL/TOKEN for auto-send"), note: "Keyless wa.me link; provider send optional." },
    { id: "email", name: "Email (SMTP)", live: !!process.env.SMTP_HOST, needs: process.env.SMTP_HOST ? null : "SMTP_* env", note: "Send deliverables + .ics." },
    { id: "sms", name: "SMS", live: !!(process.env.FAST2SMS_KEY || process.env.TEXTBELT_KEY), needs: (process.env.FAST2SMS_KEY || process.env.TEXTBELT_KEY) ? null : "FAST2SMS_KEY", note: "Transactional SMS." },
  ];
}
