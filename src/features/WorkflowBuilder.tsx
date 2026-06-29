import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Loader2, Trash2, Sparkles, CheckCircle2, Eraser, MousePointerClick,
  GripVertical, Info, Ban, Flag, CloudRain, FileText, FileDown, BellRing, CalendarPlus, Download, Copy, X,
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES } from "../lib/features";
import { FeatureKey, callFeature, fileToInlineData } from "../lib/api";
import { AgentAvatar } from "../components/AgentAvatar";
import { CopyBlock } from "../components/ui";
import { NotifyMe } from "../components/NotifyMe";
import { BrandMark } from "../components/Logo";
import { sendToSmriti, scheduleReminder, notify, downloadTasksICS, parseWhen } from "../lib/reminders";

const NODE_W = 168;
const NODE_H = 56;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type NType = "agent" | "weather" | "upload" | "output" | "reminder";
type Fmt = "pdf" | "docx" | "pptx" | "text";

interface Node {
  id: string; type: NType; x: number; y: number;
  agent?: FeatureKey;
  file?: { mimeType: string; data: string }; fileName?: string;  // upload
  format?: Fmt;                                                   // output
  deadline?: string; priority?: "High" | "Medium" | "Low";       // reminder
}
interface Edge { from: string; to: string }

// utility (non-agent) node metadata
const UTIL: Record<Exclude<NType, "agent">, { color: string; Icon: typeof CloudRain; label: string; sub: string }> = {
  weather: { color: "#0E8FA8", Icon: CloudRain, label: "Weather", sub: "Live forecast" },
  upload: { color: "#7A4FB0", Icon: FileText, label: "Photo / PDF", sub: "Read a document" },
  output: { color: "#2D6BFF", Icon: FileDown, label: "Output", sub: "PDF · Word · PPT · Text" },
  reminder: { color: "#2E3A7B", Icon: BellRing, label: "Reminder", sub: "Send to Smriti" },
};
const FMTS: { value: Fmt; label: string }[] = [
  { value: "pdf", label: "PDF" }, { value: "docx", label: "Word (.docx)" }, { value: "pptx", label: "PowerPoint (.pptx)" }, { value: "text", label: "Plain text" },
];

