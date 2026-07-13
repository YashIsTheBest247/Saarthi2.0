// Generate the MSME submission document (block diagrams + flow charts + screen placeholders).
// No name / contact details inside. Output filename has no spaces or special characters.
// Run: node scripts/gen-submission-docx.mjs
import { writeFile } from "node:fs/promises";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType, VerticalAlign,
} from "docx";

const INK = "16140F", MUTED = "666666", ACCENT = "2F6F8F", GREEN = "138A72", RED = "C0453B", AMBER = "B07A1E";
const line = (color) => ({ style: BorderStyle.SINGLE, size: 6, color, space: 6 });
const allBorders = (color) => ({ top: line(color), bottom: line(color), left: line(color), right: line(color) });
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

const H = (text, lvl = HeadingLevel.HEADING_1) => new Paragraph({ heading: lvl, spacing: { before: 260, after: 100 }, children: [new TextRun({ text, bold: true, color: INK })] });
const P = (text, opts = {}) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, size: 20, color: opts.color || INK, italics: opts.italics })] });
const caption = (text) => new Paragraph({ spacing: { before: 40, after: 160 }, children: [new TextRun({ text, italics: true, size: 18, color: MUTED })] });

// A stacked block (vertical flow): a bordered, shaded box.
const box = (title, detail, color = ACCENT) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 30, after: 30 },
  border: allBorders(color),
  shading: { type: ShadingType.CLEAR, color: "auto", fill: "F3F6F8" },
  children: [
    new TextRun({ text: title, bold: true, size: 21, color: INK }),
    ...(detail ? [new TextRun({ break: 1, text: detail, size: 17, color: MUTED })] : []),
  ],
});
const downArrow = () => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10 }, children: [new TextRun({ text: "▼", size: 22, color: ACCENT, bold: true })] });

// A horizontal flow row: box | → | box | → | box …
function hflow(items, color = ACCENT) {
  const cells = [];
  items.forEach((it, i) => {
    if (i > 0) cells.push(new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", bold: true, size: 26, color })] })] }));
    cells.push(new TableCell({
      width: { size: Math.floor(88 / items.length), type: WidthType.PERCENTAGE },
      borders: allBorders(color), shading: { type: ShadingType.CLEAR, color: "auto", fill: "F3F6F8" },
      margins: { top: 80, bottom: 80, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.t, bold: true, size: 18, color: INK })] }),
        ...(it.d ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.d, size: 15, color: MUTED })] })] : []),
      ],
    }));
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: cells })] });
}

// A data table (header + rows).
function dataTable(header, rows, widths) {
  const hdr = new TableRow({ tableHeader: true, children: header.map((h, i) => new TableCell({ width: { size: widths[i], type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, color: "auto", fill: "16140F" }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })] })) });
  const body = rows.map((r) => new TableRow({ children: r.map((c, i) => new TableCell({ width: { size: widths[i], type: WidthType.PERCENTAGE }, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: c, size: 17, color: INK })] })] })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: allBorders("BBBBBB"), rows: [hdr, ...body] });
}

// A labelled placeholder box for pasting a screenshot.
const shot = (label, note) => [
  new Paragraph({ spacing: { before: 160, after: 40 }, children: [new TextRun({ text: label, bold: true, size: 20, color: INK })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: note, size: 17, color: MUTED, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 120 }, border: allBorders("BBBBBB"), shading: { type: ShadingType.CLEAR, color: "auto", fill: "FAFAFA" }, children: [new TextRun({ text: "\n[ Paste screenshot here ]\n", size: 20, color: "999999" }), new TextRun({ break: 4, text: "", size: 20 })] }),
];

