import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowUpRight, ArrowRight, Search, Menu as MenuIcon, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { LanguagePicker } from "./LanguagePicker";
import { FEATURES, FeatureMeta } from "../lib/features";
import { FeatureKey } from "../lib/api";
import { AgentAvatar } from "./AgentAvatar";

/* ------------------------------ Mega-menu ------------------------------ */
function AgentsMega({ onOpen, dark }: { onOpen: (k: FeatureKey) => void; dark: boolean }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<FeatureMeta>(FEATURES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-[15px] transition-colors ${
          dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"
        }`}
      >
        {t("nav.agents")}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 z-50 mt-5 w-[40rem] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-3xl border border-line bg-paper shadow-float"
          >
            <div className="grid grid-cols-1 sm:grid-cols-[15rem_1fr]">
              {/* left: agent list */}
              <div className="border-b border-line p-3 sm:max-h-[24rem] sm:overflow-y-auto sm:border-b-0 sm:border-r">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                  {t("nav.agents")}
                </div>
                {FEATURES.map((f) => (
                  <button
                    key={f.key}
                    onMouseEnter={() => setSel(f)}
                    onFocus={() => setSel(f)}
                    onClick={() => {
                      setOpen(false);
                      onOpen(f.key);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                      sel.key === f.key ? "bg-mist" : "hover:bg-mist/60"
                    }`}
                  >
                    <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-9 w-9 flex-none" />
                    <span className="display font-bold deva">{t(f.nameKey)}</span>
                    {f.badge && (
                      <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: f.tint, color: f.accentDark }}>
                        {f.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* right: detail */}
              <div className="p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">{t(sel.tagKey)}</div>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-graphite deva">{t(sel.descKey)}</p>

                <div className="mt-4 rounded-2xl p-4" style={{ background: sel.tint }}>
                  <div className="display text-sm font-bold" style={{ color: sel.accentDark }}>
                    Expected impact, powered by AI
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    {sel.stats.map((s, i) => (
                      <div key={i}>
                        <div className="display text-xl font-bold leading-none" style={{ color: sel.accent }}>{s.v}</div>
                        <div className="mt-1 text-[11px] leading-snug text-graphite/70">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOpen(false);
                    onOpen(sel.key);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold link-underline"
                  style={{ color: sel.accent }}
                >
                  {t("common.meet")} {t(sel.nameKey)} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------- Nav -------------------------------- */
export function Nav({ onHome, onOpen }: { onHome: () => void; onOpen: (k?: FeatureKey) => void }) {
  const { t } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dark = !scrolled && !mobile; // light text over dark hero at top

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-5">
      <div
        className={`mx-auto mt-3 grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 rounded-full border px-4 py-2.5 transition-colors duration-300 sm:mt-4 sm:px-6 md:grid-cols-[1fr_auto_1fr] ${
          scrolled || mobile
            ? "border-line bg-linen/90 shadow-pill backdrop-blur-xl"
            : "border-white/15 bg-white/10 backdrop-blur-md"
        }`}
      >
        {/* logo */}
        <button onClick={onHome} className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${dark ? "bg-white text-ink" : "bg-ink text-clay-300"}`}>
            <span className="display text-base font-bold">स</span>
          </span>
          <span className={`display text-xl font-bold tracking-tight ${dark ? "text-white" : "text-ink"}`}>Saarthi</span>
        </button>

        {/* center nav */}
        <nav className="hidden items-center gap-8 justify-self-center md:flex">
          <AgentsMega onOpen={(k) => onOpen(k)} dark={dark} />
          <a href="#how" className={`text-[15px] transition-colors ${dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"}`}>{t("nav.how")}</a>
          <a href="#team" className={`text-[15px] transition-colors ${dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"}`}>{t("nav.features")}</a>
        </nav>

        {/* right cluster */}
        <div className="flex items-center gap-2 justify-self-end">
          <a
            href="#agents"
            aria-label="Find help"
            className={`hidden h-10 w-10 items-center justify-center rounded-full border transition-colors sm:flex ${
              dark ? "border-white/25 text-white hover:bg-white/10" : "border-line bg-paper text-graphite hover:text-ink"
            }`}
          >
            <Search className="h-4 w-4" />
          </a>
          <div className="hidden sm:block">
            <LanguagePicker compact />
          </div>
          <a
            href="#agents"
            className={`btn px-4 py-2.5 text-sm ${dark ? "bg-white text-ink hover:-translate-y-0.5 shadow-soft" : "bg-ink text-linen hover:bg-graphite hover:-translate-y-0.5 shadow-soft"}`}
          >
            {t("nav.try")}
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => setMobile((m) => !m)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border md:hidden ${dark ? "border-white/25 text-white" : "border-line bg-paper text-ink"}`}
            aria-label="Menu"
          >
            {mobile ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl border border-line bg-linen shadow-float md:hidden"
          >
            <div className="space-y-1 p-3">
              {FEATURES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setMobile(false);
                    onOpen(f.key);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-mist"
                >
                  <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-9 w-9 flex-none" />
                  <span className="display font-bold deva">{t(f.nameKey)}</span>
                  <span className="text-xs text-faint">{t(f.tagKey)}</span>
                </button>
              ))}
              <div className="px-1 pt-2">
                <LanguagePicker />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
