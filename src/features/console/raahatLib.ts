/**
 * Raahat — deterministic disaster-response maths.
 * Risk scoring, hotspot data and resource allocation are computed on-device
 * (never by the LLM) so the numbers are reproducible and defensible.
 */

export interface Band {
  label: string;
  color: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function band(score: number): Band {
  if (score >= 75) return { label: "Severe", color: "#C0453B" };
  if (score >= 55) return { label: "High", color: "#E0892E" };
  if (score >= 35) return { label: "Moderate", color: "#C9A227" };
  if (score >= 18) return { label: "Low", color: "#4B9E6B" };
  return { label: "Minimal", color: "#3F9A7A" };
}

/** Flood risk from rainfall (mm), river level %, soil saturation %, drainage capacity % (higher drainage = safer). */
export function floodRisk(i: { rainfall: number; riverLevel: number; soil: number; drainage: number }) {
  const rain = (Math.min(i.rainfall, 300) / 300) * 100;
  return clamp(rain * 0.4 + i.riverLevel * 0.3 + i.soil * 0.2 + (100 - i.drainage) * 0.1);
}

/** Wildfire risk from temperature (°C), humidity % (higher = safer), wind (km/h), vegetation dryness %. */
export function wildfireRisk(i: { temp: number; humidity: number; wind: number; dryness: number }) {
  const t = (Math.min(i.temp, 50) / 50) * 100;
  const w = (Math.min(i.wind, 80) / 80) * 100;
  return clamp(t * 0.3 + (100 - i.humidity) * 0.3 + w * 0.2 + i.dryness * 0.2);
}

export type HazardType = "Flood" | "Wildfire" | "Cyclone" | "Heatwave" | "Earthquake";

export interface Alert {
  city: string;
  state: string;
  lat: number;
  lng: number;
  type: HazardType;
  level: number; // 0-100
  note: string;
}

/** Demo signal-fusion output — what a live feed of IMD + satellite + news would surface. */
export const ALERTS: Alert[] = [
  { city: "Guwahati", state: "Assam", lat: 26.14, lng: 91.74, type: "Flood", level: 82, note: "Brahmaputra above danger mark; 40+ wards waterlogged." },
  { city: "Patna", state: "Bihar", lat: 25.59, lng: 85.14, type: "Flood", level: 71, note: "Ganga rising; low-lying diara belts on alert." },
  { city: "Mumbai", state: "Maharashtra", lat: 19.08, lng: 72.88, type: "Flood", level: 64, note: "Heavy spell + high tide; Mithi river overflow risk." },
  { city: "Nainital", state: "Uttarakhand", lat: 29.38, lng: 79.46, type: "Wildfire", level: 58, note: "Dry pine forest, low humidity; multiple ground fires." },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.69, lng: 83.22, type: "Cyclone", level: 76, note: "Depression intensifying in Bay of Bengal; landfall risk." },
  { city: "Nagpur", state: "Maharashtra", lat: 21.15, lng: 79.09, type: "Heatwave", level: 61, note: "44°C+ for 3 days; red-alert for vulnerable groups." },
  { city: "Kochi", state: "Kerala", lat: 9.93, lng: 76.27, type: "Flood", level: 55, note: "Monsoon surge; backwater levels climbing." },
  { city: "Shimla", state: "Himachal Pradesh", lat: 31.10, lng: 77.17, type: "Wildfire", level: 47, note: "Forest-fire alerts on dry south-facing slopes." },
];

export interface Area {
  name: string;
  affected: number; // people
  severity: number; // 1 (low) – 3 (severe)
}

export interface ResourcePool {
  boats: number;
  foodKits: number;
  medkits: number;
  shelters: number;
}

export interface Allocation extends Area {
  share: number; // 0-1
  boats: number;
  foodKits: number;
  medkits: number;
  shelters: number;
}

/** Proportional allocation weighted by affected population × severity. */
export function allocate(areas: Area[], pool: ResourcePool): Allocation[] {
  const weights = areas.map((a) => Math.max(0, a.affected) * Math.max(1, a.severity));
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  return areas.map((a, i) => {
    const share = weights[i] / total;
    return {
      ...a,
      share,
      boats: Math.round(pool.boats * share),
      foodKits: Math.round(pool.foodKits * share),
      medkits: Math.round(pool.medkits * share),
      shelters: Math.round(pool.shelters * share),
    };
  });
}

