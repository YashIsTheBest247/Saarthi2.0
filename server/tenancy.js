// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenant API-key layer for the AI Workforce "rent" API.
//
// An organisation integrates with an API key; each request is attributed to a
// tenant and metered. Configure real tenants via an env var:
//   WORKFORCE_API_KEYS="sk_acme:Acme Corp:pro,sk_foo:Foo Ltd:trial"
// If none are configured the API stays OPEN (demo mode) so nothing breaks on
// stage; add even one key and enforcement turns on automatically.
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN = { key: "saarthi-demo", tenant: "Demo Org", plan: "trial" };

function parseKeys() {
  const map = new Map();
  map.set(BUILTIN.key, { ...BUILTIN });
  for (const row of String(process.env.WORKFORCE_API_KEYS || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const [key, tenant, plan] = row.split(":");
    if (key && key.trim()) map.set(key.trim(), { key: key.trim(), tenant: (tenant || "Organisation").trim(), plan: (plan || "pro").trim() });
  }
  return map;
}

const KEYS = parseKeys();
const usage = new Map(); // key -> run count (in-memory; resets on cold start)

// Enforce only when real keys are configured beyond the built-in demo key.
export const enforce = KEYS.size > 1;
export const lookup = (key) => KEYS.get((key || "").trim()) || null;

/** Express middleware: attribute the request to a tenant (and meter it). */
export function requireKey(req, res, next) {
  const key = req.header("x-api-key") || req.query.api_key || "";
  const t = lookup(key);
  if (enforce && !t) return res.status(401).json({ error: "invalid or missing x-api-key" });
  req.tenant = t || { key: "open", tenant: "Open Demo", plan: "demo" };
  usage.set(req.tenant.key, (usage.get(req.tenant.key) || 0) + 1);
  next();
}

/** Tenant + usage for a given key (for the Fleet dashboard). */
export function tenantInfo(key) {
  const t = lookup(key) || (enforce ? null : { key: "open", tenant: "Open Demo", plan: "demo" });
  if (!t) return null;
  return { ...t, runs: usage.get(t.key) || 0, enforced: enforce };
}
