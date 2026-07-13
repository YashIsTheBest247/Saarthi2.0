export type FeatureKey = "kavach" | "samajh" | "haq" | "sehat" | "paisa" | "samay" | "setu" | "krishi" | "kar" | "raahat" | "disha" | "study" | "resume" | "extract" | "route" | "emergency" | "form16" | "manager" | "intake" | "assist" | "pragyan" | "udyam" | "khanan" | "khananCopilot" | "khananPredict" | "khananNotice" | "skillmatch" | "interview";

export interface ApiMeta {
  _mock?: boolean;
  _error?: string;
}

export async function callFeature<T>(feature: FeatureKey, body: Record<string, unknown>): Promise<T & ApiMeta> {
  const res = await fetch(`/api/${feature}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export interface Health {
  ok: boolean;
  live: boolean;
  model: string;
}

export async function getHealth(): Promise<Health> {
  try {
    const res = await fetch("/api/health");
    return await res.json();
  } catch {
    return { ok: false, live: false, model: "offline" };
  }
}

/* ─────────────── Autonomous agentic orchestrator (server/orchestrator.js) ───────────────
 * A true plan → act → observe → reflect → synthesise loop that composes any
 * sequence of specialist agents at runtime from a free-text goal. */
export interface AgentStep { agent: string; task: string; why?: string }
export interface AgentPlan { goal?: string; understanding: string; steps: AgentStep[] }
export interface AgentStepResult extends ApiMeta { key: string; name: string; role: string; task: string; data: Record<string, unknown> & ApiMeta; summary: string; why?: string }
export interface AgentFinal extends ApiMeta {
  headline: string; summary: string; deliverable: string;
  actions?: string[]; reminders?: { title: string; when?: string }[];
}

async function postJSON<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Dynamically plan which agents to run for a goal (no execution yet). */
export const planAgent = (body: { goal: string; language?: string }) => postJSON<AgentPlan>("/api/agent/plan", body);
/** Run ONE planned step live, passing the accumulated context of earlier steps. */
export const runAgentStep = (body: { agent: string; task: string; context?: string; image?: unknown; today?: string; location?: string; language?: string }) =>
  postJSON<AgentStepResult>("/api/agent/step", body);
/** Weave the executed steps into one finished deliverable. */
export const synthesizeAgent = (body: { goal: string; steps: AgentStepResult[]; language?: string }) =>
  postJSON<AgentFinal>("/api/agent/synthesize", body);

/* ─────────────── AI Workforce — rentable AI employees (server/employees.js) ─────────────── */
export interface EmployeeFunction { id: string; name: string; desc: string }
export interface Employee {
  id: string; title: string; short: string; name: string; dept: string; sector: string; subSector: string;
  icon: string; accent: string; photo: string; tagline: string; jd: string;
  responsibilities: string[]; skills: string[]; functions: EmployeeFunction[]; kpis: string[]; samples: string[];
}
export interface RunArtifact { type: string; label: string; filename: string; mime: string; content: string }
export interface GstinCheck { gstin: string; valid: boolean; reason: string; state?: string }
export interface EmployeeRun extends ApiMeta {
  employee: { id: string; name: string; title: string; icon: string; accent: string };
  function?: { id: string; name: string } | null;
  goal: string; understanding: string;
  plan: AgentStep[]; steps: AgentStepResult[];
  reflections: { round: number; done: boolean; reason: string; added: string[] }[];
  result: AgentFinal;
  artifacts?: RunArtifact[];
  gstinChecks?: GstinCheck[];
  docKind?: string | null;
}

/** Generate a formatted PDF/Word/PPT document from a deliverable (server/docgen via /api/doc). */
export async function generateDoc(title: string, text: string, format: "pdf" | "docx" | "pptx"): Promise<Blob | null> {
  try {
    const res = await fetch("/api/doc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, text, format }) });
    return res.ok ? await res.blob() : null;
  } catch { return null; }
}

export async function getEmployees(): Promise<Employee[]> {
  try { const r = await fetch("/api/employees"); return (await r.json()).employees || []; }
  catch { return []; }
}
/** Assign a task to an employee (id, or "custom" with a job description). The org's integration entry-point.
 *  Optionally invoke a specific depth function via `function` (the role's duty id). */
export const assignEmployeeTask = (id: string, body: { task: string; function?: string; today?: string; location?: string; language?: string; image?: unknown; custom?: { title: string; jd: string; skills: string[] } }) =>
  postJSON<EmployeeRun>(`/api/employees/${id}/task`, body);

export interface WorkforceMe { tenant: { key: string; tenant: string; plan: string; runs: number; enforced: boolean } | null; enforced: boolean; roles: number }
export async function getWorkforceMe(): Promise<WorkforceMe | null> {
  try { return await (await fetch("/api/workforce/me")).json(); } catch { return null; }
}

/* ─────────────── Integration connectors (server/connectors.js) ─────────────── */
export interface Connector { id: string; name: string; live: boolean; needs: string | null; note: string }
export async function getConnectors(): Promise<Connector[]> {
  try { return (await (await fetch("/api/tools")).json()).connectors || []; } catch { return []; }
}
export interface GstinResult { gstin: string; valid: boolean; reason: string; state?: string; stateCode?: string; pan?: string; checkDigit?: string; expectedCheckDigit?: string }
export const validateGstin = (gstin: string) => postJSON<GstinResult>("/api/tools/gstin", { gstin });
export const tallyXml = (inv: Record<string, unknown>) => postJSON<{ xml: string }>("/api/tools/tally", inv);
export const ewayJson = (bill: Record<string, unknown>) => postJSON<{ payload: unknown }>("/api/tools/eway", bill);
export const waSend = (phone: string, text: string) => postJSON<{ ok: boolean; mode: string; link: string; note?: string }>("/api/tools/whatsapp", { phone, text });

/** Read a File into base64 (no data: prefix) for the Gemini image parts. */
export function fileToInlineData(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(",")[1] ?? "";
      resolve({ mimeType: file.type || "image/jpeg", data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