export const hazardColor: Record<HazardType, string> = {
  Flood: "#0E8FA8",
  Wildfire: "#E0892E",
  Cyclone: "#7B61C9",
  Heatwave: "#C0453B",
  Earthquake: "#8A5A2B",
};

/* ----------------------- LIVE FEEDS (keyless) ----------------------- */
// Cities we monitor; coords reused for live weather + flood lookups.
const CITIES = [
  { city: "Guwahati", state: "Assam", lat: 26.14, lng: 91.74 },
  { city: "Patna", state: "Bihar", lat: 25.59, lng: 85.14 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.08, lng: 72.88 },
  { city: "Nainital", state: "Uttarakhand", lat: 29.38, lng: 79.46 },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.69, lng: 83.22 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.15, lng: 79.09 },
  { city: "Kochi", state: "Kerala", lat: 9.93, lng: 76.27 },
  { city: "Shimla", state: "Himachal Pradesh", lat: 31.10, lng: 77.17 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.08, lng: 80.27 },
  { city: "Delhi", state: "Delhi", lat: 28.61, lng: 77.21 },
];

const clampN = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Live hazard alerts computed from REAL data:
 *  - Open-Meteo forecast  → temperature, humidity, wind, 24h rainfall
 *  - Open-Meteo flood API → river discharge (flood signal)
 * Risk is then scored on-device with floodRisk / wildfireRisk.
 * Open-Meteo is free + keyless + CORS-enabled, so we fetch from the browser.
 */
export async function fetchLiveAlerts(): Promise<Alert[]> {
  const lat = CITIES.map((c) => c.lat).join(",");
  const lon = CITIES.map((c) => c.lng).join(",");
  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=precipitation_sum&forecast_days=1&timezone=auto`;
  const fUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&forecast_days=1`;

  const [wRes, fRes] = await Promise.all([fetch(wUrl), fetch(fUrl).catch(() => null)]);
  const wRaw = await wRes.json();
  const w = Array.isArray(wRaw) ? wRaw : [wRaw];
  let discharges: number[] = [];
  try {
    const fRaw = fRes ? await fRes.json() : null;
    const f = Array.isArray(fRaw) ? fRaw : fRaw ? [fRaw] : [];
    discharges = CITIES.map((_, i) => f[i]?.daily?.river_discharge?.[0] ?? 0);
  } catch { /* flood feed optional */ }
  const maxD = Math.max(1, ...discharges);

  return CITIES.map((c, i) => {
    const cur = w[i]?.current ?? {};
    const temp = cur.temperature_2m ?? 30;
    const hum = cur.relative_humidity_2m ?? 50;
    const wind = cur.wind_speed_10m ?? 10;
    const rain = w[i]?.daily?.precipitation_sum?.[0] ?? cur.precipitation ?? 0;
    const riverLevel = clampN((discharges[i] / maxD) * 100);

    const flood = floodRisk({ rainfall: rain, riverLevel, soil: hum, drainage: 50 });
    const dryness = clampN(100 - hum - rain * 2);
    const fire = wildfireRisk({ temp, humidity: hum, wind, dryness });
    const heat = clampN((Math.max(0, temp - 30) / 15) * 100);

    let type: HazardType = "Flood";
    let level = flood;
    if (fire > level) { type = "Wildfire"; level = fire; }
    if (heat > level && temp >= 40) { type = "Heatwave"; level = heat; }

    const note = `${Math.round(temp)}°C · ${Math.round(rain)}mm rain (24h) · wind ${Math.round(wind)} km/h · ${Math.round(hum)}% RH`;
    return { city: c.city, state: c.state, lat: c.lat, lng: c.lng, type, level, note };
  });
}

/** Live earthquakes (last 24h, M2.5+) over India — USGS GeoJSON, keyless. */
export async function fetchEarthquakes(): Promise<Alert[]> {
  const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
  const data = await res.json();
  const out: Alert[] = [];
  for (const ft of data?.features ?? []) {
    const [lng, lat] = ft.geometry?.coordinates ?? [];
    const mag = ft.properties?.mag ?? 0;
    if (lat == null || lng == null) continue;
    if (lat < 6 || lat > 38 || lng < 67 || lng > 98) continue; // India region
    out.push({
      city: (ft.properties?.place || "Earthquake").replace(/^\d+\s*km.*?of\s*/i, ""),
      state: "",
      lat, lng,
      type: "Earthquake",
      level: clampN(mag * 12),
      note: `M${mag} · ${ft.properties?.place || "—"}`,
    });
  }
  return out;
}
