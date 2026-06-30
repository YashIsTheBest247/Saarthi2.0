// Turn Acharya's structured content into a polished, professional document.
// The doc libraries (docx / pdfkit / pptxgenjs) are imported LAZILY inside each
// builder so that merely importing this module never loads them — keeping the
// Vercel serverless cold-start (and the Telegram webhook + all agents) safe.

export const slug = (s) => (String(s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Document");

export const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const norm = (c = {}) => ({
  title: c.title || "Untitled",
  subtitle: c.subtitle || "",
  kind: c.kind || "essay",
  sections: Array.isArray(c.sections) ? c.sections : [],
  slides: Array.isArray(c.slides) ? c.slides : [],
  references: Array.isArray(c.references) ? c.references : [],
});

/* ------------------------------- DOCX ------------------------------- */
// Word document: Times New Roman, 12pt body, justified, 1.5 spacing, 1" margins.
export async function buildDocx(content, { font = "Times New Roman", size = 12 } = {}) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, LevelFormat } = await import("docx");
  const c = norm(content);
  const half = size * 2; // docx sizes are in half-points
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: c.title, bold: true, size: Math.round(half * 1.45), font })],
  }));
  if (c.subtitle) children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: c.subtitle, italics: true, size: Math.round(half * 1.05), font })],
  }));

  for (const sec of c.sections) {
    if (sec.heading) children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: sec.heading, bold: true, size: Math.round(half * 1.1), font })],
    }));
    for (const para of (sec.paragraphs || [])) {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 360, after: 120 }, // 360 = 1.5 line spacing
        indent: { firstLine: 480 },         // ~0.33" first-line indent
        children: [new TextRun({ text: para, size: half, font })],
      }));
    }
  }

  if (c.references.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 }, children: [new TextRun({ text: "References", bold: true, size: Math.round(half * 1.1), font })] }));
    c.references.forEach((r) => children.push(new Paragraph({
      numbering: { reference: "refs", level: 0 },
      spacing: { line: 360, after: 60 },
      children: [new TextRun({ text: r, size: half, font })],
    })));
  }

  const doc = new Document({
    numbering: { config: [{ reference: "refs", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] }] },
    styles: { default: { document: { run: { font, size: half } } } },
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

/* -------------------------------- PDF ------------------------------- */
// PDFKit ships Times-Roman/Times-Bold/Times-Italic as built-in standard fonts,
// so we get clean Times New Roman-style output with no external font files.
export async function buildPdf(content, { size = 12 } = {}) {
  const { default: PDFDocument } = await import("pdfkit");
  const c = norm(content);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 72, bottom: 72, left: 72, right: 72 } });
      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.font("Times-Bold").fontSize(size * 1.6).text(c.title, { align: "center" });
      if (c.subtitle) { doc.moveDown(0.3); doc.font("Times-Italic").fontSize(size * 1.05).text(c.subtitle, { align: "center" }); }
      doc.moveDown(1);

      for (const sec of c.sections) {
        if (sec.heading) { doc.moveDown(0.5); doc.font("Times-Bold").fontSize(size * 1.12).text(sec.heading, { align: "left" }); doc.moveDown(0.3); }
        doc.font("Times-Roman").fontSize(size);
        for (const para of (sec.paragraphs || [])) {
          doc.text(para, { align: "justify", indent: size * 2, lineGap: size * 0.5, paragraphGap: size * 0.6 });
        }
      }

      if (c.references.length) {
        doc.moveDown(0.8); doc.font("Times-Bold").fontSize(size * 1.12).text("References"); doc.moveDown(0.3);
        doc.font("Times-Roman").fontSize(size);
        c.references.forEach((r, i) => doc.text(`${i + 1}. ${r}`, { lineGap: size * 0.3, paragraphGap: size * 0.3 }));
      }
      doc.end();
    } catch (e) { reject(e); }
  });
}

/* -------------------------------- PPTX ------------------------------ */
// Presentation: a title slide + one content slide per outline entry, Times New Roman.
export async function buildPptx(content, { font = "Times New Roman" } = {}) {
  const { default: pptxgen } = await import("pptxgenjs");
  const c = norm(content);
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";
  const INK = "1A1A1A", ACCENT = "6D4AA7", MUTED = "555555";

  const title = pptx.addSlide();
  title.background = { color: "F7F5F0" };
  title.addText(c.title, { x: 0.8, y: 2.6, w: 11.7, h: 1.6, fontFace: font, fontSize: 40, bold: true, color: INK, align: "center" });
  if (c.subtitle) title.addText(c.subtitle, { x: 0.8, y: 4.2, w: 11.7, h: 0.8, fontFace: font, fontSize: 20, italic: true, color: MUTED, align: "center" });

  const slides = c.slides.length ? c.slides : c.sections.filter((s) => s.heading).map((s) => ({ title: s.heading, points: (s.paragraphs || []).slice(0, 4) }));
  slides.forEach((s) => {
    const sl = pptx.addSlide();
    sl.background = { color: "FFFFFF" };
    sl.addText(s.title || "", { x: 0.7, y: 0.5, w: 12, h: 1, fontFace: font, fontSize: 28, bold: true, color: ACCENT });
    sl.addText((s.points || []).map((p) => ({ text: p, options: { bullet: true, fontFace: font, fontSize: 18, color: INK, paraSpaceAfter: 10 } })), { x: 0.9, y: 1.7, w: 11.5, h: 5 });
  });

  return pptx.write({ outputType: "nodebuffer" });
}

