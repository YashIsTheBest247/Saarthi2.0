import { useState } from "react";
import { Sparkle, Download, FileCode2, ExternalLink, Save, Loader2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { callFeature } from "../lib/api";
import { useLocal } from "./console/kit";
import { ListBlock, CopyBlock, MockNote } from "../components/ui";

const ACCENT = "#6D4AA7";

/* A clean, ATS-friendly, single-page LaTeX résumé that compiles on Overleaf/Tectonic. */
function preset(objective: string, skills: string): string {
  return `\\documentclass[a4paper,11pt]{article}
\\usepackage[margin=1.5cm]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\setlist[itemize]{leftmargin=*,nosep,topsep=2pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{8pt}{4pt}
\\pagestyle{empty}
\\begin{document}

\\begin{center}
{\\LARGE \\textbf{[Your Name]}}\\\\[3pt]
[City] $\\cdot$ +91-XXXXXXXXXX $\\cdot$ your@email.com $\\cdot$ linkedin.com/in/you $\\cdot$ github.com/you
\\end{center}

\\section*{Summary}
${objective}

\\section*{Education}
\\textbf{[Degree, Branch]} \\hfill [Year]\\\\
[Institute] \\hfill CGPA: [X.XX]

\\section*{Experience}
\\textbf{[Role]} --- [Company] \\hfill [Dates]
\\begin{itemize}
  \\item [Impact bullet 1 --- what you did and the measurable result.]
  \\item [Impact bullet 2 --- a problem you solved, with a number.]
  \\item [Impact bullet 3 --- a tool or process you improved.]
\\end{itemize}

\\section*{Projects}
\\textbf{[Project Name]} \\hfill [Tech stack]
\\begin{itemize}
  \\item [What it does and your specific contribution, with a metric.]
  \\item [A key technical decision or outcome.]
\\end{itemize}

\\section*{Skills}
${skills}

\\end{document}`;
}

const PRESETS: Record<string, string> = {
  "Off-Campus": preset(
    "Driven [role] seeking off-campus opportunities; strong fundamentals and a track record of shipping real projects.",
    "\\textbf{Languages:} [..] \\quad \\textbf{Frameworks:} [..] \\quad \\textbf{Tools:} [..] \\quad \\textbf{Core:} DSA, OOP, DBMS, OS",
  ),
  "On-Campus": preset(
    "Final-year [branch] student targeting campus placements; consistent academics with hands-on project & internship experience.",
    "\\textbf{Languages:} [..] \\quad \\textbf{CS Core:} DSA, DBMS, OS, CN \\quad \\textbf{Tools:} Git, [..] \\quad \\textbf{Soft:} teamwork, ownership",
  ),
  "Priority": preset(
    "[Role] focused on [target company/domain]; aligns directly to the role's must-have skills and impact metrics.",
    "\\textbf{Must-haves:} [..] \\quad \\textbf{Frameworks:} [..] \\quad \\textbf{Cloud/Tools:} [..] \\quad \\textbf{Core:} [..]",
  ),
};

interface SimpleResult { summary: string; output: string; highlights?: string[]; tips?: string[]; _mock?: boolean }
interface TexResult { tex: string; role?: string; keywords?: string[]; notes?: string[]; _mock?: boolean }

const slug = (s: string) => (s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Resume";

function download(text: string, fname: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
}

export function ResumeTailor() {
  const { t, lang } = useApp();
  const [view, setView] = useState<"simple" | "advanced">("simple");

  // shared
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");

  // simple (plain-text) tailoring
  const [resumeText, setResumeText] = useState("");
  const [sBusy, setSBusy] = useState(false);
  const [sResult, setSResult] = useState<SimpleResult | null>(null);

  // advanced (LaTeX)
  const [tex, setTex] = useLocal("saarthi.disha.resume", PRESETS["Off-Campus"]);
  const [aBusy, setABusy] = useState(false);
  const [aResult, setAResult] = useState<TexResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");

  const fileBase = `${slug(name)}_${slug(aResult?.role || role || "Tailored")}`;

  async function tailorSimple() {
    if (!resumeText.trim() && !jd.trim()) return;
    setSBusy(true);
    setSResult(null);
    try {
      const details = `My background / current résumé:\n${resumeText || "(not provided)"}\n\nTailor it to this job description:\n${jd || "(none — keep general)"}`;
      setSResult(await callFeature<SimpleResult>("disha", { mode: "resume", details, language: lang.name }));
    } catch { /* mock fallback */ } finally { setSBusy(false); }
  }

  async function tailorTex() {
    if (!tex.trim()) return;
    setABusy(true);
    setAResult(null);
    try {
      setAResult(await callFeature<TexResult>("resume", { tex, jd, name, role, language: lang.name }));
    } catch { /* mock fallback */ } finally { setABusy(false); }
  }

  function openOverleaf(text: string) {
    const b64 = btoa(unescape(encodeURIComponent(text)));
    window.open(`https://www.overleaf.com/docs?snip_uri=data:application/x-tex;base64,${b64}`, "_blank");
  }

  async function downloadPdf(text: string) {
    setPdfMsg("");
    setPdfBusy(true);
    try {
      const res = await fetch("/api/resume/pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tex: text, name, role: aResult?.role || role }),
      });
      if (!res.ok) {
        let m = "Couldn't generate the PDF here — open it in Overleaf instead.";
        try { const j = await res.json(); if (j.error) m = j.error; } catch { /* ignore */ }
        setPdfMsg(m);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${fileBase}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfMsg("PDF service unreachable — open it in Overleaf instead.");
    } finally { setPdfBusy(false); }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="display text-2xl font-bold deva">Resume tailor</h2>
        <p className="mt-1 text-[15px] text-muted deva">Rewrite your résumé to match a job description — keyword-optimised and ATS-friendly.</p>
      </div>

      {/* mode toggle */}
      <div className="mb-5 inline-flex gap-1 rounded-full border border-line bg-paper p-1">
        {[{ k: "simple", l: "Simple" }, { k: "advanced", l: "Advanced · LaTeX" }].map((m) => {
          const on = view === m.k;
          return (
            <button key={m.k} onClick={() => setView(m.k as "simple" | "advanced")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${on ? "text-white" : "text-graphite hover:bg-mist"}`}
              style={on ? { background: ACCENT } : undefined}>{m.l}</button>
          );
        })}
      </div>

      {/* ---------- SIMPLE ---------- */}
      {view === "simple" && (
        <>
          <div className="card p-6">
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (optional)" className="field" />
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role (optional)" className="field" />
            </div>
            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={6} placeholder="Paste your current résumé or background…" className="field mt-2 resize-none deva" />
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={5} placeholder="Paste the job description (JD) here…" className="field mt-2 resize-none deva" />
            <button onClick={tailorSimple} disabled={sBusy || (!resumeText.trim() && !jd.trim())} className="btn-accent mt-3 text-[15px]" style={{ background: ACCENT }}>
              {sBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Tailoring…</> : <><Sparkle className="h-4 w-4" /> Tailor my résumé</>}
            </button>
          </div>

          {sResult && !sBusy && (
            <div className="mt-6 card p-5">
              <p className="display text-lg font-semibold deva">{sResult.summary}</p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted">Tailored résumé</span>
                  <button onClick={() => download(sResult.output, `${slug(name)}_${slug(role || "Resume")}.txt`, "text/plain")} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Download .txt</button>
                </div>
                <CopyBlock text={sResult.output} />
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2 deva">
                {sResult.highlights?.length ? <ListBlock title="Strengths to lead with" items={sResult.highlights} accent={ACCENT} /> : null}
                {sResult.tips?.length ? <ListBlock title="Tips" items={sResult.tips} tone="good" /> : null}
              </div>
              {sResult._mock && <MockNote text={t("common.sample")} />}
            </div>
          )}
        </>
      )}

      {/* ---------- ADVANCED · LaTeX ---------- */}
      {view === "advanced" && (
        <>
          <p className="mb-3 text-[14px] text-muted deva">Edit a LaTeX résumé (or start from a preset), paste a JD, and get a tailored <b>.tex</b> + a compiled <b>PDF</b>.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">Start from:</span>
            {Object.keys(PRESETS).map((p) => (
              <button key={p} onClick={() => { setTex(PRESETS[p]); setSaved(false); }} className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium text-graphite hover:bg-mist">{p}</button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-graphite">Your résumé (.tex)</span>
                <button onClick={() => setSaved(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white" style={{ background: ACCENT }}>
                  <Save className="h-3.5 w-3.5" /> {saved ? "Saved" : "★ Save"}
                </button>
              </div>
              <textarea value={tex} onChange={(e) => { setTex(e.target.value); setSaved(false); }} rows={16} spellCheck={false} className="field resize-none font-mono text-[12px] leading-snug" style={{ whiteSpace: "pre" }} />
            </div>
            <div className="card p-4">
              <div className="grid grid-cols-2 gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (for filename)" className="field" />
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role (optional)" className="field" />
              </div>
              <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={11} placeholder="Paste the job description (JD) here…" className="field mt-2 resize-none deva" />
              <button onClick={tailorTex} disabled={aBusy || !tex.trim()} className="btn-accent mt-3 w-full justify-center text-[15px]" style={{ background: ACCENT }}>
                {aBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Tailoring…</> : <><Sparkle className="h-4 w-4" /> Tailor to this JD</>}
              </button>
            </div>
          </div>

          {aResult && !aBusy && (
            <div className="mt-6 card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="display text-lg font-bold">Tailored résumé{aResult.role ? ` · ${aResult.role}` : ""}</div>
                  <div className="text-xs text-muted">{fileBase}.pdf</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadPdf(aResult.tex)} disabled={pdfBusy} className="btn-accent text-sm" style={{ background: ACCENT }}>
                    {pdfBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Compiling…</> : <><Download className="h-4 w-4" /> Download PDF</>}
                  </button>
                  <button onClick={() => openOverleaf(aResult.tex)} className="btn-ghost text-sm"><ExternalLink className="h-4 w-4" /> Open in Overleaf</button>
                  <button onClick={() => download(aResult.tex, `${fileBase}.tex`, "application/x-tex")} className="btn-ghost text-sm"><FileCode2 className="h-4 w-4" /> .tex</button>
                </div>
              </div>
              {pdfMsg && <p className="mt-3 text-sm text-amber2">{pdfMsg}</p>}

              {aResult.keywords?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {aResult.keywords.map((k) => <span key={k} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-graphite">{k}</span>)}
                </div>
              ) : null}

              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><FileCode2 className="h-4 w-4" /> Tailored .tex</div>
                  <CopyBlock text={aResult.tex} />
                </div>
                {aResult.notes?.length ? <ListBlock title="What changed" items={aResult.notes} accent={ACCENT} /> : null}
              </div>

              {aResult._mock && <MockNote text={t("common.sample")} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
