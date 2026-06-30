import { motion } from "framer-motion";
import { Mic, Square, Check, AlertTriangle, ArrowRight, Copy } from "lucide-react";
import { ReactNode, useState, useRef, useEffect } from "react";
import { useApp } from "../app/AppContext";
import { BrandMark } from "./Logo";
import { linkify } from "../lib/linkify";

/* ---------- Motion reveal ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Eyebrow label ---------- */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]"
      style={{ color: color || "#2D6BFF" }}
    >
      <span className="h-px w-6" style={{ background: color || "#2D6BFF" }} />
      {children}
    </span>
  );
}

/* ---------- Live / Demo badge ---------- */
export function StatusBadge({ live, label }: { live: boolean; label: string }) {
  return (
    <span className="pill">
      <span
        className={`relative flex h-2 w-2 ${live ? "" : ""}`}
        aria-hidden
      >
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${live ? "animate-ping bg-verdant" : ""}`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-verdant" : "bg-amber2"}`} />
      </span>
      {label}
    </span>
  );
}

/* ---------- Thinking spinner ---------- */
export function Thinking({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // when an agent starts thinking, bring the indicator into view automatically
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-3 scroll-mt-24 text-graphite">
      <span className="inline-flex h-6 w-6 flex-none animate-pulse text-[#2D6BFF]">
        <BrandMark className="h-6 w-6" />
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#2D6BFF]/50"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
    </div>
  );
}

/* ---------- Voice button ---------- */
export function VoiceButton({
  listening,
  onClick,
  speakLabel,
  listeningLabel,
}: {
  listening: boolean;
  onClick: () => void;
  speakLabel: string;
  listeningLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn px-4 py-2.5 text-sm border ${
        listening
          ? "bg-danger text-white border-danger animate-pulse"
          : "bg-paper text-graphite border-line hover:border-clay-300 hover:text-clay-600"
      }`}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening ? listeningLabel : speakLabel}
    </button>
  );
}

/* ---------- Result list block ---------- */
export function ListBlock({
  title,
  items,
  tone = "neutral",
  accent,
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "good" | "warn";
  accent?: string;
}) {
  if (!items?.length) return null;
  const Icon = tone === "warn" ? AlertTriangle : tone === "good" ? Check : ArrowRight;
  const color = tone === "warn" ? "#B23A2E" : tone === "good" ? "#1F6F5C" : accent || "#3A352D";
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-graphite">
            <Icon className="mt-0.5 h-4 w-4 flex-none" style={{ color }} />
            <span>{linkify(it)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Sample-result note ---------- */
export function MockNote({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-amber2/40 bg-amber2/5 px-3 py-2 text-xs text-amber2">
      <AlertTriangle className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}

/* ---------- Copyable text block ---------- */
export function CopyBlock({ text }: { text: string }) {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative rounded-2xl border border-line bg-mist">
      <button
        onClick={copy}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-graphite shadow-soft hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-verdant" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("common.copied") : t("common.copy")}
      </button>
      <pre className="deva max-h-[28rem] overflow-auto whitespace-pre-wrap p-5 pr-24 font-sans text-[15px] leading-relaxed text-graphite">
        {linkify(text)}
      </pre>
    </div>
  );
}

/* ---------- Animated card wrapper for results ---------- */
export function ResultCard({ children, accent }: { children: ReactNode; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // scroll the answer into view as soon as it renders
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="card scroll-mt-20 overflow-hidden"
    >
      {accent && <div className="h-1.5 w-full" style={{ background: accent }} />}
      <div className="p-6 sm:p-8">{children}</div>
    </motion.div>
  );
}
