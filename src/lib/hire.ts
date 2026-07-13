import { FeatureKey } from "./api";

// Best-effort bridge from a consumer specialist to the closest hireable AI employee
// (server/employees.js). Unmapped agents just open the AI Workforce catalog.
export const HIRE_MAP: Partial<Record<FeatureKey, string>> = {
  haq: "finance",       // Scheme Finder → Finance & Schemes
  udyam: "finance",     // MSME Launchpad → Finance & Schemes
  setu: "receivables",  // Grievance Autopilot → Receivables & Samadhaan
  samajh: "accounts",   // Document Decoder → Accounts, GST & e-Invoicing
  khanan: "mobility",   // Mining Compliance → Metals, Machinery & Mobility
  // sehat, samay, pragyan have no direct B2B match → open the full AI Workforce catalog
};

/** Open the AI Workforce hire flow, preselecting the closest employee if one maps. */
export function hireAsEmployee(k: FeatureKey) {
  window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: HIRE_MAP[k] ? { id: HIRE_MAP[k] } : {} }));
}
