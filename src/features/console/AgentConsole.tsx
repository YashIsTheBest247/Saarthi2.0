import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, LucideIcon } from "lucide-react";
import { useApp } from "../../app/AppContext";
import { featureByKey } from "../../lib/features";
import { LanguagePicker } from "../../components/LanguagePicker";
import { StatusBadge } from "../../components/ui";
import { AgentAvatar } from "../../components/AgentAvatar";
import { FeatureKey } from "../../lib/api";
import { hireAsEmployee } from "../../lib/hire";

export interface ConsoleModule {
  id: string;
  label: string;
  icon: LucideIcon;
  render: (go: (id: string) => void) => ReactNode;
}

export function AgentConsole({
  agentKey,
  platform,
  badge: Badge,
  modules,
  onBack,
}: {
  agentKey: FeatureKey;
  platform: string;
  badge: LucideIcon;
  modules: ConsoleModule[];
  onBack: () => void;
}) {
  const { t, health } = useApp();
  const meta = featureByKey(agentKey);
  const [active, setActive] = useState(modules[0].id);
  const cur = modules.find((m) => m.id === active) || modules[0];
  const accent = meta.accent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl px-5 pb-24 pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost px-4 py-2 text-sm"><ArrowLeft className="h-4 w-4" />{t("common.back")}</button>
        <div className="flex items-center gap-2">
          <button onClick={() => hireAsEmployee(agentKey)} title={t("team.hireHint")}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-linen transition hover:-translate-y-0.5">
            <Zap className="h-4 w-4" /> {t("team.hire")}
          </button>
          <LanguagePicker compact />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div className="relative flex-none">
          <AgentAvatar photo={meta.photo} name={t(meta.nameKey)} tint={meta.tint} accent={meta.accent} rounded="rounded-2xl" className="h-16 w-16" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg text-white ring-2 ring-white" style={{ background: accent }}>
            <Badge className="h-3.5 w-3.5" />
          </span>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="display text-3xl font-bold deva">{t(meta.nameKey)}</h1>
            <span className="text-base font-medium" style={{ color: accent }}>{platform}</span>
          </div>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted deva">{t(meta.personaKey)}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const on = active === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActive(mod.id)}
                className={`flex flex-none items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${on ? "text-white" : "border border-line bg-paper text-graphite hover:bg-mist lg:border-transparent lg:bg-transparent"}`}
                style={on ? { background: accent } : undefined}
              >
                <Icon className="h-4 w-4 flex-none" /><span className="whitespace-nowrap">{mod.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {cur.render(setActive)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
