import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Mic,
  Languages as LangIcon,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES, FeatureMeta, featureByKey } from "../lib/features";
import { FeatureKey } from "../lib/api";
import { Reveal, Eyebrow } from "./ui";
import { AgentAvatar } from "./AgentAvatar";

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

/* ------------------------------ Hero ------------------------------ */
function Hero(_: { onOpen: (k?: FeatureKey) => void }) {
  const { t } = useApp();
  return (
    <section className="relative isolate overflow-hidden bg-[#15110D] text-white">
      {/* background portrait */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[58%]">
        <img src="/agents/hero.jpg" alt="" className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#15110D] via-[#15110D]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110D] via-[#15110D]/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <motion.h1
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
          className="display max-w-2xl text-[2.7rem] font-bold leading-[0.98] tracking-tight sm:text-[4.6rem]"
        >
          <span className="deva">{t("hero.titleA")}</span>
          <br />
          <span>{t("hero.titleB")} </span>
          <span className="serif-italic font-normal text-white/55 deva">{t("hero.titleC")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
          className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/65 deva sm:text-lg"
        >
          {t("hero.sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-7 flex flex-wrap items-center gap-3"
        >
          <a href="#agents" className="btn group bg-white px-5 py-3 text-[15px] text-ink shadow-soft hover:-translate-y-0.5">
            {t("hero.cta1")} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <a href="#how" className="btn border border-white/30 px-5 py-3 text-[15px] text-white hover:bg-white/10">
            {t("hero.cta2")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.32 }}
          className="mt-7 flex flex-wrap items-center gap-3"
        >
          <div className="flex -space-x-3">
            {FEATURES.map((f) => (
              <AgentAvatar key={f.key} photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent}
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
            <Loader2 className="h-[18px] w-[18px] flex-none animate-spin text-clay-500" />
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
                <div className="h-1.5 w-1/3 rounded-full bg-clay-500" />
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
                    style={{ height: h, background: i % 2 ? "#C2641F" : "#16140F", opacity: i % 2 ? 0.8 : 0.35 }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-mist px-3 py-2">
                <Mic className="h-3.5 w-3.5 flex-none text-clay-500" />
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
                  <div className="h-10 rounded-lg bg-clay-100" />
                  <div className="h-10 rounded-lg bg-mist" />
                </div>
                <div className="mt-3 h-1.5 w-1/2 rounded-full bg-clay-500" />
              </div>
            </div>
          )}
        </div>

        {/* title + desc */}
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-clay-600" />
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
    <section className="mx-auto max-w-6xl px-5 pt-16 pb-6 sm:pt-24">
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

/* -------------------------- Samay flagship ------------------------- */
function SamayFlagship({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const s = featureByKey("samay");
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] text-white" style={{ background: s.accent }}>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: s.accentDark }} />
          <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                <s.icon className="h-3.5 w-3.5" /> {t("flag.eyebrow")}
              </span>
              <h2 className="display mt-4 text-balance text-3xl font-bold leading-tight tracking-tight deva sm:text-4xl">
                {t("flag.title")}
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-white/70 deva">{t(s.descKey)}</p>

              <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
                {s.stats.map((st, i) => (
                  <div key={i} className="rounded-2xl bg-white/10 p-3">
                    <div className="display text-base font-bold">{st.v}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-white/60">{st.l}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => onOpen("samay")} className="btn mt-6 bg-white px-5 py-3 text-[15px] text-ink hover:-translate-y-0.5">
                {t("common.meet")} {t(s.nameKey)} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs">
              <AgentAvatar photo={s.photo} name={t(s.nameKey)} tint={s.tint} accent={s.accent} rounded="rounded-3xl" className="h-full w-full ring-1 ring-white/20" />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------- Eight quiet jobs ------------------------ */
function QuietJobs({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  const sehat = featureByKey("sehat");
  const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
  return (
    <section className="bg-mist py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <Eyebrow color={sehat.accent}>{t("quiet.eyebrow")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-4xl font-bold tracking-tight deva sm:text-5xl">
            {t("quiet.titleA")} <span className="serif-italic font-normal text-muted">{t("quiet.titleB")}</span>
          </h2>
          <p className="mt-4 text-lg text-muted deva">{t("quiet.sub")}</p>
        </Reveal>

        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {roman.map((r, i) => (
            <Reveal key={i} delay={(i % 4) * 0.06}>
              <div className="border-t border-line pt-4">
                <div className="serif-italic text-2xl" style={{ color: sehat.accent }}>{r}</div>
                <h3 className="display mt-2 text-lg font-bold deva">{t(`quiet.${i + 1}.t`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted deva">{t(`quiet.${i + 1}.d`)}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <button onClick={() => onOpen("sehat")} className="btn-primary text-[15px]">
            {t("quiet.cta")} <ArrowUpRight className="h-4 w-4" />
          </button>
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

/* ---------------------- Big agent photo cards ---------------------- */
function AgentsGrid({ onOpen }: { onOpen: (k: FeatureKey) => void }) {
  const { t } = useApp();
  return (
    <section id="agents" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <Eyebrow>{t("agents.eyebrow")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("agents.title")}</h2>
        </div>
        <p className="max-w-sm text-[15px] text-muted deva">{t("agents.sub")}</p>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.key} delay={i * 0.08}>
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
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-linen text-ink transition-transform group-hover:rotate-45">
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
  const tabs = [
    { id: "all", label: t("team.tabAll"), match: (_: FeatureMeta) => true },
    { id: "protect", label: t("team.tabProtect"), match: (f: FeatureMeta) => f.group === "protect" },
    { id: "save", label: t("team.tabSave"), match: (f: FeatureMeta) => f.group === "claim" },
    { id: "automate", label: t("team.tabAutomate"), match: (f: FeatureMeta) => f.group === "automate" },
  ];
  const [tab, setTab] = useState(tabs[0]);
  const members = FEATURES.filter(tab.match);

  return (
    <section id="team" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14">
      <div className="overflow-hidden rounded-[2rem] border border-line bg-linen p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* left: tabs + member cards */}
          <div>
            <div className="inline-flex flex-wrap gap-1.5 rounded-full border border-line bg-paper p-1">
              {tabs.map((tb) => (
                <button key={tb.id} onClick={() => setTab(tb)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-all ${tab.id === tb.id ? "bg-ink text-linen" : "text-graphite hover:text-ink"}`}>
                  {tb.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {members.map((f) => (
                <button key={f.key} onClick={() => onOpen(f.key)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft">
                  <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-12 w-12 flex-none" />
                  <div className="min-w-0 flex-1">
                    <div className="display font-bold deva">{t(f.nameKey)}</div>
                    <div className="text-xs text-muted deva">{t(f.tagKey)} · {t("team.region")}</div>
                  </div>
                  <span className="arrow-btn flex-none"><ArrowUpRight className="h-4 w-4" /></span>
                </button>
              ))}
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
function How() {
  const { t } = useApp();
  const steps = [
    { t: t("how.s1.t"), d: t("how.s1.d"), icon: MessageSquare },
    { t: t("how.s2.t"), d: t("how.s2.d"), icon: LangIcon },
    { t: t("how.s3.t"), d: t("how.s3.d"), icon: ArrowRight },
  ];
  return (
    <section id="how" className="scroll-mt-24 bg-panel py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <Eyebrow>{t("nav.how")}</Eyebrow>
          <h2 className="display mt-4 text-balance text-3xl font-bold tracking-tight deva sm:text-5xl">{t("how.title")}</h2>
          <p className="mt-3 text-lg text-muted deva">{t("how.sub")}</p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="card h-full p-7">
                <span className="display text-4xl font-bold text-clay-500/30">0{i + 1}</span>
                <h3 className="display mt-4 text-xl font-bold deva">{s.t}</h3>
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
function Closing({ onOpen }: { onOpen: () => void }) {
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
            <button onClick={onOpen} className="btn mx-auto mt-8 bg-linen px-6 py-3.5 text-[15px] text-ink hover:-translate-y-0.5">
              {t("cta.btn")} <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const { t } = useApp();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-clay-300">
            <span className="display text-sm font-bold">स</span>
          </span>
          <span className="display text-base font-bold text-ink">Saarthi</span>
          <span className="text-faint deva">· {t("brand.tag")}</span>
        </div>
        <p className="text-faint">Made for India · Powered by Gemini</p>
      </div>
    </footer>
  );
}

export function Landing({ onOpen }: { onOpen: (k?: FeatureKey) => void }) {
  return (
    <>
      <Hero onOpen={onOpen} />
      <Capabilities />
      <SamayFlagship onOpen={(k) => onOpen(k)} />
      <Trusted />
      <AgentsGrid onOpen={(k) => onOpen(k)} />
      <QuietJobs onOpen={(k) => onOpen(k)} />
      <TeamPanel onOpen={(k) => onOpen(k)} />
      <How />
      <Closing onOpen={() => onOpen()} />
      <Footer />
    </>
  );
}
