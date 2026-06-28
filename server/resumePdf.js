import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Type } from "@google/genai";
import { generateJSON, hasKey } from "./gemini.js";

const slug = (s) => (String(s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Resume");
const pageCount = (pdf) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

/** Is the Tectonic CLI available on this host? */
let _tectonic = null;
function tectonicAvailable() {
  if (_tectonic !== null) return _tectonic;
  try {
    const r = spawnSync("tectonic", ["--version"], { encoding: "utf8" });
    _tectonic = r.status === 0;
  } catch { _tectonic = false; }
  return _tectonic;
}

/** Strip constructs that commonly crash Tectonic / aren't self-contained. */
function preprocess(tex) {
  return String(tex || "")
    .replace(/\\input\{[^}]*\}/g, "")
    .replace(/\\include\{[^}]*\}/g, "")
    .replace(/\\includegraphics(\[[^\]]*\])?\{[^}]*\}/g, "") // no external images in a tmp compile
    .replace(/^﻿/, "")
    .trim();
}

/** Inject a base font size + tighter leading to shrink toward one page. */
function withSize(tex, size, lead) {
  if (!size) return tex;
  const inject = `\\usepackage{anyfontsize}\n\\AtBeginDocument{\\fontsize{${size}}{${lead}}\\selectfont}\n\\linespread{0.95}\n`;
  return /\\documentclass[^\n]*\n/.test(tex)
    ? tex.replace(/(\\documentclass[^\n]*\n)/, `$1${inject}`)
    : inject + tex;
}

/** Compile one .tex string with Tectonic. Returns { ok, pdf, pages, log }. */
function compile(tex) {
  const dir = mkdtempSync(join(tmpdir(), "saarthi-tex-"));
  try {
    const texPath = join(dir, "resume.tex");
    writeFileSync(texPath, tex, "utf8");
    const r = spawnSync("tectonic", [texPath, "--outdir", dir, "--chatter", "minimal", "-Z", "continue-on-errors"], {
      encoding: "utf8", timeout: 60000,
    });
    const pdfPath = join(dir, "resume.pdf");
    const log = `${r.stdout || ""}\n${r.stderr || ""}`;
    if (existsSync(pdfPath)) {
      const pdf = readFileSync(pdfPath);
      const overfull = /Overfull \\vbox/.test(log);
      return { ok: true, pdf, pages: pageCount(pdf), overfull, log };
    }
    return { ok: false, pdf: null, pages: 0, overfull: false, log };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function repairWithGemini(tex, log) {
  if (!hasKey) return null;
  try {
    const out = await generateJSON({
      system: "You fix LaTeX so it compiles cleanly with Tectonic/pdflatex. Keep the content and structure; only fix what breaks compilation. Return the COMPLETE corrected .tex.",
      parts: [{ text: `Tectonic error log:\n"""\n${(log || "").slice(-2500)}\n"""\n\nLaTeX to fix:\n"""\n${tex}\n"""` }],
      schema: { type: Type.OBJECT, properties: { tex: { type: Type.STRING } }, required: ["tex"] },
    });
    return out?.tex || null;
  } catch { return null; }
}

/**
 * POST /api/resume/pdf  { tex, name, role }
 * Compiles to a one-page PDF (auto font-shrink), repairs once on failure,
 * and streams it as {FullName}_{Role}.pdf. 501 if Tectonic isn't installed.
 */
export async function handleResumePdf(req, res) {
  const { tex: rawTex, name, role } = req.body || {};
  if (!rawTex || !String(rawTex).trim()) return res.status(400).json({ error: "Missing 'tex'." });

  if (!tectonicAvailable()) {
    return res.status(501).json({ error: "PDF service unavailable on this host (Tectonic not installed). Use ‘Open in Overleaf’ to get the PDF." });
  }

  let tex = preprocess(rawTex);

  // first attempt; if it fails, ask Gemini to repair once
  let attempt = compile(tex);
  if (!attempt.ok) {
    const fixed = await repairWithGemini(tex, attempt.log);
    if (fixed) { tex = preprocess(fixed); attempt = compile(tex); }
    if (!attempt.ok) return res.status(422).json({ error: "Could not compile this LaTeX.", log: (attempt.log || "").slice(-1200) });
  }

  // escalate a one-page shrink only if it overflows
  let best = attempt;
  if (attempt.pages > 1 || attempt.overfull) {
    const levels = [{ s: 10, l: 12 }, { s: 9, l: 10.8 }, { s: 8, l: 9.6 }];
    for (const lv of levels) {
      const r = compile(withSize(tex, lv.s, lv.l));
      if (r.ok && (r.pages < best.pages || best.pages > 1)) best = r;
      if (r.ok && r.pages <= 1 && !r.overfull) { best = r; break; }
    }
  }

  const filename = `${slug(name)}_${slug(role || "Tailored")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(best.pdf);
}
