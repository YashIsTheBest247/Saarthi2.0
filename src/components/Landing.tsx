import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Globe,
  Mic,
  Camera,
  Siren,
  CloudRain,
  Plus,
  Workflow,
  Languages as LangIcon,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Circle,
  Users,
  Building2,
  KeyRound,
  Zap,
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES, VISIBLE_FEATURES, FeatureMeta, featureByKey } from "../lib/features";
import { FeatureKey, getEmployees, Employee } from "../lib/api";
import { roleIcon } from "../lib/roleIcons";
import { hireAsEmployee } from "../lib/hire";
import { Reveal, Eyebrow } from "./ui";
import { AgentAvatar } from "./AgentAvatar";
import { BrandMark } from "./Logo";

/* Risk ring kept here for Kavach to import */
export function RiskRing({ value }: { value: number }) {
  const color = value >= 75 ? "#B23A2E" : value >= 40 ? "#B07A1E" : "#2E6F52";
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20 flex-none">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#E8E3D8" strokeWidth="7" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="display text-xl font-bold" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

/* ---------- Vertical marquee (rotating accent phrase) ---------- */
const MARQUEE: Record<string, string[]> = {
  en: ["everyday India ", "every Indian ", "your family ", "1.4 billion lives ", "real life ", "Bharat "],
  hi: ["भारत के लिए", "हर भारतीय के लिए", "आपके परिवार के लिए", "1.4 अरब ज़िंदगियों के लिए", "असली ज़िंदगी के लिए", "हर घर के लिए"],
};

function VerticalMarquee({ iso }: { iso: string }) {
  const phrases = MARQUEE[iso] ?? MARQUEE.en;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % phrases.length), 2300);
    return () => clearInterval(id);
  }, [phrases.length]);
  return (
    <span className="relative inline-flex overflow-hidden align-bottom" style={{ height: "1.05em" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          initial={{ y: "105%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-105%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="block whitespace-nowrap serif-italic font-normal text-white/55 deva"
        >
          {phrases[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------ Hero ------------------------------ */
function Hero(_: { onOpen: (k?: FeatureKey) => void }) {
  const { t, lang } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-[#15110D] text-white">
      {/* background portrait */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[58%]">
        <img src="/agents/hero.jpg" alt="" className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#15110D] via-[#15110D]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110D] via-[#15110D]/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-24 sm:pb-14 sm:pt-28">
        <motion.h1
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
          className="display max-w-2xl text-[2.1rem] font-bold leading-[1.02] tracking-tight sm:text-[4.6rem]"
        >
          <span className="deva">{t("hero.titleA")}</span>
          <br />
          <span>{t("hero.titleB")} </span>
          <VerticalMarquee iso={lang.iso} />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
          className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/70 deva sm:text-lg"
        >
          {t("hero.sub")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/55 deva sm:text-[15px]"
        >
          {t("hero.subB")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-7 flex flex-wrap items-center gap-3"
        >
          <a href="#agents" className="btn group bg-white px-5 py-3 text-[15px] text-[#16140F] shadow-soft hover:-translate-y-0.5">
            {t("hero.cta1")} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <a href="#how" className="btn border border-white/30 px-5 py-3 text-[15px] text-white hover:bg-white/10">
            {t("hero.cta2")}
          </a>
          <a href="https://t.me/saarthi_support_bot" target="_blank" rel="noreferrer" className="btn border border-white/30 px-5 py-3 text-[15px] text-white hover:bg-white/10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M21.94 4.3 18.6 20.06c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.16L17.02 6.4c.41-.36-.09-.56-.63-.2L6.55 12.6l-5.1-1.6c-1.1-.34-1.12-1.1.23-1.63l19.9-7.67c.92-.34 1.73.22 1.36 2.6Z"/></svg>
            {t("hero.cta3")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.32 }}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          <div className="flex flex-wrap -space-x-3">
            {VISIBLE_FEATURES.map((f) => (
              <AgentAvatar key={f.key} photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent}
                rounded="rounded-full" className="h-10 w-10 ring-2 ring-[#15110D]" />
            ))}
            {employees.map((e) => (
              <AgentAvatar key={e.id} photo={e.photo} name={e.name} tint={e.accent} accent={e.accent}
                rounded="rounded-full" className="h-10 w-10 ring-2 ring-[#15110D]" />
            ))}
          </div>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
            <span className="flex items-center gap-1.5"><Mic className="h-4 w-4 text-clay-300" />{t("hero.trust3")}</span>
            <span className="flex items-center gap-1.5"><LangIcon className="h-4 w-4 text-clay-300" />{t("hero.trust2")}</span>
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------- Capabilities -------------------------- */
type StepState = "done" | "active" | "todo";
function StepList({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <div className="relative">
      {steps.map((s, i) => (
        <div key={i} className="relative flex items-center gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[9px] top-6 h-4 w-px bg-line" />}
          {s.state === "done" ? (
            <CheckCircle2 className="h-[18px] w-[18px] flex-none text-verdant" />
          ) : s.state === "active" ? (
            <Loader2 className="h-[18px] w-[18px] flex-none animate-spin text-[#2D6BFF]" />
          ) : (
            <Circle className="h-[18px] w-[18px] flex-none text-faint/50" />
          )}
          <span className={`text-sm ${s.state === "todo" ? "text-faint" : "text-graphite"}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function WinHeader({ tag }: { tag?: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-ink px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
      <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
      <span className="h-2 w-2 rounded-full bg-[#28c840]" />
      {tag && <span className="ml-auto text-[10px] text-white/50">{tag}</span>}
    </div>
  );
}

const WAVE = [7, 12, 20, 28, 18, 10, 22, 32, 24, 14, 8, 16, 26, 34, 22, 12, 7, 14, 24, 30, 20, 12, 8, 18, 26, 16, 9, 13, 20, 10];

function CapCard({
  icon: Icon,
  steps,
  title,
  desc,
  illo,
  delay,
}: {
  icon: typeof MessageSquare;
  steps: { label: string; state: StepState }[];
  title: string;
  desc: string;
  illo: "doc" | "voice" | "canvas";
  delay: number;
}) {
  const { t } = useApp();
  return (
    <Reveal delay={delay}>
      <div className="card flex h-full flex-col p-6">
        <StepList steps={steps} />

        {/* illustration */}
        <div className="my-5">
          {illo === "doc" && (
            <div className="overflow-hidden rounded-xl border border-line bg-paper">
              <WinHeader />
              <div className="space-y-2.5 p-4">
                <div className="h-1.5 w-1/3 rounded-full bg-[#2D6BFF]" />
                <div className="h-1.5 w-full rounded-full bg-line" />
                <div className="h-1.5 w-5/6 rounded-full bg-line" />
                <div className="flex items-center gap-2 pt-1">
                  <span className="rounded-md bg-ink px-2 py-0.5 text-[10px] font-medium text-white">{t("cap.docTag")}</span>
                  <div className="h-1.5 w-1/3 rounded-full bg-line" />
                </div>
              </div>
            </div>
          )}

          {illo === "voice" && (
            <div className="rounded-xl border border-line bg-paper p-4">
              <div className="flex h-14 items-center justify-center gap-[3px]">
                {WAVE.map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{ height: h, background: i % 2 ? "#2D6BFF" : "#16140F", opacity: i % 2 ? 0.85 : 0.3 }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-mist px-3 py-2">
                <Mic className="h-3.5 w-3.5 flex-none text-[#2D6BFF]" />
                <span className="truncate text-[11px] text-graphite deva">{t("cap.voiceMsg")}</span>
              </div>
            </div>
          )}

          {illo === "canvas" && (
            <div className="overflow-hidden rounded-xl border border-line bg-paper">
              <WinHeader tag="✺" />
              <div className="p-4">
                <div className="text-[11px] text-muted deva">{t("cap.canvasTag")}</div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-10 rounded-lg bg-mist" />
                  <div className="h-10 rounded-lg bg-[#D6E4FF]" />
                  <div className="h-10 rounded-lg bg-mist" />
                </div>
                <div className="mt-3 h-1.5 w-1/2 rounded-full bg-[#2D6BFF]" />
              </div>
            </div>
          )}
        </div>

        {/* title + desc */}
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#1A49BD]" />
            <h3 className="display text-xl font-bold deva">{title}</h3>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-muted deva">{desc}</p>
        </div>
      </div>
    </Reveal>
  );
}

function Capabilities() {
  const { t } = useApp();
  return (
    <section className="mx-auto max-w-6xl px-5 pt-6 pb-6 sm:pt-10">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="display text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("cap.title")}</h2>
        <p className="mt-4 text-lg text-muted deva">{t("cap.sub")}</p>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <CapCard
          icon={MessageSquare}
          illo="doc"
          delay={0}
          title={t("cap.c1.t")}
          desc={t("cap.c1.d")}
          steps={[
            { label: t("cap.c1.s1"), state: "done" },
            { label: t("cap.c1.s2"), state: "active" },
            { label: t("cap.c1.s3"), state: "todo" },
          ]}
        />
        <CapCard
          icon={Mic}
          illo="voice"
          delay={0.08}
          title={t("cap.c2.t")}
          desc={t("cap.c2.d")}
          steps={[
            { label: t("cap.c2.s1"), state: "done" },
            { label: t("cap.c2.s2"), state: "active" },
            { label: t("cap.c2.s3"), state: "todo" },
          ]}
        />
        <CapCard
          icon={LangIcon}
          illo="canvas"
          delay={0.16}
          title={t("cap.c3.t")}
          desc={t("cap.c3.d")}
          steps={[
            { label: t("cap.c3.s1"), state: "done" },
            { label: t("cap.c3.s2"), state: "active" },
            { label: t("cap.c3.s3"), state: "todo" },
          ]}
        />
      </div>
    </section>
  );
}

/* -------------------------- Flagship carousel --------------------- */
const KAVACH_MODULES = ["Arrest Detector", "Threat Fusion", "Voice-Spoof", "Fraud Network", "Counterfeit", "Crime Map", "Live Metrics", "Scam News"];

function FlagshipCard({ f, onOpen }: { f: FeatureMeta; onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const Icon = f.icon;
  const isKavach = f.key === "kavach";
  const chips = isKavach ? KAVACH_MODULES : f.stats.map((s) => s.v);
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] text-white" style={{ background: `linear-gradient(135deg, ${f.accentDark} 0%, #14110D 92%)` }}>
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: f.accent, opacity: 0.3 }} />
      <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full blur-3xl" style={{ background: f.accent, opacity: 0.15 }} />
      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium deva">
            <Icon className="h-3.5 w-3.5" /> {isKavach ? t("kflag.eyebrow") : t(f.tagKey)}
          </span>
          <h2 className="display mt-4 text-balance text-3xl font-bold leading-tight tracking-tight deva sm:text-[2.6rem]">
            {isKavach ? t("kflag.title") : t(f.nameKey)}
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-white/65 deva">{isKavach ? t("kflag.body") : t(f.descKey)}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((m) => (
              <span key={m} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">{m}</span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => onOpen(f.key)} className="btn bg-white px-5 py-3 text-[15px] text-[#16140F] hover:-translate-y-0.5">
              {isKavach ? t("kflag.cta") : `${t("common.meet")} ${t(f.nameKey)}`} <ArrowUpRight className="h-4 w-4" />
            </button>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
              {f.stats.slice(0, 2).map((s) => (
                <span key={s.l}><b className="text-white">{s.v}</b> · {s.l}</span>
              ))}
            </span>
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-xs">
          <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-3xl" className="h-full w-full ring-1 ring-white/20" />
          <div className="absolute bottom-3 left-3 rounded-2xl bg-black/55 px-4 py-2.5 backdrop-blur-sm">
            <div className="display text-sm font-bold deva">{t(f.nameKey)}</div>
            <div className="text-[11px] text-white/70 deva">{t(f.tagKey)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Flagship card for a hireable AI employee (same layout, employee data). */
function EmployeeFlagshipCard({ e }: { e: Employee }) {
  const { t } = useApp();
  const Icon = roleIcon(e.icon);
  const chips = e.functions.map((f) => f.name).slice(0, 7);
  const hire = () => window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: { id: e.id } }));
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] text-white" style={{ background: `linear-gradient(135deg, ${e.accent} 0%, #14110D 92%)` }}>
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: e.accent, opacity: 0.3 }} />
      <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full blur-3xl" style={{ background: e.accent, opacity: 0.15 }} />
      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium deva">
            <Icon className="h-3.5 w-3.5" /> {t("agents.wfEyebrow")} · {e.sector}
          </span>
          <h2 className="display mt-4 text-balance text-3xl font-bold leading-tight tracking-tight deva sm:text-[2.6rem]">{e.title}</h2>
          <p className="mt-3 line-clamp-4 max-w-xl leading-relaxed text-white/65 deva">{e.jd}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((m) => (
              <span key={m} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">{m}</span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={hire} className="btn bg-white px-5 py-3 text-[15px] text-[#16140F] hover:-translate-y-0.5">
              {t("wfl.hireOne")} · {e.name} <ArrowUpRight className="h-4 w-4" />
            </button>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
              <span><b className="text-white">{e.functions.length}</b> · {t("wfx.functionsShort")}</span>
              {e.kpis?.[0] && <span><b className="text-white">✓</b> · {e.kpis[0]}</span>}
            </span>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-xs">
          <AgentAvatar photo={e.photo} name={e.name} tint={e.accent} accent={e.accent} rounded="rounded-3xl" className="h-full w-full ring-1 ring-white/20" />
          <div className="absolute bottom-3 left-3 rounded-2xl bg-black/55 px-4 py-2.5 backdrop-blur-sm">
            <div className="display text-sm font-bold deva">{e.name}</div>
            <div className="text-[11px] text-white/70 deva">{e.short}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Slide = { type: "agent"; f: FeatureMeta } | { type: "emp"; e: Employee };

function FlagshipCarousel({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const slides: Slide[] = [
    ...VISIBLE_FEATURES.map((f) => ({ type: "agent" as const, f })),
    ...employees.map((e) => ({ type: "emp" as const, e })),
  ];
  const count = slides.length;
  const [idx, setIdx] = useState(0);

  const sectionRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const idxRef = useRef(0);
  const lockRef = useRef(false);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const go = (n: number) => setIdx(Math.max(0, Math.min(count - 1, n)));

  // Only scrub the cards when the cursor is over them. The wheel then steps one
  // card per gesture and the page stays pinned; at the first/last card (or when the
  // cursor is anywhere else) the page scrolls normally.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!hoverRef.current) return;                 // not on cards → normal page scroll
      const sec = sectionRef.current;
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      const centered = r.top <= 1 && r.bottom >= window.innerHeight - 1; // card pinned in centre
      if (!centered) return;                         // bring the card to centre first
      const dir = e.deltaY > 0 ? 1 : -1;
      const cur = idxRef.current;
      if (dir > 0 && cur >= count - 1) return;       // past last → let page scroll on
      if (dir < 0 && cur <= 0) return;               // before first → let page scroll on
      e.preventDefault();
      if (lockRef.current) return;                   // one card per gesture
      lockRef.current = true;
      setIdx((i) => Math.max(0, Math.min(count - 1, i + dir)));
      setTimeout(() => (lockRef.current = false), 600);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count]);

  return (
    <section ref={sectionRef} id="flagship" className="relative" style={{ minHeight: "112vh" }}>
      <div className="sticky top-0 mx-auto flex h-screen w-full max-w-6xl items-center px-5 py-16">
        <div className="w-full">
        <div
          ref={wrapRef}
          className="relative"
          onMouseEnter={() => { hoverRef.current = true; }}
          onMouseLeave={() => { hoverRef.current = false; }}
        >
          <div className="overflow-hidden">
            <div className="flex" style={{ transform: `translateX(-${idx * 100}%)`, transition: "transform 0.55s cubic-bezier(.22,1,.36,1)", willChange: "transform" }}>
              {slides.map((s) => (
                <div key={s.type === "agent" ? s.f.key : s.e.id} className="w-full flex-none">
                  {s.type === "agent" ? <FlagshipCard f={s.f} onOpen={onOpen} /> : <EmployeeFlagshipCard e={s.e} />}
                </div>
              ))}
            </div>
          </div>

          {/* arrow controls */}
          <button
            onClick={() => go(idx - 1)}
            aria-label="Previous agent"
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55 sm:left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(idx + 1)}
            aria-label="Next agent"
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55 sm:right-4"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.type === "agent" ? s.f.key : s.e.id}
              onClick={() => go(i)}
              aria-label={s.type === "agent" ? `Show ${t(s.f.nameKey)}` : `Show ${s.e.name}`}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ width: i === idx ? 26 : 10, background: i === idx ? (s.type === "agent" ? s.f.accent : s.e.accent) : "#D9D4CB" }}
            />
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Truly Agentic -------------------------- */
const FLOWS = [
  { id: "resolve-grievance", title: "Decode → Complaint → Schedule", desc: "A confusing notice becomes a filed complaint with deadlines.", accent: "#2F6F8F", agents: ["samajh", "setu", "samay"] },
  { id: "msme-launch", title: "Register → Schemes → Plan", desc: "A business idea becomes the exact Udyam/GST path, the MSME loans you qualify for, and a launch plan.", accent: "#138A72", agents: ["udyam", "haq", "samay"] },
  { id: "health-savings", title: "Decode Rx → Refill reminders", desc: "Cheaper generics, then timely refill reminders.", accent: "#C0453B", agents: ["sehat", "samay"] },
  { id: "explainer", title: "Topic → Explainer video → Schedule", desc: "Any topic becomes a short explainer script, then scheduled posts.", accent: "#6D4AA7", agents: ["pragyan", "samay"] },
];

function FlowChain({ agents }: { agents: string[] }) {
  const { t } = useApp();
  return (
    <div className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto">
      {agents.map((a, i) => {
        const m = FEATURES.find((f) => f.key === a);
        return (
          <div key={i} className="flex flex-none items-center gap-2">
            {m ? (
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-1 pr-2.5">
                <AgentAvatar photo={m.photo} name={t(m.nameKey)} tint={m.tint} accent={m.accent} rounded="rounded-full" className="h-6 w-6 flex-none" />
                <span className="whitespace-nowrap text-xs font-semibold text-ink deva">{t(m.nameKey)}</span>
              </span>
            ) : a === "weather" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-2 pr-2.5 text-[#0E8FA8]"><CloudRain className="h-4 w-4" /><span className="text-xs font-semibold">Weather</span></span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-2 pr-2.5 text-[#C0453B]"><Siren className="h-4 w-4" /><span className="text-xs font-semibold">SOS</span></span>
            )}
            {i < agents.length - 1 && <ArrowRight className="h-3.5 w-3.5 flex-none text-faint" />}
          </div>
        );
      })}
    </div>
  );
}

function TrulyAgentic() {
  const open = () => window.dispatchEvent(new Event("saarthi:workflows"));
  const openWf = (id: string) => window.dispatchEvent(new CustomEvent("saarthi:workflows", { detail: { id } }));
  const openBuilder = () => window.dispatchEvent(new CustomEvent("saarthi:workflows", { detail: { build: true } }));
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal className="max-w-2xl">
        <Eyebrow>Truly Agentic</Eyebrow>
        <h2 className="display mt-4 text-balance text-4xl font-bold tracking-tight deva sm:text-5xl">One ask, a whole team of agents.</h2>
        <p className="mt-4 text-lg text-muted deva">Not one model answering — Saarthi <b>chains specialists end-to-end</b>, each agent's output feeding the next. An AI planner picks the right chain for your problem.</p>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {FLOWS.map((fl, i) => (
          <Reveal key={fl.title} delay={(i % 2) * 0.06}>
            <button onClick={() => openWf(fl.id)} className="group flex h-full w-full flex-col rounded-2xl border border-line bg-paper p-5 text-left transition-all hover:-translate-y-1 hover:shadow-float">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ background: fl.accent }}><Workflow className="h-4 w-4" /></span>
                <span className="display text-lg font-bold deva">{fl.title}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted deva">{fl.desc}</p>
              <div className="mt-4"><FlowChain agents={fl.agents} /></div>
            </button>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-8 flex flex-wrap gap-3">
        <button onClick={open} className="btn-primary text-[15px]"><Workflow className="h-4 w-4" /> Run an agentic workflow <ArrowRight className="h-4 w-4" /></button>
        <button onClick={openBuilder} className="btn border border-line bg-paper px-5 py-3 text-[15px] text-ink hover:-translate-y-0.5"><Plus className="h-4 w-4" /> Build your own workflow</button>
      </Reveal>
    </section>
  );
}

/* faint node-graph decoration behind each quiet-job card */
function NodeDecor({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 180 130"
      className="pointer-events-none absolute -right-5 -top-5 h-36 w-48 text-[#2D6BFF] transition-opacity duration-300 group-hover:opacity-100"
      style={{ opacity: 0.13, transform: flip ? "scaleX(-1)" : undefined }}
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2" strokeDasharray="4 4">
        <path d="M28,34 H78 V70 H128" />
        <path d="M78,34 H128 V18" />
        <path d="M78,70 V104 H40" />
      </g>
      <g fill="currentColor">
        <circle cx="28" cy="34" r="5.5" />
        <rect x="66" y="24" width="24" height="20" rx="6" />
        <rect x="116" y="60" width="24" height="20" rx="6" />
        <circle cx="128" cy="18" r="4.5" />
        <circle cx="40" cy="104" r="4.5" />
      </g>
    </svg>
  );
}

/* ------------------------- Ten quiet jobs ------------------------ */
function QuietJobs() {
  const { t } = useApp();
  const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
  return (
    <section className="bg-mist py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <Eyebrow>{t("quiet.eyebrow")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-4xl font-bold tracking-tight deva sm:text-5xl">
            {t("quiet.titleA")} <span className="serif-italic font-normal text-muted">{t("quiet.titleB")}</span>
          </h2>
          <p className="mt-4 text-lg text-muted deva">{t("quiet.sub")}</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roman.map((r, i) => (
            <Reveal key={i} delay={(i % 4) * 0.06}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-paper p-5 transition-all hover:-translate-y-1 hover:shadow-float"
                   style={{ backgroundImage: "radial-gradient(#E6E1D6 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
                <NodeDecor flip={i % 2 === 1} />
                <div className="relative">
                  <div className="serif-italic text-2xl" style={{ color: "#2D6BFF" }}>{r}</div>
                  <h3 className="display mt-2 text-lg font-bold deva">{t(`quiet.${i + 1}.t`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted deva">{t(`quiet.${i + 1}.d`)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <a href="#agents" className="btn-primary text-[15px]">
            {t("quiet.cta")} <ArrowUpRight className="h-4 w-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------ Trusted references ----------------------- */
function Trusted() {
  const { t } = useApp();
  const items = ["1930 Cyber Helpline", "Ayushman Bharat", "PM-KISAN", "Jan Aushadhi", "myScheme", "DigiLocker"];
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-faint deva">{t("trusted")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map((i) => (
          <span key={i} className="display text-base font-semibold text-graphite/55">{i}</span>
        ))}
      </div>
    </section>
  );
}

/* ----------------------- Orchestrator intro ----------------------- */
function OrchestratorIntro() {
  const { t } = useApp();
  const open = () => window.dispatchEvent(new Event("saarthi:orchestrator"));
  const fan = ["khanan", "haq", "setu", "samajh", "sehat", "samay"]
    .map((k) => featureByKey(k as FeatureKey))
    .filter(Boolean) as FeatureMeta[];
  const steps = [
    { n: "01", t: t("orch.s1.t"), d: t("orch.s1.d") },
    { n: "02", t: t("orch.s2.t"), d: t("orch.s2.d") },
    { n: "03", t: t("orch.s3.t"), d: t("orch.s3.d") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <span id="orchestrator" className="block scroll-mt-28" />
      <Reveal className="max-w-2xl">
        <Eyebrow>{t("orch.eyebrow")}</Eyebrow>
        <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("orch.title")}</h2>
        <p className="mt-4 text-lg text-muted deva">{t("orch.sub")}</p>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* left: orchestration visual */}
        <Reveal>
          <div className="card p-6 sm:p-8">
            {/* the ask */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-mist/60 px-4 py-3">
              <MessageSquare className="mt-0.5 h-4 w-4 flex-none text-[#2D6BFF]" />
              <p className="text-sm leading-relaxed text-graphite deva">“{t("orch.ask")}”</p>
            </div>

            <div className="flex justify-center py-1"><span className="h-5 w-px bg-line" /></div>

            {/* Smriti hub */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#2D6BFF]/25 bg-[#2D6BFF]/5 px-4 py-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-ink text-white"><BrandMark className="h-6 w-6" /></span>
              <div className="min-w-0">
                <div className="display text-[15px] font-bold deva">{t("orch.hub")}</div>
                <div className="text-xs text-muted deva">{t("orch.hubSub")}</div>
              </div>
            </div>

            <div className="flex justify-center py-1"><span className="h-5 w-px bg-line" /></div>

            {/* fan-out to specialists */}
            <div className="flex flex-wrap gap-2">
              {fan.map((f, i) => (
                <span key={f.key} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-1 pr-2.5">
                  <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-6 w-6 flex-none" />
                  <span className="whitespace-nowrap text-xs font-semibold text-ink deva">{t(f.nameKey)}</span>
                  {i < fan.length - 1 && <span className="ml-0.5 text-faint">·</span>}
                </span>
              ))}
            </div>

            <div className="flex justify-center py-1"><span className="h-5 w-px bg-line" /></div>

            {/* delivered */}
            <div className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-linen">
              <CheckCircle2 className="h-4 w-4 flex-none text-verdant" />
              <span className="text-sm font-medium deva">{t("orch.delivers")}</span>
            </div>
          </div>
        </Reveal>

        {/* right: how it coordinates + CTA */}
        <Reveal delay={0.08}>
          <div className="space-y-5">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="display text-2xl font-bold text-[#2D6BFF]/35">{s.n}</span>
                <div>
                  <h3 className="display text-lg font-bold deva">{s.t}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted deva">{s.d}</p>
                </div>
              </div>
            ))}
            <button onClick={open} className="btn-primary text-[15px]">{t("orch.cta")} <ArrowUpRight className="h-4 w-4" /></button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------- AI Workforce (B2B) ----------------------- */
function WorkforceIntro() {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const open = (detail: { id?: string; custom?: boolean } = {}) => window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail }));
  const steps = [
    { n: "01", icon: Users, t: t("wfl.s1t"), d: t("wfl.s1d") },
    { n: "02", icon: Zap, t: t("wfl.s2t"), d: t("wfl.s2d") },
    { n: "03", icon: KeyRound, t: t("wfl.s3t"), d: t("wfl.s3d") },
  ];
  return (
    <section className="relative overflow-hidden border-y border-line bg-mist/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-wider text-graphite">
            <Building2 className="h-3.5 w-3.5" /> {t("wfl.eyebrow")}
          </span>
          <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight text-ink deva sm:text-5xl">{t("wfl.title")}</h2>
          <p className="mt-4 text-lg text-muted deva">{t("wfl.sub")}</p>
        </Reveal>

        {/* the hireable AI employees — clean, elegant pills */}
        <Reveal className="mt-10">
          <div className="flex flex-wrap gap-2.5">
            {employees.map((e) => (
              <button key={e.id} onClick={() => open({ id: e.id })}
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-graphite deva transition-all duration-300 hover:border-ink/25 hover:bg-ink hover:text-white hover:shadow-soft">
                <span className="h-1.5 w-1.5 flex-none rounded-full transition-transform duration-300 group-hover:scale-125" style={{ background: e.accent }} />
                {e.short}
              </button>
            ))}
            <button onClick={() => open({ custom: true })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-line px-4 py-2 text-sm font-medium text-muted deva transition-all duration-300 hover:border-ink/25 hover:text-graphite">
              + {t("wfl.custom")}
            </button>
          </div>
        </Reveal>

        {/* how it works + CTA */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-line bg-paper"><s.icon className="h-5 w-5 text-ink" /></span>
              <div>
                <h3 className="display text-base font-bold text-ink deva">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted deva">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => open()} className="btn-primary mt-8 text-[15px]">
          {t("wfl.cta")} <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

/* ---------------------- Big agent photo cards ---------------------- */
function AgentsGrid({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const hire = (id: string) => window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: { id } }));
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <span id="agents" className="block scroll-mt-28" />
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <Eyebrow>{t("agents.eyebrow")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("agents.title")}</h2>
        </div>
        <p className="max-w-sm text-[15px] text-muted deva">{t("agents.sub")}</p>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VISIBLE_FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.key} delay={(i % 4) * 0.06}>
              <button
                onClick={() => onOpen(f.key)}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[1.5rem] border border-line text-left shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float"
              >
                <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent}
                  rounded="rounded-none" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
                {/* scrim */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                {/* tag chip */}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm" style={{ color: f.accentDark }}>
                  <Icon className="h-3.5 w-3.5" /> {t(f.tagKey)}
                </span>
                {/* name + arrow */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                  <div>
                    <div className="display text-xl font-bold text-linen deva">{t(f.nameKey)}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-linen/75 deva">{t(f.personaKey)}</div>
                  </div>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-linen text-[#16140F] transition-transform group-hover:rotate-45">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            </Reveal>
          );
        })}
      </div>

      {/* MSME AI Workforce — profile cards for the hireable sector agents */}
      <Reveal className="mt-16 max-w-xl">
        <Eyebrow>{t("agents.wfEyebrow")}</Eyebrow>
        <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("agents.wfTitle")}</h2>
        <p className="mt-3 text-[15px] text-muted deva">{t("agents.wfSub")}</p>
      </Reveal>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {employees.map((e, i) => {
          const Icon = roleIcon(e.icon);
          return (
            <Reveal key={e.id} delay={(i % 4) * 0.06}>
              <button
                onClick={() => hire(e.id)}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[1.5rem] border border-line text-left shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float"
              >
                <AgentAvatar photo={e.photo} name={e.name} tint={e.accent} accent={e.accent}
                  rounded="rounded-none" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm" style={{ color: e.accent }}>
                  <Icon className="h-3.5 w-3.5" /> {e.short}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                  <div>
                    <div className="display text-xl font-bold text-linen deva">{e.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-linen/75 deva">{e.tagline}</div>
                  </div>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-linen text-[#16140F] transition-transform group-hover:rotate-45">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------- Team panel with tabs ---------------------- */
function TeamPanel({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const hire = (id: string) => window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: { id } }));
  const tabs = [
    { id: "all", label: t("team.tabAll"), match: (_: FeatureMeta) => true },
    { id: "workforce", label: t("team.tabWorkforce"), match: (_: FeatureMeta) => false },
    { id: "save", label: t("team.tabSave"), match: (f: FeatureMeta) => f.group === "claim" },
    { id: "automate", label: t("team.tabAutomate"), match: (f: FeatureMeta) => f.group === "automate" },
  ];
  const [tab, setTab] = useState(tabs[0]);
  const members = VISIBLE_FEATURES.filter(tab.match);
  const showEmployees = tab.id === "all" || tab.id === "workforce";

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <span id="team" className="block scroll-mt-28" />
      <div className="overflow-hidden rounded-[2rem] border border-line bg-paper p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* left: tabs + member cards */}
          <div>
            <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1">
              {tabs.map((tb) => {
                const on = tab.id === tb.id;
                return (
                  <button key={tb.id} onClick={() => setTab(tb)}
                    className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${on ? "text-linen" : "text-graphite hover:bg-mist hover:text-ink"}`}>
                    {on && <motion.span layoutId="teamTab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="relative z-10">{tb.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="grid gap-2.5 sm:grid-cols-2"
                >
                  {members.map((f, i) => (
                    <motion.div key={f.key}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      whileHover={{ y: -3 }}
                      className="group flex items-center gap-2.5 rounded-2xl border border-line bg-paper p-2.5 transition-shadow hover:border-faint hover:shadow-float">
                      <button onClick={() => onOpen(f.key)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-9 w-9 flex-none transition-transform group-hover:scale-105" />
                        <div className="min-w-0 flex-1">
                          <div className="display text-[15px] font-bold deva">{t(f.nameKey)}</div>
                          <div className="text-[11px] text-muted deva">{t(f.tagKey)} · {t("team.region")}</div>
                        </div>
                      </button>
                      <button onClick={() => hireAsEmployee(f.key)} title={t("team.hireHint")}
                        className="flex-none whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-linen transition hover:-translate-y-0.5">
                        {t("team.hire")}
                      </button>
                      <button onClick={() => onOpen(f.key)} title={t("team.open")} className="arrow-btn flex-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><ArrowUpRight className="h-4 w-4" /></button>
                    </motion.div>
                  ))}
                  {showEmployees && employees.map((e, i) => (
                    <motion.div key={e.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (members.length + i) * 0.03, duration: 0.25 }}
                      whileHover={{ y: -3 }}
                      className="group flex items-center gap-2.5 rounded-2xl border border-line bg-paper p-2.5 transition-shadow hover:border-faint hover:shadow-float">
                      <button onClick={() => hire(e.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <AgentAvatar photo={e.photo} name={e.name} tint={e.accent} accent={e.accent} rounded="rounded-full" className="h-9 w-9 flex-none transition-transform group-hover:scale-105" />
                        <div className="min-w-0 flex-1">
                          <div className="display text-[15px] font-bold deva">{e.name}</div>
                          <div className="text-[11px] text-muted deva">{e.short} · {t("team.aiEmployee")}</div>
                        </div>
                      </button>
                      <button onClick={() => hire(e.id)} title={t("wfl.hireOne")}
                        className="flex-none whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-linen transition hover:-translate-y-0.5">
                        {t("team.hire")}
                      </button>
                      <button onClick={() => hire(e.id)} className="arrow-btn flex-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><ArrowUpRight className="h-4 w-4" /></button>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* right: text block */}
          <div className="flex flex-col justify-center">
            <Eyebrow>{t("team.eyebrow")}</Eyebrow>
            <h3 className="display mt-4 text-balance text-2xl font-bold leading-tight deva sm:text-3xl">{t("team.title")}</h3>
            <p className="mt-3 leading-relaxed text-muted deva">{t("team.body")}</p>
            <a href="#agents" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold link-underline w-fit">
              {t("team.cta")} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- How it works -------------------------- */
// small workflow-node style mockups, one per step
function HowVisual({ i }: { i: number }) {
  const { t } = useApp();
  const node = "flex items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-2 shadow-soft";
  const sq = "flex h-6 w-6 flex-none items-center justify-center rounded-lg text-white";

  if (i === 0) {
    // capture: text / photo / voice feeding an input bar
    const caps = [
      { Icon: MessageSquare, c: "#2D6BFF" },
      { Icon: Camera, c: "#138A72" },
      { Icon: Mic, c: "#C0453B" },
    ];
    return (
      <div className="flex h-32 flex-col justify-center gap-2 rounded-2xl border border-line bg-mist/50 p-3">
        <div className="flex gap-2">
          {caps.map(({ Icon, c }, k) => (
            <div key={k} className="flex flex-1 items-center justify-center rounded-xl border border-line bg-paper py-2 shadow-soft">
              <Icon className="h-4 w-4" style={{ color: c }} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 shadow-soft">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2D6BFF]" />
          <span className="text-[11px] text-faint">Paste · snap · speak…</span>
        </div>
      </div>
    );
  }

  if (i === 1) {
    // routing: a hub fanning out to specialist agent nodes
    const picks = ["haq", "setu", "udyam"].map((k) => featureByKey(k as FeatureKey));
    return (
      <div className="relative flex h-32 items-center gap-3 rounded-2xl border border-line bg-mist/50 p-3">
        <div className="flex flex-none flex-col items-center gap-1">
          <BrandMark className="h-9 w-9" />
          <span className="text-[10px] font-semibold text-faint">Saarthi</span>
        </div>
        <svg className="h-16 w-7 flex-none text-line" viewBox="0 0 28 64" fill="none">
          <path d="M2 32 H14 V12 H26" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M2 32 H26" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M2 32 H14 V52 H26" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {picks.map((f) => (
            <div key={f.key} className={node}>
              <span className={sq} style={{ background: f.accent }}>
                <f.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-[11px] font-semibold text-ink deva">{t(f.nameKey)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (i === 2) {
    // verified math: reasoning trace resolving to an exact figure
    return (
      <div className="flex h-32 flex-col justify-center gap-2 rounded-2xl border border-line bg-mist/50 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 shadow-soft">
          <span className="flex-none text-[#2D6BFF]"><BrandMark className="h-4 w-4" /></span>
          <span className="text-[11px] text-graphite">Gemini reasoning…</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-3 py-2 shadow-soft">
          <span className="text-[11px] text-faint">Tax payable (new regime)</span>
          <span className="display text-sm font-bold text-ink">₹74,200</span>
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#138A72]" />
          <span className="text-[10px] font-medium text-[#138A72]">Verified by engine</span>
        </div>
      </div>
    );
  }

  // i === 3 — dashboard tiles
  return (
    <div className="flex h-32 flex-col gap-2 rounded-2xl border border-line bg-mist/50 p-3">
      <div className="grid flex-1 grid-cols-3 gap-2">
        {["#2D6BFF", "#138A72", "#A06A1F"].map((c, k) => (
          <div key={k} className="flex flex-col justify-between rounded-xl border border-line bg-paper p-2 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            <span className="h-1.5 w-3/4 rounded-full bg-line" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ink px-3 py-2">
        <span className="text-[11px] font-semibold text-linen">Next step</span>
        <ArrowRight className="h-3.5 w-3.5 text-linen" />
      </div>
    </div>
  );
}

function How() {
  const { t } = useApp();
  const steps = [
    { t: t("how.s1.t"), d: t("how.s1.d") },
    { t: t("how.s2.t"), d: t("how.s2.d") },
    { t: t("how.s3.t"), d: t("how.s3.d") },
    { t: t("how.s4.t"), d: t("how.s4.d") },
  ];
  return (
    <section className="bg-panel py-20">
      <div className="mx-auto max-w-6xl px-5">
        <span id="how" className="block scroll-mt-28" />
        <Reveal className="max-w-2xl">
          <Eyebrow>{t("nav.how")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("how.title")}</h2>
          <p className="mt-3 text-lg text-muted deva">{t("how.sub")}</p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="card flex h-full flex-col p-5">
                <HowVisual i={i} />
                <span className="display mt-5 text-4xl font-bold text-[#2D6BFF]/35">0{i + 1}</span>
                <h3 className="display mt-2 text-xl font-bold deva">{s.t}</h3>
                <p className="mt-2 leading-relaxed text-muted deva">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Closing ----------------------------- */
function Closing() {
  const { t } = useApp();
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-7 py-16 text-center text-linen sm:px-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-clay-500/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-clay-500/15 blur-3xl" />
          <div className="relative">
            <h2 className="display mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight deva sm:text-5xl">{t("cta.title")}</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-linen/60 deva">{t("cta.sub")}</p>
            <button onClick={() => window.dispatchEvent(new Event("saarthi:orchestrator"))} className="btn mx-auto mt-8 bg-linen px-6 py-3.5 text-[15px] text-[#16140F] hover:-translate-y-0.5">
              {t("cta.btn")} <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="display text-base font-bold text-[#2D6BFF]">{title}</div>
      <div className="mt-4 flex flex-col items-start gap-3 text-[17px]">{children}</div>
    </div>
  );
}

function Footer({ onOpen }: { onOpen: (k?: FeatureKey) => void }) {
  const { t } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setEmployees); }, []);
  const hire = (id: string) => window.dispatchEvent(new CustomEvent("saarthi:workforce", { detail: { id } }));
  const link = "text-left text-linen/55 transition-colors hover:text-linen deva";
  return (
    <footer id="site-footer" className="relative overflow-hidden bg-ink text-linen">
      {/* giant watermark */}
      <div className="pointer-events-none absolute -top-6 left-1/2 w-full -translate-x-1/2 select-none overflow-hidden">
        <div className="display whitespace-nowrap text-center font-bold leading-none text-white/[0.035]" style={{ fontSize: "24vw" }}>
          Saarthi
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        {/* headline */}
        <div className="pb-16 pt-24 sm:pt-32">
          <h2 className="display max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight deva sm:text-6xl">
            {t("footer.headline")}
          </h2>
        </div>

        <div className="h-px w-full bg-white/10" />

        {/* link columns */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.15fr_0.85fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-9 w-9" />
              <span className="display text-xl font-bold">Saarthi</span>
            </div>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-linen/45 deva">{t("footer.tagline")}</p>
          </div>

          <div>
            <div className="display text-base font-bold text-[#2D6BFF]">{t("footer.agents")}</div>
            <div className="mt-1 text-[15px] font-medium text-[#2D6BFF] deva">{t("footer.agentsTag")}</div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[17px]">
              {[...VISIBLE_FEATURES].sort((a, b) => t(a.nameKey).length - t(b.nameKey).length).map((f) => (
                <button key={f.key} onClick={() => onOpen(f.key)} className={link}>
                  {t(f.nameKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="display text-base font-bold text-[#2D6BFF]">{t("nav.workforce")}</div>
            <div className="mt-1 text-[15px] font-medium text-[#2D6BFF] deva">{t("agents.wfEyebrow")}</div>
            <div className="mt-4 flex flex-col gap-3 text-[17px]">
              {employees.map((e) => (
                <button key={e.id} onClick={() => hire(e.id)} className="text-left transition-colors hover:text-linen">
                  <span className="block text-linen/70 group-hover:text-linen deva">{e.name}</span>
                  <span className="block text-xs text-linen/40 deva">{e.short}</span>
                </button>
              ))}
            </div>
          </div>

          <FooterCol title={t("footer.explore")}>
            <a href="#how" className={link}>{t("nav.how")}</a>
            <a href="#agents" className={link}>{t("nav.agents")}</a>
            <a href="#team" className={link}>{t("nav.features")}</a>
            <a href="#flagship" className={link}>{t("cap.title")}</a>
            <button onClick={() => window.dispatchEvent(new Event("saarthi:helplines"))} className={link}>{t("help.title")}</button>
          </FooterCol>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-7 text-sm text-linen/40 sm:flex-row">
          <span className="deva">© 2026 Saarthi · {t("footer.rights")}</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-linen/70">Connect with the developer</span>
            <a href="https://yash-munshi.vercel.app/" target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-linen/70 transition-colors hover:border-white/40 hover:text-linen">
              <Globe className="h-4 w-4" /> Portfolio
            </a>
            <a href="https://github.com/YashIsTheBest247" target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-linen/70 transition-colors hover:border-white/40 hover:text-linen">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Landing({ onOpen }: { onOpen: (k?: FeatureKey) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <Hero onOpen={onOpen} />
      <Trusted />
      <WorkforceIntro />
      <OrchestratorIntro />
      <AgentsGrid onOpen={(k) => onOpen(k)} />
      <How />
      <FlagshipCarousel onOpen={(k) => onOpen(k)} />
      <Capabilities />
      <TeamPanel onOpen={(k) => onOpen(k)} />
      <TrulyAgentic />
      <QuietJobs />
      <Closing />
      <Footer onOpen={onOpen} />
    </motion.div>
  );
}