const children = [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Saarthi AI Workforce", bold: true, size: 40, color: INK })] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Rentable, autonomous AI employees that automate MSME back-office workflows", italics: true, size: 22, color: MUTED })] }),
  P("Block diagram, flow charts, and application screens. Live: saarthi20.vercel.app"),

  H("Figure 1 — System Architecture (block diagram)"),
  box("Users", "Web app  ·  Telegram bot  ·  REST API (ERP / cron / Zapier)", ACCENT),
  downArrow(),
  box("Express API (Vercel serverless function)", "/api/employees/:id/task  ·  /api/agent  ·  /api/tools/*", ACCENT),
  downArrow(),
  box("Orchestrator", "plan → act → observe → reflect → synthesize  (persona-scoped per employee)", GREEN),
  downArrow(),
  hflow([
    { t: "AI Employees", d: "personas over specialist skills" },
    { t: "Connectors", d: "GSTIN · Tally XML · e-way · WhatsApp" },
    { t: "Tenancy", d: "per-tenant API keys + metering" },
  ], GREEN),
  downArrow(),
  box("Google Gemini 2.5 Flash (multi-key rotation)", "→ Groq fallback  →  demo mocks   (so it never goes dark)", AMBER),
  caption("Figure 1: One serverless backend. The orchestrator runs the autonomous loop; employees are personas over the skills; connectors emit real artefacts; tenancy meters the rent API; the AI layer rotates keys and falls back gracefully."),

  H("Figure 2 — The Autonomous Agentic Loop (flow chart)"),
  hflow([{ t: "PLAN", d: "decompose the task" }, { t: "ACT", d: "run the skill" }, { t: "OBSERVE", d: "read results" }, { t: "REFLECT", d: "re-plan if needed" }, { t: "SYNTHESIZE", d: "finished work" }], ACCENT),
  caption("Figure 2: Unlike a chatbot, each employee plans a chain of steps, executes them, observes, re-plans, and hands back the finished, filing-ready deliverable."),

  H("Figure 3 — Rent & Integrate Flow"),
  hflow([
    { t: "MSME / ERP", d: "one API call" },
    { t: "POST /api/employees/:id/task", d: "x-api-key (metered)" },
    { t: "Autonomous run", d: "plan → act → synthesize" },
    { t: "Deliverable + artefacts", d: "Tally XML · GSTIN check · PDF/Word · calendar" },
  ], GREEN),
  caption("Figure 3: An organisation hires an employee and triggers it from its own systems; the finished work and integration-ready artefacts return as JSON."),

  H("Figure 4 — AI Employee ↔ MSME Problem Mapping"),
  dataTable(
    ["MSME problem", "AI employee", "Finished output"],
    [
      ["Access to finance", "Vitta · Finance & Schemes", "Scheme/loan match (Mudra/PMEGP/CGTMSE), bankable project report"],
      ["Delayed payments", "Rijul · Receivables & Samadhaan", "MSME Samadhaan complaint + Section-16 interest, demand notice"],
      ["Accounts & GST", "Meera · Accounts, GST & e-Invoicing", "GST invoice → Tally XML, e-invoice IRN, e-way bill"],
      ["Environment", "Prithvi · Environment & Water", "CPCB category, CTE/CTO, EPR, ZLD, BRSR"],
      ["Food / FMCG", "Anna · Foods, Beverages & FMCG", "FSSAI tier, compliant label, HACCP, PMFME subsidy"],
      ["Construction", "Devraj · Infrastructure & Construction", "Bill of Quantities, RERA, BOCW cess, tender"],
      ["Electronics / IT", "Tara · Electronics, IT & Telecom", "BIS-CRS, E-waste EPR, DPDP Act, PLI"],
      ["Metals / Auto / EV", "Kabir · Metals, Machinery & Mobility", "ARAI/AIS homologation, FAME-II, PLI-Auto, GeM"],
    ],
    [22, 30, 48],
  ),
  caption("Figure 4: Eight AI employees, 44 concrete functions, covering the MSME lifecycle: register → fund → comply → produce → sell → get paid."),

  H("Figure 5 — Application Screens"),
  P("Paste each screenshot into the box below its label. Recommended screens:"),
  ...shot("Screen 1 — Landing / hero: the full team and the Rent a fleet of AI employees section", "Shows the product framing (consumer agents + hireable AI Workforce)."),
  ...shot("Screen 2 — AI Workforce: the 8 employees as cards, filter by sub-sector", "The rentable fleet."),
  ...shot("Screen 3 — Assign a task to an employee: the finished deliverable + one-tap Tally XML + green GSTIN check", "Proves real, filing-ready output and integration artefacts."),
  ...shot("Screen 4 — Integrations console / API snippet: the one-line rent-and-integrate call", "The agent-as-a-service model."),
  ...shot("Screen 5 — Smriti-led Orchestrator graph: Smriti managing the full team", "The agentic orchestration."),
  ...shot("Screen 6 — Telegram bot: hire an AI employee / send a bill photo to decode", "Zero-install, bilingual access for MSME owners."),
];

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri" } } } },
  sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
});

const buf = await Packer.toBuffer(doc);
await writeFile("SaarthiAIWorkforceDiagrams.docx", buf);
console.log(`✓ SaarthiAIWorkforceDiagrams.docx (${(buf.length / 1024).toFixed(0)} KB)`);
