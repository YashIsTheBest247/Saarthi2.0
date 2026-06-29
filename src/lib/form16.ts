import * as pdfjs from "pdfjs-dist";

// Vite-friendly worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

/** Pull the raw text out of a (text-based) PDF — fully client-side, no API key. */
export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ") + "\n";
    page.cleanup();
  }
  return text;
}

const n = (s?: string) => parseInt(String(s || "").replace(/[^\d]/g, ""), 10) || 0;

export interface Form16Fields { grossSalary: number; tds: number; deductions: number; otherIncome: number }

/** Regex the common Form-16 figures out of extracted text (keyless fallback). */
export function parseForm16Text(text: string): Form16Fields {
  const g = (re: RegExp) => { const m = text.match(re); return m ? n(m[1]) : 0; };
  const grossSalary =
    g(/gross\s*salary[^\d]{0,12}([\d,]{4,})/i) ||
    g(/total\s*salary[^\d]{0,12}([\d,]{4,})/i) ||
    g(/salary\s*(?:under|as per)[^\d]{0,20}([\d,]{4,})/i);
  const tds =
    g(/(?:tds\s*deducted|total\s*tax\s*deducted|tax\s*deducted\s*at\s*source)[^\d]{0,12}([\d,]{3,})/i);
  const ded80c =
    g(/deduction[s]?[^\d]{0,8}\(?\s*80c[^\d]{0,12}([\d,]{3,})/i) ||
    g(/(?:chapter\s*vi-?a|total\s*deduction[s]?)[^\d]{0,12}([\d,]{3,})/i);
  const exempt = g(/exemption[s]?[^\d]{0,12}([\d,]{3,})/i);
  const otherIncome = g(/other\s*income[^\d]{0,12}([\d,]{3,})/i);
  return { grossSalary, tds, deductions: ded80c + exempt, otherIncome };
}
