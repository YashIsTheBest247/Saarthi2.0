import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowUpRight, ArrowRight, Phone, Menu as MenuIcon, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { LanguagePicker } from "./LanguagePicker";
import { FEATURES, FeatureMeta } from "../lib/features";
import { FeatureKey } from "../lib/api";
import { AgentAvatar } from "./AgentAvatar";
import { BrandMark } from "./Logo";
import { HelplinesModal } from "./Helplines";

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
    <div className="relative" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
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
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-full z-50 w-[40rem] max-w-[92vw] -translate-x-1/2 pt-3"
          >
            <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-line bg-paper shadow-float sm:grid-cols-[15rem_1fr]">
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
  const [darkZone, setDarkZone] = useState(true); // over a dark section (hero / footer)
  const [mobile, setMobile] = useState(false);
  const [atFlagship, setAtFlagship] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const h = () => setHelpOpen(true);
    window.addEventListener("saarthi:helplines", h);
    return () => window.removeEventListener("saarthi:helplines", h);
  }, []);

  const toTop = () => { onHome(); window.scrollTo({ top: 0, behavior: "smooth" }); };

  useEffect(() => {
    const NAV = 72; // px from top the navbar occupies
    const onScroll = () => {
      const hero = document.getElementById("hero");
      const footer = document.getElementById("site-footer");
      const overHero = hero ? hero.getBoundingClientRect().bottom > NAV : window.scrollY < 200;
      const overFooter = footer ? footer.getBoundingClientRect().top < NAV : false;
      setDarkZone(overHero || overFooter);
      const el = document.getElementById("flagship");
      if (el) {
        const r = el.getBoundingClientRect();
        const mid = window.innerHeight / 2;
        setAtFlagship(r.top < mid && r.bottom > mid); // section straddles viewport centre
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const skipFlagship = () => {
    const el = document.getElementById("flagship");
    if (!el) return;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().bottom + 1, behavior: "smooth" });
  };

  const dark = darkZone && !mobile; // light text over dark hero / footer; solid over the white middle

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-5">
      <div
        className={`mx-auto mt-3 grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 rounded-full border px-4 py-2.5 transition-colors duration-300 sm:mt-4 sm:px-6 md:grid-cols-[1fr_auto_1fr] ${
          dark
            ? "border-white/15 bg-white/10 backdrop-blur-md"
            : "border-line bg-linen/90 shadow-pill backdrop-blur-xl"
        }`}
      >
        {/* logo */}
        <button onClick={toTop} className={`flex items-center gap-2.5 ${dark ? "text-white" : "text-ink"}`}>
          <BrandMark className="h-8 w-8" />
          <span className="display text-xl font-bold tracking-tight">Saarthi</span>
        </button>

        {/* center nav */}
        <nav className="hidden items-center gap-8 justify-self-center md:flex">
          <AgentsMega onOpen={(k) => onOpen(k)} dark={dark} />
          <button onClick={() => window.dispatchEvent(new Event("saarthi:workflows"))} className={`text-[15px] transition-colors ${dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"}`}>{t("nav.workflows")}</button>
          <a href="#how" className={`text-[15px] transition-colors ${dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"}`}>{t("nav.how")}</a>
          <a href="#team" className={`text-[15px] transition-colors ${dark ? "text-white/85 hover:text-white" : "text-graphite hover:text-ink"}`}>{t("nav.features")}</a>
        </nav>

        {/* right cluster */}
        <div className="flex items-center gap-2 justify-self-end">
          <AnimatePresence>
            {atFlagship && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85, width: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  width: "auto",
                  backgroundColor: ["#16140F", "#FFFFFF", "#16140F"],
                  color: ["#FFFFFF", "#16140F", "#FFFFFF"],
                }}
                exit={{ opacity: 0, scale: 0.85, width: 0 }}
                transition={{
                  default: { type: "spring", stiffness: 420, damping: 32 },
                  backgroundColor: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                  color: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                }}
                onClick={skipFlagship}
                className="hidden items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-line px-3.5 py-2 text-sm font-semibold shadow-soft md:flex"
              >
                {t("flag.skip")} <ChevronDown className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={() => setHelpOpen(true)}
            aria-label={t("help.title")}
            className={`hidden h-10 items-center gap-2 rounded-full border px-3.5 transition-colors md:flex ${
              dark ? "border-white/25 text-white hover:bg-white/10" : "border-line bg-paper text-graphite hover:text-ink"
            }`}
          >
            <Phone className="h-4 w-4" />
            <span className="hidden text-sm font-medium lg:inline">{t("nav.helplines")}</span>
          </button>
          <div className="hidden md:block">
            <LanguagePicker compact />
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("saarthi:orchestrator"))}
            className={`hidden md:inline-flex btn whitespace-nowrap px-4 py-2.5 text-sm ${dark ? "bg-white text-ink hover:-translate-y-0.5 shadow-soft" : "bg-ink text-linen hover:bg-graphite hover:-translate-y-0.5 shadow-soft"}`}
          >
            {t("nav.try")}
            <ArrowUpRight className="h-4 w-4 flex-none" />
          </button>
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
            className="mx-auto mt-2 max-h-[78vh] max-w-6xl overflow-y-auto rounded-3xl border border-line bg-linen shadow-float md:hidden"
          >
            <div className="space-y-1 p-3">
              {/* quick links */}
              <button onClick={() => { setMobile(false); window.dispatchEvent(new Event("saarthi:workflows")); }} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-graphite hover:bg-mist">{t("nav.workflows")}</button>
              <a href="#how" onClick={() => setMobile(false)} className="block rounded-2xl px-3 py-2.5 text-[15px] font-medium text-graphite hover:bg-mist">{t("nav.how")}</a>
              <a href="#team" onClick={() => setMobile(false)} className="block rounded-2xl px-3 py-2.5 text-[15px] font-medium text-graphite hover:bg-mist">{t("nav.features")}</a>
              <button onClick={() => { setMobile(false); setHelpOpen(true); }} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-graphite hover:bg-mist">
                <Phone className="h-4 w-4 flex-none" /> {t("nav.helplines")}
              </button>

              {/* agents */}
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">{t("nav.agents")}</div>
              {FEATURES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setMobile(false); onOpen(f.key); }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-mist"
                >
                  <AgentAvatar photo={f.photo} name={t(f.nameKey)} tint={f.tint} accent={f.accent} rounded="rounded-full" className="h-9 w-9 flex-none" />
                  <span className="display font-bold deva">{t(f.nameKey)}</span>
                  <span className="ml-auto truncate text-xs text-faint deva">{t(f.tagKey)}</span>
                </button>
              ))}

              <div className="px-1 pt-3"><LanguagePicker /></div>
              <button
                onClick={() => { setMobile(false); window.dispatchEvent(new Event("saarthi:orchestrator")); }}
                className="btn mt-2 w-full justify-center bg-ink py-3 text-sm text-linen"
              >
                {t("nav.try")} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HelplinesModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
