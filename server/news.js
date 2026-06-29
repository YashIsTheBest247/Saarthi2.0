// Live scam/fraud news from Economic Times RSS, keyword-filtered, cached,
// with a curated fallback so the ticker always has content.

const FEEDS = [
  "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
  "https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms",
  "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms",
];

const KEYWORDS = ["scam", "fraud", "cyber", "counterfeit", "fake", "phishing", "digital arrest", "upi", "otp", "loan app", "ponzi", "cheat"];

const FALLBACK = [
  { title: "Digital arrest scams: how fake CBI officers are draining life savings", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "UPI fraud cases rise sharply; RBI urges caution on unknown collect requests", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "Fake KYC update SMS continue to target bank customers nationwide", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "AI voice-cloning used in 'family emergency' phone scams, police warn", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "Counterfeit currency seizures reported across multiple states", source: "Curated", link: "https://cybercrime.gov.in" },
];

let cache = { at: 0, items: null };
const TTL = 10 * 60 * 1000;

function clean(s = "") {
  return s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

function parseItems(xml) {
  const items = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const b of blocks) {
    const title = clean((b.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = clean((b.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "");
    if (title) items.push({ title, link });
  }
  return items;
}

export async function getNews() {
  if (cache.items && Date.now() - cache.at < TTL) return cache.items;

  const collected = [];
  await Promise.all(
    FEEDS.map(async (url) => {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 Kavach" } });
        clearTimeout(to);
        if (!res.ok) return;
        const xml = await res.text();
        for (const it of parseItems(xml)) collected.push({ ...it, source: "Economic Times" });
      } catch {
        /* ignore individual feed errors */
      }
    }),
  );

  const seen = new Set();
  const filtered = collected
    .filter((i) => {
      const t = i.title.toLowerCase();
      return KEYWORDS.some((k) => t.includes(k));
    })
    .filter((i) => (seen.has(i.title) ? false : (seen.add(i.title), true)))
    .slice(0, 12);

  const items = filtered.length ? filtered : FALLBACK.map((f) => ({ ...f }));
  cache = { at: Date.now(), items: { items, live: filtered.length > 0 } };
  return cache.items;
}

/* ---- Trending stories (all topics) for the Pragyan news-reel agent ---- */
const HOT = ["ai", "ipo", "market", "sensex", "nifty", "rbi", "rupee", "gold", "startup", "layoff", "budget", "tax", "election", "gst", "crypto", "ev", "isro", "record", "crore", "billion"];
let tcache = { at: 0, data: null };

export async function getTrending() {
  if (tcache.data && Date.now() - tcache.at < TTL) return tcache.data;
  const collected = [];
  await Promise.all(FEEDS.map(async (url) => {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 Saarthi" } });
      clearTimeout(to);
      if (!res.ok) return;
      for (const it of parseItems(await res.text())) collected.push({ ...it, source: "Economic Times" });
    } catch { /* ignore */ }
  }));

  const seen = new Set();
  const uniq = collected.filter((i) => (i.title && !seen.has(i.title) ? (seen.add(i.title), true) : false));
  // trend score: earlier in feed (recency) + hot keywords + numbers (figures trend)
  const scored = uniq.map((it, idx) => {
    const t = it.title.toLowerCase();
    let score = Math.max(0, 100 - idx * 2);
    HOT.forEach((k) => { if (t.includes(k)) score += 18; });
    if (/\d/.test(it.title)) score += 8;
    if (/%|crore|billion|record|surge|crash|high|low/.test(t)) score += 10;
    return { ...it, trend: Math.min(100, Math.round(score)) };
  }).sort((a, b) => b.trend - a.trend).slice(0, 10);

  const out = { items: scored.length ? scored : FALLBACK.map((f, i) => ({ ...f, trend: 80 - i * 5 })), live: scored.length > 0 };
  tcache = { at: Date.now(), data: out };
  return out;
}