const agentMeta = (k?: string) => FEATURES.find((f) => f.key === k);
const isTerminal = (n: Node) => n.type === "output" || n.type === "reminder" || (n.type === "agent" && n.agent === "samay");
const isSource = (n: Node) => n.type === "weather" || n.type === "upload";
const titleFrom = (s: string) => { const l = (s || "").trim().split(/\n/)[0].replace(/^#+\s*/, ""); return (l.length > 64 ? l.slice(0, 61) + "…" : l) || "Workflow output"; };
const fmtWhen = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

function textToContent(title: string, text: string) {
  const paras = text.split(/\n{2,}|\n/).map((s) => s.trim()).filter(Boolean);
  return {
    title, kind: "document",
    sections: [{ paragraphs: paras.length ? paras : [text] }],
    slides: paras.slice(0, 8).map((p, i) => ({ title: `Point ${i + 1}`, points: [p] })),
  };
}

/** Would linking from→to create a loop? */
function wouldCycle(from: string, to: string, edges: Edge[]): boolean {
  const adj = (id: string) => edges.filter((e) => e.from === id).map((e) => e.to);
  const seen = new Set<string>(); const stack = [to];
  while (stack.length) { const cur = stack.pop()!; if (cur === from) return true; if (seen.has(cur)) continue; seen.add(cur); adj(cur).forEach((x) => stack.push(x)); }
  return false;
}
// reason is an i18n key, resolved with t() at the call site
function linkRule(fromN: Node, toN: Node, edges: Edge[]): { ok: boolean; reason?: string } {
  if (fromN.id === toN.id) return { ok: false, reason: "wb.wSelf" };
  if (edges.some((e) => e.from === fromN.id && e.to === toN.id)) return { ok: false };
  if (isTerminal(fromN)) return { ok: false, reason: "wb.wTerminal" };
  if (isSource(toN)) return { ok: false, reason: "wb.wSource" };
  if (wouldCycle(fromN.id, toN.id, edges)) return { ok: false, reason: "wb.wLoop" };
  return { ok: true };
}

// util-node label / tip i18n keys
const ULAB: Record<string, string> = { weather: "wb.weather", upload: "wb.upload", output: "wb.output", reminder: "wb.reminder" };
const UTIP: Record<string, string> = { weather: "wb.weatherTip", upload: "wb.uploadTip", output: "wb.outputTip", reminder: "wb.reminderTip" };

type IA =
  | { kind: "node"; id: string; dx: number; dy: number }
  | { kind: "link"; from: string }
  | { kind: "spawn"; spec: { type: NType; agent?: FeatureKey } };

/** Order nodes by following edges from the start node(s); isolated nodes go last. */
function chainOrder(nodes: Node[], edges: Edge[]): Node[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => indeg.set(e.to, (indeg.get(e.to) || 0) + 1));
  const out = (id: string) => edges.filter((e) => e.from === id).map((e) => e.to);
  const starts = nodes.filter((n) => (indeg.get(n.id) || 0) === 0);
  const seen = new Set<string>(); const order: Node[] = [];
  const visit = (id: string) => { if (seen.has(id)) return; seen.add(id); const n = byId.get(id); if (n) order.push(n); out(id).forEach(visit); };
  (starts.length ? starts : nodes).forEach((n) => visit(n.id));
  nodes.forEach((n) => { if (!seen.has(n.id)) order.push(n); });
  return order;
}

interface Res { type: NType; text?: string; format?: Fmt; deadline?: string; priority?: string; title?: string }

export function WorkflowBuilder({ onBack }: { onBack: () => void }) {
  const { t, lang } = useApp();
  const idc = useRef(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const iaRef = useRef<IA | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const warnTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [ia, setIa] = useState<IA | null>(null);
  const [pt, setPt] = useState<{ cx: number; cy: number; vx: number; vy: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [seed, setSeed] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Res>>({});
  const [warn, setWarn] = useState("");

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  function flashWarn(msg: string) { setWarn(msg); if (warnTimer.current) window.clearTimeout(warnTimer.current); warnTimer.current = window.setTimeout(() => setWarn(""), 2800); }
  const nodeAt = (cx: number, cy: number) => [...nodesRef.current].reverse().find((n) => cx >= n.x && cx <= n.x + NODE_W && cy >= n.y && cy <= n.y + NODE_H) || null;

  function makeNode(spec: { type: NType; agent?: FeatureKey }, x: number, y: number): Node {
    const base: Node = { id: `n${idc.current++}`, type: spec.type, x, y };
    if (spec.type === "agent") base.agent = spec.agent;
    if (spec.type === "output") base.format = "pdf";
    if (spec.type === "reminder") base.priority = "High";
    return base;
  }

  function begin(next: IA, e: React.PointerEvent) {
    e.preventDefault();
    iaRef.current = next; setIa(next);
    if (next.kind === "node") setSelected(next.id);
    const r = canvasRef.current?.getBoundingClientRect();
    setPt({ cx: r ? e.clientX - r.left : 0, cy: r ? e.clientY - r.top : 0, vx: e.clientX, vy: e.clientY });
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const cur = iaRef.current; if (!cur) return;
      const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      if (cur.kind === "node") {
        setNodes((p) => p.map((n) => (n.id === cur.id ? { ...n, x: clamp(cx - cur.dx, 0, r.width - NODE_W), y: clamp(cy - cur.dy, 0, r.height - NODE_H) } : n)));
      } else setPt({ cx, cy, vx: e.clientX, vy: e.clientY });
    };
    const up = (e: PointerEvent) => {
      const cur = iaRef.current; if (!cur) return;
      const r = canvasRef.current?.getBoundingClientRect();
      if (r) {
        const cx = e.clientX - r.left, cy = e.clientY - r.top;
        const inCanvas = cx >= 0 && cy >= 0 && cx <= r.width && cy <= r.height;
        if (cur.kind === "spawn") {
          const x = inCanvas ? clamp(cx - NODE_W / 2, 0, r.width - NODE_W) : 16 + (nodesRef.current.length % 5) * 26;
          const y = inCanvas ? clamp(cy - NODE_H / 2, 0, r.height - NODE_H) : 16 + (nodesRef.current.length % 5) * 26;
          const node = makeNode(cur.spec, x, y);
          setNodes((p) => [...p, node]); setSelected(node.id);
        } else if (cur.kind === "link") {
          const target = nodeAt(cx, cy);
          const fromN = nodesRef.current.find((n) => n.id === cur.from);
          if (target && fromN) {
            const res = linkRule(fromN, target, edgesRef.current);
            if (res.ok) setEdges((p) => [...p, { from: cur.from, to: target.id }]);
            else if (res.reason) flashWarn(t(res.reason));
          }
        }
      }
      iaRef.current = null; setIa(null); setPt(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  function patch(id: string, p: Partial<Node>) { setNodes((arr) => arr.map((n) => (n.id === id ? { ...n, ...p } : n))); }
  function removeNode(id: string) {
    setNodes((p) => p.filter((n) => n.id !== id));
    setEdges((p) => p.filter((e) => e.from !== id && e.to !== id));
    setResults((p) => { const n = { ...p }; delete n[id]; return n; });
    if (selected === id) setSelected(null);
  }
  function clearAll() { setNodes([]); setEdges([]); setResults({}); setSelected(null); }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const file = e.target.files?.[0]; if (!file) return;
    patch(id, { file: await fileToInlineData(file), fileName: file.name });
  }

  async function run() {
    if (!nodes.length || !seed.trim()) return;
    setRunning(true); setResults({}); setActive(null);
    const order = chainOrder(nodes, edges);
    let context = seed, lastText = seed;
    const acc: Record<string, Res> = {};
    try {
      for (const n of order) {
        setActive(n.id);
        if (n.type === "weather") {
          const w = await (await fetch(`/api/weather?place=${encodeURIComponent(seed)}`)).json();
          const txt = w.summary || "Live weather unavailable.";
          acc[n.id] = { type: "weather", text: txt }; context += `\n\nLive weather: ${txt}`;
        } else if (n.type === "upload") {
          if (n.file) {
            const r = await callFeature<{ summary?: string }>("samajh", { image: n.file, text: "Read this document and summarise what it says and what needs doing, for the next step.", language: lang.name });
            const txt = r.summary || "(could not read the document)";
            acc[n.id] = { type: "upload", text: txt }; context += `\n\nFrom the uploaded document: ${txt}`;
          } else acc[n.id] = { type: "upload", text: "No file uploaded — select one in the inspector." };
        } else if (n.type === "agent") {
          const r = await callFeature<{ agentName?: string; reply: string }>("assist", { problem: context, agentHint: n.agent, language: lang.name });
          lastText = r.reply; context += `\n\n${r.agentName || t(agentMeta(n.agent)!.nameKey)} said: ${r.reply}`;
          acc[n.id] = { type: "agent", text: r.reply };
        } else if (n.type === "output") {
          acc[n.id] = { type: "output", format: n.format, text: lastText };
        } else if (n.type === "reminder") {
          const title = titleFrom(lastText);
          const when = parseWhen(n.deadline).toISOString();   // always a valid date/time
          sendToSmriti({ title, deadline: when, priority: n.priority, estimateMins: 30, source: "Workflow" });
          scheduleReminder(title, when);
          await notify("Saved to Smriti ✅", `Reminder set for ${fmtWhen(when)}.`);
          acc[n.id] = { type: "reminder", deadline: when, priority: n.priority, title, text: lastText };
        }
        setResults({ ...acc });
      }
    } catch { /* keep calm */ } finally { setActive(null); setRunning(false); }
  }

  async function downloadOutput(format: Fmt, text: string, title: string) {
    if (format === "text") {
      const blob = new Blob([`${title}\n\n${text}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, "_") || "output"}.txt`; a.click(); URL.revokeObjectURL(url);
      return;
    }
    const res = await fetch("/api/study/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: textToContent(title, text), format, font: "Times New Roman", size: 12 }) });
    if (!res.ok) return;
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, "_") || "output"}.${format}`; a.click(); URL.revokeObjectURL(url);
  }

  const outPt = (n: Node) => ({ x: n.x + NODE_W, y: n.y + NODE_H / 2 });
  const inPt = (n: Node) => ({ x: n.x, y: n.y + NODE_H / 2 });
  const linking = ia?.kind === "link" ? nodes.find((n) => n.id === ia.from) : null;
  const sel = nodes.find((n) => n.id === selected) || null;

  // palette groups
  const sources: { spec: { type: NType; agent?: FeatureKey }; label: string; tip: string; color: string; Icon?: typeof CloudRain }[] = [
    { spec: { type: "weather" }, label: t("wb.weather"), tip: t("wb.weatherTip"), color: UTIL.weather.color, Icon: CloudRain },
    { spec: { type: "upload" }, label: t("wb.upload"), tip: t("wb.uploadTip"), color: UTIL.upload.color, Icon: FileText },
  ];
  const outputs = [
    { spec: { type: "output" as NType }, label: t("wb.output"), tip: t("wb.outputTip"), color: UTIL.output.color, Icon: FileDown },
    { spec: { type: "reminder" as NType }, label: t("wb.reminder"), tip: t("wb.reminderTip"), color: UTIL.reminder.color, Icon: BellRing },
  ];

  const Chip = ({ onDown, color, label, tip, Icon, avatar }: { onDown: (e: React.PointerEvent) => void; color: string; label: string; tip: string; Icon?: typeof CloudRain; avatar?: React.ReactNode }) => (
    <div className="group relative">
      <button onPointerDown={onDown} className="inline-flex touch-none items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 transition-colors hover:bg-mist" style={{ cursor: "grab" }}>
        {avatar || <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white" style={{ background: color }}>{Icon && <Icon className="h-3.5 w-3.5" />}</span>}
        <span className="text-xs font-semibold text-ink deva">{label}</span>
        <GripVertical className="h-3.5 w-3.5 text-faint" />
      </button>
      {/* hover role tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity duration-150 group-hover:opacity-100">{tip}</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" /> {t("wf.all")}</button>
        {nodes.length > 0 && <button onClick={clearAll} className="btn-ghost text-sm"><Eraser className="h-4 w-4" /> {t("wb.clear")}</button>}
      </div>

      <div className="mt-6">
        <h1 className="display text-3xl font-bold deva">{t("wf.build")}</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-muted deva">{t("wb.sub")}</p>
      </div>

      {/* rules */}
      <div className="mt-4 rounded-2xl border border-line bg-mist/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink deva"><Info className="h-4 w-4" style={{ color: "#2D6BFF" }} /> {t("wb.how")}</div>
        <ul className="grid gap-1.5 text-[13px] text-graphite deva sm:grid-cols-2">
          <li className="flex gap-2"><span className="text-[#2D6BFF]">1.</span> {t("wb.r1")}</li>
          <li className="flex gap-2"><span className="text-[#2D6BFF]">2.</span> {t("wb.r2")}</li>
          <li className="flex gap-2"><CloudRain className="h-3.5 w-3.5 flex-none translate-y-0.5" style={{ color: UTIL.weather.color }} /> {t("wb.r3")}</li>
          <li className="flex gap-2"><Flag className="h-3.5 w-3.5 flex-none translate-y-0.5" style={{ color: "#2E3A7B" }} /> {t("wb.r4")}</li>
          <li className="flex gap-2"><Ban className="h-3.5 w-3.5 flex-none translate-y-0.5 text-danger" /> {t("wb.r5")}</li>
          <li className="flex gap-2"><Play className="h-3.5 w-3.5 flex-none translate-y-0.5" style={{ color: "#2D6BFF" }} /> {t("wb.r6")}</li>
        </ul>
      </div>

      {/* palette — label above each group so chips align in a clean grid */}
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint deva">{t("wb.sources")}</div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => <Chip key={s.label} onDown={(e) => begin({ kind: "spawn", spec: s.spec }, e)} color={s.color} label={s.label} tip={s.tip} Icon={s.Icon} />)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint deva">{t("wb.agents")}</div>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <Chip key={f.key} onDown={(e) => begin({ kind: "spawn", spec: { type: "agent", agent: f.key } }, e)} color={f.accent} label={t(f.nameKey)} tip={t(f.tagKey)}
                avatar={<AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-6 w-6 flex-none" />} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint deva">{t("wb.outputs")}</div>
          <div className="flex flex-wrap gap-2">
            {outputs.map((s) => <Chip key={s.label} onDown={(e) => begin({ kind: "spawn", spec: s.spec }, e)} color={s.color} label={s.label} tip={s.tip} Icon={s.Icon} />)}
          </div>
        </div>
      </div>

      {/* canvas (wrapped so the config popover can extend past the clipped canvas) */}
      <div className="relative mt-4">
      <div ref={canvasRef} className="relative h-[460px] w-full touch-none overflow-hidden rounded-3xl border-2 transition-colors"
        style={{ borderColor: ia?.kind === "spawn" ? "#2D6BFF" : "var(--line,#e7e3da)", borderStyle: ia?.kind === "spawn" ? "dashed" : "solid", background: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px) 0 0 / 22px 22px, #FBFAF7" }}>
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted">
            <MousePointerClick className="h-7 w-7 text-faint" />
            <p className="text-sm deva">{t("wb.empty")}</p>
          </div>
        )}

        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs><marker id="wb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#8B79c4" /></marker></defs>
          {edges.map((e, i) => {
            const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            const s = outPt(a), d = inPt(b), mx = (s.x + d.x) / 2;
            return <path key={i} d={`M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${d.y}, ${d.x} ${d.y}`} fill="none" stroke="#8B79c4" strokeWidth="2.5" markerEnd="url(#wb-arrow)" />;
          })}
          {linking && pt && (() => { const s = outPt(linking), mx = (s.x + pt.cx) / 2; return <path d={`M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${pt.cy}, ${pt.cx} ${pt.cy}`} fill="none" stroke="#2D6BFF" strokeWidth="2.5" strokeDasharray="5 4" />; })()}
        </svg>

        {nodes.map((n) => {
          const isAgent = n.type === "agent";
          const f = agentMeta(n.agent);
          const u = !isAgent ? UTIL[n.type as Exclude<NType, "agent">] : null;
          const color = isAgent ? (f?.accent || "#444") : u!.color;
          const isActive = active === n.id;
          const isDone = !!results[n.id];
          const isLinkSrc = ia?.kind === "link" && ia.from === n.id;
          const dragging = ia?.kind === "node" && ia.id === n.id;
          const term = isTerminal(n);
          const fromN = ia?.kind === "link" ? nodes.find((x) => x.id === ia.from) : null;
          const asTarget = fromN && !isLinkSrc ? linkRule(fromN, n, edges) : null;
          const ring = isActive ? `0 0 0 3px ${color}33` : asTarget ? (asTarget.ok ? "0 0 0 3px rgba(46,111,82,0.45)" : "0 0 0 3px rgba(178,58,46,0.4)") : selected === n.id ? `0 0 0 2px ${color}` : dragging ? "0 12px 30px rgba(0,0,0,0.14)" : undefined;
          const sub = isAgent ? (term ? t("wb.managerFinal") : t(f!.tagKey))
            : n.type === "output" ? `${t("wb.output")}: ${(n.format || "pdf").toUpperCase()}`
            : n.type === "reminder" ? (n.deadline ? fmtWhen(n.deadline) : t("wb.setDeadline"))
            : n.type === "upload" ? (n.fileName || t(UTIP[n.type])) : t(UTIP[n.type]);
          const label = isAgent ? t(f!.nameKey) : t(ULAB[n.type]);
          const Icon = u?.Icon;
          return (
            <div key={n.id}
              onPointerDown={(e) => { const r = canvasRef.current!.getBoundingClientRect(); begin({ kind: "node", id: n.id, dx: e.clientX - r.left - n.x, dy: e.clientY - r.top - n.y }, e); }}
              onDragStart={(e) => e.preventDefault()}
              className="absolute flex touch-none select-none items-center gap-2 rounded-2xl border bg-white px-2.5 shadow-soft"
              style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H, cursor: dragging ? "grabbing" : "grab", borderColor: isLinkSrc || isActive ? color : asTarget ? (asTarget.ok ? "#2E6F52" : "#B23A2E") : "var(--line,#e7e3da)", boxShadow: ring, zIndex: dragging ? 20 : 10 }}>
              {!isSource(n) && <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-white" style={{ borderColor: color }} />}

              {isAgent ? <AgentAvatar photo={f!.photo} name={label} tint={f!.tint} accent={f!.accent} rounded="rounded-lg" className="h-9 w-9 flex-none" />
                : <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white" style={{ background: color }}>{Icon && <Icon className="h-4 w-4" />}</span>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink deva">{label}</div>
                <div className="truncate text-[11px] text-muted deva">{sub}</div>
              </div>
              {isActive ? <Loader2 className="h-4 w-4 flex-none animate-spin" style={{ color }} /> : isDone ? <CheckCircle2 className="h-4 w-4 flex-none text-[#2E6F52]" /> : null}

              {term ? <span title="Final step" className="absolute -right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-white" style={{ background: color }}><Flag className="h-3 w-3" /></span>
                : <span onPointerDown={(e) => { e.stopPropagation(); begin({ kind: "link", from: n.id }, e); }} title="Drag to another node to connect" className="absolute -right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-crosshair items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: color }}><span className="h-2 w-2 rounded-full" style={{ background: color }} /></span>}

              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"><Trash2 className="h-3 w-3" /></button>
            </div>
          );
        })}

        <AnimatePresence>
          {warn && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-3 z-30 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-[#B23A2E] px-4 py-2 text-xs font-medium text-white shadow-float">
              <Ban className="h-4 w-4 flex-none" /> {warn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* node-anchored config popover — opens right at the selected node */}
      {sel && (sel.type === "upload" || sel.type === "output" || sel.type === "reminder") && !(ia?.kind === "node" && ia.id === sel.id) && (() => {
        const u = UTIL[sel.type as Exclude<NType, "agent">];
        const left = clamp(sel.x, 0, (canvasRef.current?.clientWidth || 800) - 248);
        const top = sel.y + NODE_H + 12;
        return (
          <div className="absolute z-40 w-[240px] rounded-2xl border border-line bg-white p-3 shadow-float" style={{ left, top }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg text-white" style={{ background: u.color }}><u.Icon className="h-3.5 w-3.5" /></span>
              <span className="text-[13px] font-semibold text-ink deva">{t(ULAB[sel.type])} {t("wb.settings")}</span>
              <button onClick={() => setSelected(null)} className="ml-auto text-faint hover:text-ink"><X className="h-4 w-4" /></button>
            </div>
            {sel.type === "upload" && (
              <div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={(e) => onUpload(e, sel.id)} className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full justify-center text-sm deva"><FileText className="h-4 w-4" /> {t("wb.choosePhoto")}</button>
                {sel.fileName && <p className="mt-2 truncate text-xs text-graphite">{sel.fileName}</p>}
              </div>
            )}
            {sel.type === "output" && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted deva">{t("wb.chooseFmt")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {FMTS.map((f) => {
                    const on = (sel.format || "pdf") === f.value;
                    return <button key={f.value} onClick={() => patch(sel.id, { format: f.value })} className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors" style={on ? { background: u.color, borderColor: u.color, color: "#fff" } : { borderColor: "var(--line,#e7e3da)", color: "#555" }}>{f.label}</button>;
                  })}
                </div>
              </div>
            )}
            {sel.type === "reminder" && (
              <div className="space-y-2.5">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted deva"><CalendarPlus className="h-3.5 w-3.5" /> {t("wb.deadline")}</div>
                  <input type="datetime-local" value={sel.deadline || ""} onChange={(e) => patch(sel.id, { deadline: e.target.value })} className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm" />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted deva">{t("wb.priority")}</div>
                  <div className="flex gap-1.5">
                    {["High", "Medium", "Low"].map((p) => {
                      const on = (sel.priority || "High") === p;
                      return <button key={p} onClick={() => patch(sel.id, { priority: p as Node["priority"] })} className="flex-1 rounded-full border px-2 py-1 text-xs font-medium" style={on ? { background: u.color, borderColor: u.color, color: "#fff" } : { borderColor: "var(--line,#e7e3da)", color: "#555" }}>{p}</button>;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      </div>

      {/* floating ghost while dragging from the palette */}
      {ia?.kind === "spawn" && pt && (() => {
        const spec = ia.spec; const f = agentMeta(spec.agent); const u = spec.type !== "agent" ? UTIL[spec.type as Exclude<NType, "agent">] : null;
        return (
          <div className="pointer-events-none fixed z-50 inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 shadow-float" style={{ left: pt.vx + 12, top: pt.vy + 12 }}>
            {f ? <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-6 w-6 flex-none" />
              : <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white" style={{ background: u!.color }}>{u && <u.Icon className="h-3.5 w-3.5" />}</span>}
            <span className="text-xs font-semibold text-ink deva">{f ? t(f.nameKey) : u!.label}</span>
          </div>
        );
      })()}

      {/* run */}
      <div className="card mt-4 p-5">
        <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={3} placeholder={t("wb.runPh")} className="field resize-none deva" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={running || !nodes.length || !seed.trim()} className="btn-accent text-[15px]" style={{ background: "#2D6BFF" }}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("wb.runningBtn")}</> : <><Play className="h-4 w-4" /> {t("wb.runBtn")}</>}
          </button>
          <span className="text-xs text-faint">{nodes.length} {t("wb.nodes")} · {edges.length} {t("wb.links")}</span>
        </div>
      </div>

      {/* results */}
      {Object.keys(results).length > 0 && (
        <div className="mt-6 space-y-3">
          {chainOrder(nodes, edges).filter((n) => results[n.id]).map((n, i) => {
            const r = results[n.id]; const isAgent = n.type === "agent"; const f = agentMeta(n.agent);
            const u = !isAgent ? UTIL[n.type as Exclude<NType, "agent">] : null;
            const color = isAgent ? (f?.accent || "#444") : u!.color;
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: color }}>{i + 1}</span>
                  {isAgent ? <AgentAvatar photo={f!.photo} name={t(f!.nameKey)} tint={f!.tint} accent={f!.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
                    : <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ background: color }}>{u && <u.Icon className="h-4 w-4" />}</span>}
                  <span className="font-semibold text-ink deva">{isAgent ? t(f!.nameKey) : t(ULAB[n.type])}</span>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-[#2E6F52]" />
                </div>

                {r.type === "reminder" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-[15px] text-graphite deva">{t("wb.sentSmriti")} — <b>{r.title}</b>{r.deadline ? <> · {fmtWhen(r.deadline)}</> : ""} · {r.priority}. Smriti will remind you.</p>
                    <button onClick={() => downloadTasksICS([{ title: r.title || "Reminder", deadline: r.deadline }], "saarthi-reminder.ics")} className="btn-ghost text-sm"><CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)</button>
                  </div>
                ) : r.type === "output" ? (
                  <div className="mt-2 space-y-3">
                    <CopyBlock text={r.text || ""} />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => downloadOutput(r.format || "pdf", r.text || "", titleFrom(r.text || seed))} className="btn-accent text-sm" style={{ background: color }}>
                        {(r.format || "pdf") === "text" ? <Copy className="h-4 w-4" /> : <Download className="h-4 w-4" />} {t("wb.download")} {(r.format || "pdf").toUpperCase()}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-graphite deva">{r.text}</p>
                )}
              </motion.div>
            );
          })}
          {!running && (
            <>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-mist py-4 text-sm font-medium text-graphite deva"><BrandMark className="h-4 w-4 text-[#2D6BFF]" /> {t("wb.ranEnd")}</div>
              <NotifyMe accent="#2D6BFF" getPayload={() => ({
                title: "Your workflow result — Saarthi",
                message: chainOrder(nodes, edges).filter((n) => results[n.id]).map((n) => {
                  const f = agentMeta(n.agent);
                  const label = n.type === "agent" ? t(f!.nameKey) : t(ULAB[n.type]);
                  return `• ${label}:\n${results[n.id].text || ""}`;
                }).join("\n\n"),
              })} />
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
