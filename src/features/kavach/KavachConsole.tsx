import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, LayoutDashboard, ShieldAlert, Workflow, Waves, Network,
  Banknote, MapPin, BarChart3, Newspaper, Radio, Siren,
} from "lucide-react";
import { useApp } from "../../app/AppContext";
import { featureByKey } from "../../lib/features";
import { LanguagePicker } from "../../components/LanguagePicker";
import { StatusBadge } from "../../components/ui";
import { AgentAvatar } from "../../components/AgentAvatar";
import { Emergency } from "../Emergency";
import {
  Dashboard, Detector, ThreatFusion, VoiceSpoof, FraudGraph, Counterfeit, GeoMap, MetricsView, NewsWatch,
} from "./KavachModules";

const ACCENT = "#2D6BFF";

const MODULES = [
  { id: "dashboard", label: "kv.nav.dashboard", icon: LayoutDashboard },
  { id: "detector", label: "kv.nav.detector", icon: ShieldAlert },
  { id: "fusion", label: "kv.nav.fusion", icon: Workflow },
  { id: "voice", label: "kv.nav.voice", icon: Waves },
  { id: "graph", label: "kv.nav.graph", icon: Network },
  { id: "counterfeit", label: "kv.nav.counterfeit", icon: Banknote },
  { id: "map", label: "kv.nav.map", icon: MapPin },
  { id: "metrics", label: "kv.nav.metrics", icon: BarChart3 },
  { id: "news", label: "kv.nav.news", icon: Newspaper },
  { id: "sos", label: "kv.nav.sos", icon: Siren },
];

function Ticker() {
  const { t } = useApp();
  const [titles, setTitles] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    fetch("/api/news").then((r) => r.json()).then((j) => {
      setTitles((j.items || []).map((i: any) => i.title));
      setLive(Boolean(j.live));
    }).catch(() => {});
  }, []);
  if (!titles.length) return null;
  const row = [...titles, ...titles];
  return (
    <div className="mt-4 flex items-center gap-3 overflow-hidden rounded-full border border-line bg-mist py-2 pl-3">
      <span className="flex flex-none items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
        <Radio className="h-3 w-3" style={{ color: "#9FBCFF" }} /> {live ? t("kv.live") : t("kv.watch")}
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker gap-8 whitespace-nowrap pr-8">
          {row.map((t, i) => (
            <span key={i} className="text-sm text-graphite">• {t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KavachConsole({ onBack }: { onBack: () => void }) {
  const { t, health } = useApp();
  const meta = featureByKey("kavach");
  const [active, setActive] = useState("dashboard");

  const render = () => {
    switch (active) {
      case "detector": return <Detector />;
      case "fusion": return <ThreatFusion />;
      case "voice": return <VoiceSpoof />;
      case "graph": return <FraudGraph />;
      case "counterfeit": return <Counterfeit />;
      case "map": return <GeoMap />;
      case "metrics": return <MetricsView />;
      case "news": return <NewsWatch />;
      case "sos": return <Emergency agentKey="kavach" />;
      default: return <Dashboard go={setActive} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl px-5 pb-24 pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" />{t("common.back")}</button>
        <div className="flex items-center gap-2">
          <LanguagePicker compact />
        </div>
      </div>

      {/* platform header */}
      <div className="mt-6 flex items-start gap-4">
        <div className="relative flex-none">
          <AgentAvatar photo={meta.photo} name={t(meta.nameKey)} tint={meta.tint} accent={meta.accent} rounded="rounded-2xl" className="h-16 w-16" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg text-white ring-2 ring-white" style={{ background: ACCENT }}>
            <ShieldAlert className="h-3.5 w-3.5" />
          </span>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="display text-3xl font-bold deva">{t("k.name")}</h1>
            <span className="text-base font-medium deva" style={{ color: ACCENT }}>{t("kv.platform")}</span>
          </div>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted deva">{t("kv.tagline")}</p>
        </div>
      </div>

      <Ticker />

      {/* module nav + content */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const on = active === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActive(mod.id)}
                className={`flex flex-none items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${on ? "text-white" : "border border-line bg-paper text-graphite hover:bg-mist lg:border-transparent lg:bg-transparent"}`}
                style={on ? { background: ACCENT } : undefined}
              >
                <Icon className="h-4 w-4 flex-none" />
                <span className="whitespace-nowrap deva">{t(mod.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              {render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
