// Live job listings from free, keyless APIs (Remotive primary, Arbeitnow fallback).
// Fetched server-side (no CORS issues) with a short cache. Remote-friendly roles
// an India-based candidate can apply to.

const cache = new Map(); // key -> { at, items }
const TTL = 10 * 60 * 1000;

function norm(x, src) {
  if (src === "remotive") {
    return {
      title: x.title,
      company: x.company_name,
      location: x.candidate_required_location || "Remote",
      url: x.url,
      type: x.job_type || "",
      tags: (x.tags || []).slice(0, 4),
    };
  }
  // arbeitnow
  return {
    title: x.title,
    company: x.company_name,
    location: x.location || (x.remote ? "Remote" : ""),
    url: x.url,
    type: (x.job_types && x.job_types[0]) || "",
    tags: (x.tags || []).slice(0, 4),
  };
}

export async function getJobs(q = "", loc = "") {
  const key = `${q}|${loc}`.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL) return hit.items;

  let items = [];
  // 1) Remotive (supports keyword search)
  try {
    const url = `https://remotive.com/api/remote-jobs?limit=24${q ? `&search=${encodeURIComponent(q)}` : ""}`;
    const r = await fetch(url, { headers: { "User-Agent": "Saarthi/1.0" } });
    const j = await r.json();
    items = (j.jobs || []).map((x) => norm(x, "remotive"));
  } catch { /* try fallback */ }

  // 2) Arbeitnow fallback (no server-side search → filter by query here)
  if (!items.length) {
    try {
      const r = await fetch("https://www.arbeitnow.com/api/job-board-api", { headers: { "User-Agent": "Saarthi/1.0" } });
      const j = await r.json();
      const s = q.toLowerCase();
      items = (j.data || [])
        .filter((x) => !s || `${x.title} ${x.company_name} ${(x.tags || []).join(" ")}`.toLowerCase().includes(s))
        .slice(0, 24)
        .map((x) => norm(x, "arbeitnow"));
    } catch { /* give up gracefully */ }
  }

  // optional location preference (keep worldwide/remote too)
  if (loc) {
    const l = loc.toLowerCase();
    const f = items.filter((i) => {
      const c = (i.location || "").toLowerCase();
      return c.includes(l) || c.includes("worldwide") || c.includes("anywhere") || c.includes("remote");
    });
    if (f.length) items = f;
  }

  cache.set(key, { at: now, items });
  return items;
}
