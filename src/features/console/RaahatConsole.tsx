import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LayoutDashboard, LifeBuoy, Siren, Map as MapIcon, Activity, Boxes } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { Emergency } from "../Emergency";
import { useLocal, H, Wrap, StatTiles } from "./kit";
import { Raahat } from "../Raahat";
import {
  ALERTS, band, floodRisk, wildfireRisk, allocate, hazardColor,
  type Area, type ResourcePool,
} from "./raahatLib";

const ACCENT = "#0E8FA8";

/* ----------------------------- helpers ----------------------------- */
function Gauge({ score, label }: { score: number; label: string }) {
  const b = band(score);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-graphite">{label}</span>
        <span className="text-sm font-bold" style={{ color: b.color }}>{score} · {b.label}</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${score}%`, background: b.color }} />
      </div>
    </div>
  );
}

function Slider({ label, value, set, min, max, unit }: { label: string; value: number; set: (n: number) => void; min: number; max: number; unit: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span className="text-graphite">{label}</span>
        <span className="font-semibold text-ink">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full" style={{ accentColor: ACCENT }} />
    </label>
  );
}

/* ------------------------------- map ------------------------------- */
function HazardMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, zoomControl: true }).setView([22.8, 80.5], 4.4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
    ALERTS.forEach((a) => {
      const c = hazardColor[a.type];
      const radius = 8 + (a.level / 100) * 22;
      L.circleMarker([a.lat, a.lng], { radius, color: c, weight: 1.5, fillColor: c, fillOpacity: 0.35 })
        .addTo(map)
        .bindPopup(`<b>${a.city}, ${a.state}</b><br>${a.type} · level ${a.level}<br>${a.note}`)
        .bindTooltip(`${a.city} · ${a.type} ${a.level}`, { direction: "top", offset: [0, -4] });
    });
    mapRef.current = map;
    const tid = setTimeout(() => map.invalidateSize(), 280);
    return () => { clearTimeout(tid); map.remove(); mapRef.current = null; };
  }, []);
  return (
    <Wrap>
      <H title="Live hazard map" sub="Signal-fusion hotspots across India — weather, satellite and news feeds combined." />
      <div className="mb-3 flex flex-wrap gap-3">
        {Object.entries(hazardColor).map(([k, c]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs font-medium text-graphite">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {k}
          </span>
        ))}
      </div>
      <div className="card overflow-hidden p-2">
        <div ref={ref} className="h-[480px] w-full rounded-2xl" style={{ zIndex: 0 }} />
      </div>
    </Wrap>
  );
}

/* ----------------------------- console ----------------------------- */
export function RaahatConsole({ onBack }: { onBack: () => void }) {
  const sorted = [...ALERTS].sort((a, b) => b.level - a.level);
  const severe = ALERTS.filter((a) => a.level >= 75).length;
  const types = new Set(ALERTS.map((a) => a.type)).size;

  // risk model state
  const [rainfall, setRainfall] = useState(180);
  const [riverLevel, setRiverLevel] = useState(78);
  const [soil, setSoil] = useState(70);
  const [drainage, setDrainage] = useState(40);
  const [temp, setTemp] = useState(38);
  const [humidity, setHumidity] = useState(28);
  const [wind, setWind] = useState(34);
  const [dryness, setDryness] = useState(72);
  const flood = floodRisk({ rainfall, riverLevel, soil, drainage });
  const fire = wildfireRisk({ temp, humidity, wind, dryness });

  // resource allocation state
  const [areas, setAreas] = useLocal<Area[]>("saarthi.raahat.areas", [
    { name: "Eastern wards (riverbank)", affected: 12000, severity: 3 },
    { name: "Central market area", affected: 6000, severity: 2 },
    { name: "Northern suburb", affected: 3000, severity: 1 },
  ]);
  const [pool, setPool] = useLocal<ResourcePool>("saarthi.raahat.pool", { boats: 40, foodKits: 5000, medkits: 800, shelters: 25 });
  const plan = allocate(areas, pool);
  const setArea = (i: number, patch: Partial<Area>) => setAreas(areas.map((a, k) => (k === i ? { ...a, ...patch } : a)));

  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Disaster operating picture" sub="What the fused weather, satellite, news and social feeds are showing right now." />
          <StatTiles accent={ACCENT} tiles={[
            { v: ALERTS.length, l: "Active alerts" },
            { v: severe, l: "Severe (≥75)" },
            { v: sorted[0]?.city ?? "—", l: "Highest risk now" },
            { v: types, l: "Hazard types tracked" },
          ]} />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="card p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Active alerts</h3>
              <div className="space-y-2">
                {sorted.map((a) => {
                  const b = band(a.level);
                  return (
                    <div key={a.city} className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3">
                      <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ background: hazardColor[a.type] }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{a.city}, {a.state}</span>
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: b.color }}>{a.type} {a.level}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{a.note}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card flex flex-col justify-between p-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Assess a situation</h3>
                <p className="text-[15px] text-graphite">Paste a live report — weather, river/forest status, news and what locals are posting — and Narayan predicts the hazards, safe routes and resource plan.</p>
              </div>
              <button onClick={() => go("assess")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>New assessment</button>
            </div>
          </div>
        </Wrap>
      ),
    },
    { id: "assess", label: "Assess situation", icon: LifeBuoy, render: () => <Wrap><Raahat embedded /></Wrap> },
    { id: "map", label: "Live map", icon: MapIcon, render: () => <HazardMap /> },
    {
      id: "risk", label: "Risk model", icon: Activity,
      render: () => (
        <Wrap>
          <H title="Risk model" sub="Reproducible flood & wildfire scores computed on-device from weather and terrain signals — not by AI." />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-6">
              <div className="mb-4 inline-flex items-center gap-2 font-semibold text-ink"><Siren className="h-4 w-4" style={{ color: ACCENT }} /> Flood</div>
              <div className="space-y-4">
                <Slider label="Rainfall (24h)" value={rainfall} set={setRainfall} min={0} max={300} unit=" mm" />
                <Slider label="River level" value={riverLevel} set={setRiverLevel} min={0} max={100} unit="%" />
                <Slider label="Soil saturation" value={soil} set={setSoil} min={0} max={100} unit="%" />
                <Slider label="Drainage capacity" value={drainage} set={setDrainage} min={0} max={100} unit="%" />
              </div>
              <div className="mt-5"><Gauge score={flood} label="Flood risk" /></div>
            </div>
            <div className="card p-6">
              <div className="mb-4 inline-flex items-center gap-2 font-semibold text-ink"><Activity className="h-4 w-4" style={{ color: ACCENT }} /> Wildfire</div>
              <div className="space-y-4">
                <Slider label="Temperature" value={temp} set={setTemp} min={0} max={50} unit="°C" />
                <Slider label="Humidity" value={humidity} set={setHumidity} min={0} max={100} unit="%" />
                <Slider label="Wind speed" value={wind} set={setWind} min={0} max={80} unit=" km/h" />
                <Slider label="Vegetation dryness" value={dryness} set={setDryness} min={0} max={100} unit="%" />
              </div>
              <div className="mt-5"><Gauge score={fire} label="Wildfire risk" /></div>
            </div>
          </div>
          <p className="mt-4 text-xs text-faint">Decision-support only — always follow official NDMA / SDMA warnings.</p>
        </Wrap>
      ),
    },
    {
      id: "resources", label: "Resource plan", icon: Boxes,
      render: () => (
        <Wrap>
          <H title="Resource allocation" sub="Allocates rescue resources by affected population × severity. Edit the figures — the split recomputes instantly." />
          <div className="card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Available resources</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([["boats", "Boats"], ["foodKits", "Food kits"], ["medkits", "Med kits"], ["shelters", "Shelters"]] as const).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-xs text-muted">{label}</span>
                  <input type="number" min={0} value={pool[k]} onChange={(e) => setPool({ ...pool, [k]: Math.max(0, Number(e.target.value)) })} className="field mt-1" />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Affected area</th>
                  <th className="p-3">People</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Share</th>
                  <th className="p-3">Boats</th>
                  <th className="p-3">Food</th>
                  <th className="p-3">Medics</th>
                  <th className="p-3">Shelters</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((p, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="p-3 font-medium text-ink">{p.name}</td>
                    <td className="p-3"><input type="number" min={0} value={areas[i].affected} onChange={(e) => setArea(i, { affected: Math.max(0, Number(e.target.value)) })} className="w-24 rounded-lg border border-line bg-paper px-2 py-1" /></td>
                    <td className="p-3">
                      <select value={areas[i].severity} onChange={(e) => setArea(i, { severity: Number(e.target.value) })} className="rounded-lg border border-line bg-paper px-2 py-1">
                        <option value={1}>1 · Low</option>
                        <option value={2}>2 · High</option>
                        <option value={3}>3 · Severe</option>
                      </select>
                    </td>
                    <td className="p-3 font-semibold" style={{ color: ACCENT }}>{Math.round(p.share * 100)}%</td>
                    <td className="p-3">{p.boats}</td>
                    <td className="p-3">{p.foodKits}</td>
                    <td className="p-3">{p.medkits}</td>
                    <td className="p-3">{p.shelters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Wrap>
      ),
    },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="raahat" /> });
  return <AgentConsole agentKey="raahat" platform="Disaster Response" badge={LifeBuoy} modules={modules} onBack={onBack} />;
}
