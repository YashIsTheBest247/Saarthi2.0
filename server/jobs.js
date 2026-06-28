// Live job listings from free, keyless APIs (Remotive primary, Arbeitnow fallback).
// Fetched server-side (no CORS issues) with a short cache. Remote-friendly roles
// an India-based candidate can apply to.

const cache = new Map(); // key -> { at, items }
const TTL = 10 * 60 * 1000;

const clean = (s) => String(s || "")
  .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

function norm(x, src) {
  if (src === "remotive") {
    return { title: clean(x.title), company: clean(x.company_name), location: clean(x.candidate_required_location) || "Remote", url: x.url, type: x.job_type || "", tags: (x.tags || []).slice(0, 4) };
  }
  if (src === "remoteok") {
    return { title: clean(x.position || x.title), company: clean(x.company), location: clean(x.location) || "Remote", url: x.url || `https://remoteok.com/l/${x.id}`, type: "", tags: (x.tags || []).slice(0, 4) };
  }
  // arbeitnow
  return { title: clean(x.title), company: clean(x.company_name), location: clean(x.location) || (x.remote ? "Remote" : ""), url: x.url, type: (x.job_types && x.job_types[0]) || "", tags: (x.tags || []).slice(0, 4) };
}

export async function getJobs(q = "", loc = "") {
  const key = `${q}|${loc}`.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL) return hit.items;

  const UA = { headers: { "User-Agent": "Mozilla/5.0 (compatible; Saarthi/1.0)" } };
  const safe = async (u, pick) => { try { const r = await fetch(u, UA); return pick(await r.json()); } catch { return []; } };

  // Gather a broad pool from several keyless boards, then rank locally.
  const [rmRecent, rmSearch, remoteok, arbeit] = await Promise.all([
    safe("https://remotive.com/api/remote-jobs?limit=100", (j) => (j.jobs || []).map((x) => norm(x, "remotive"))),
    q ? safe(`https://remotive.com/api/remote-jobs?limit=80&search=${encodeURIComponent(q)}`, (j) => (j.jobs || []).map((x) => norm(x, "remotive"))) : Promise.resolve([]),
    safe("https://remoteok.com/api", (j) => (Array.isArray(j) ? j : []).filter((x) => x && (x.position || x.title)).map((x) => norm(x, "remoteok"))),
    safe("https://www.arbeitnow.com/api/job-board-api", (j) => (j.data || []).map((x) => norm(x, "arbeitnow"))),
  ]);
  let items = [...rmSearch, ...rmRecent, ...remoteok, ...arbeit].filter((j) => j.title && j.url);

  // relevance: keep jobs that match the role/keywords (title hits weighted highest)
  const tokens = String(q).toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);
  if (tokens.length) {
    items = items
      .map((j) => {
        const title = (j.title || "").toLowerCase();
        const tagstr = `${(j.tags || []).join(" ")} ${j.company || ""}`.toLowerCase();
        let titleHits = 0, tagHits = 0;
        for (const tk of tokens) { if (title.includes(tk)) titleHits++; else if (tagstr.includes(tk)) tagHits++; }
        return { j, sc: titleHits * 3 + tagHits, keep: titleHits > 0 || tagHits >= 2 };
      })
      .filter((x) => x.keep)
      .sort((a, b) => b.sc - a.sc)
      .map((x) => x.j);
  }

  // dedupe by url (then title+company)
  const seen = new Set();
  items = items.filter((j) => {
    const k = (j.url || `${j.title}|${j.company}`).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // optional location preference (keep worldwide/remote too)
  if (loc) {
    const l = loc.toLowerCase();
    const f = items.filter((i) => {
      const c = (i.location || "").toLowerCase();
      return c.includes(l) || c.includes("worldwide") || c.includes("anywhere") || c.includes("remote");
    });
    if (f.length) items = f;
  }

  items = items.slice(0, 24);
  cache.set(key, { at: now, items });
  return items;
}