/* ------------------ CATALYST visual skill report (PDF) ------------------ */
// A designed report: header band, score cards, per-skill bars, and sections.
export async function buildCatalystReport(data = {}) {
  const { default: PDFDocument } = await import("pdfkit");
  const A = "#6D4AA7", INK = "#1A1A1A", MUT = "#6b6b6b", LINE = "#e3e0da";
  const col = (s) => (s >= 70 ? "#2E6F52" : s >= 40 ? "#C2641F" : "#B23A2E");
  const lvl = (s) => (s >= 70 ? "Advanced" : s >= 40 ? "Intermediate" : "Beginner");
  const sc = data.scores || {};
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 54, left: 50, right: 50 } });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      const M = 50, W = doc.page.width - M * 2, BOT = doc.page.height - 54;
      const ensure = (h) => { if (doc.y + h > BOT) doc.addPage(); };
      const H = (t) => { ensure(46); doc.moveDown(0.7); doc.fillColor(A).font("Helvetica-Bold").fontSize(11.5).text(String(t).toUpperCase()); doc.moveTo(M, doc.y + 2).lineTo(M + W, doc.y + 2).strokeColor(LINE).lineWidth(1).stroke(); doc.moveDown(0.45); };
      const bullets = (arr) => { doc.font("Helvetica").fontSize(10).fillColor(INK); (arr || []).forEach((s) => { ensure(16); doc.text("• " + s, { indent: 4, lineGap: 2, paragraphGap: 3 }); }); };

      // header band
      doc.roundedRect(M, 40, W, 58, 10).fill(A);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(17).text("Catalyst AI — Skill Assessment Report", M + 16, 57, { width: W - 32 });
      doc.fillColor("#e9e2f7").font("Helvetica").fontSize(9).text(data.subtitle || new Date().toDateString(), M + 16, 80);
      doc.y = 116;

      // score cards
      const cards = [["Overall", sc.final], ["Skill match", sc.skillMatch], ["Assessment", sc.assessment], ["Confidence", sc.confidence]];
      const bw = (W - 3 * 10) / 4, by = doc.y;
      cards.forEach((b, i) => {
        const x = M + i * (bw + 10), v = b[1] || 0;
        doc.roundedRect(x, by, bw, 64, 8).fillAndStroke("#faf9f6", LINE);
        doc.fillColor(MUT).font("Helvetica").fontSize(7.5).text(String(b[0]).toUpperCase(), x + 10, by + 11, { width: bw - 20 });
        doc.fillColor(col(v)).font("Helvetica-Bold").fontSize(25).text(String(Math.round(v)), x + 10, by + 25, { width: bw - 20 });
      });
      doc.y = by + 64 + 10;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(`Overall readiness: ${lvl(sc.final || 0)}`);
      if (data.summary) { doc.moveDown(0.2); doc.fillColor(MUT).font("Helvetica").fontSize(10).text(data.summary, { lineGap: 2 }); }

      // skills with bars
      H("Skills");
      (data.skills || []).forEach((s) => {
        ensure(42);
        const y0 = doc.y, v = s.score || 0;
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(s.name || "", M, y0, { width: W - 70 });
        doc.fillColor(col(v)).font("Helvetica-Bold").fontSize(10).text(`${v}/100`, M + W - 60, y0, { width: 60, align: "right" });
        const ly = doc.y + 2;
        doc.roundedRect(M, ly, W, 7, 3.5).fill("#eceae5");
        doc.roundedRect(M, ly, Math.max(4, (W * v) / 100), 7, 3.5).fill(col(v));
        doc.fillColor(MUT).font("Helvetica").fontSize(8.5).text(`${s.status || ""} · ${s.candidateLevel || ""} -> ${s.targetLevel || ""}${s.feedback ? "  ·  " + s.feedback : ""}`, M, ly + 11, { width: W });
        doc.moveDown(0.5);
      });

      if (data.strengths?.length) { H("Strengths"); bullets(data.strengths); }
      if (data.gaps?.length) {
        H("Critical gaps");
        data.gaps.forEach((g) => { ensure(30); doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(g.skill || ""); doc.fillColor(MUT).font("Helvetica").fontSize(9.5).text((g.why || "") + (g.improve ? "  ->  " + g.improve : ""), { lineGap: 1, paragraphGap: 5 }); });
      }
      if (data.learningPlan?.length) {
        H("Personalized learning plan");
        data.learningPlan.forEach((p, i) => { ensure(28); doc.fillColor(A).font("Helvetica-Bold").fontSize(10).text(`${i + 1}. ${p.phase || ""}${p.timeline ? "  (" + p.timeline + ")" : ""}`); doc.fillColor(MUT).font("Helvetica").fontSize(9.5).text((p.focus || "") + (p.skills?.length ? "  —  " + p.skills.join(", ") : ""), { indent: 12, paragraphGap: 5 }); });
      }
      if (data.resources?.length) {
        H("Learning resources");
        data.resources.forEach((r) => {
          ensure(22); doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(r.skill || "");
          (r.items || []).forEach((it) => {
            ensure(14); doc.fillColor(MUT).font("Helvetica").fontSize(9).text(`• ${it.type}: ${it.title}`, { indent: 8, continued: !!it.url });
            if (it.url) doc.fillColor(A).text("  " + it.url, { link: it.url.startsWith("http") ? it.url : "https://" + it.url, underline: true });
          });
          doc.moveDown(0.25);
        });
      }
      doc.end();
    } catch (e) { reject(e); }
  });
}

export async function buildDoc(format, content, opts = {}) {
  if (format === "docx") return buildDocx(content, opts);
  if (format === "pptx") return buildPptx(content, opts);
  return buildPdf(content, opts);
}
