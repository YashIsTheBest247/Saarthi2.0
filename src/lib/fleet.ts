// Client-side "Fleet" state — which AI employees this org has hired and the
// tasks they've completed. Kept in localStorage so the demo works with no backend
// persistence; the server meters real usage per API key (server/tenancy.js).
export interface HiredEmployee { id: string; title: string; name: string; icon: string; accent: string; hiredAt: number }
export interface FleetRun { employeeId: string; title: string; icon: string; accent: string; task: string; headline: string; at: number }

const HK = "saarthi.fleet.hired";
const RK = "saarthi.fleet.runs";

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota / private mode */ } }

export const getHired = (): HiredEmployee[] => read<HiredEmployee[]>(HK, []);
export function hire(e: Omit<HiredEmployee, "hiredAt">) {
  const list = getHired().filter((x) => x.id !== e.id);
  write(HK, [{ ...e, hiredAt: Date.now() }, ...list]);
}
export function fire(id: string) { write(HK, getHired().filter((x) => x.id !== id)); }

export const getRuns = (): FleetRun[] => read<FleetRun[]>(RK, []);
export function recordRun(r: Omit<FleetRun, "at">) {
  write(RK, [{ ...r, at: Date.now() }, ...getRuns()].slice(0, 50));
}

/** The demo API key an org uses to integrate (real keys go in WORKFORCE_API_KEYS on the server). */
export const DEMO_API_KEY = "saarthi-demo";
