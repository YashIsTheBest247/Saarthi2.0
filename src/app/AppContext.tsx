import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { DEFAULT_LANGUAGE, Language } from "../lib/languages";
import { makeT, TFn } from "../lib/i18n";
import { getHealth, Health } from "../lib/api";

type Theme = "light" | "dark";

interface AppCtx {
  lang: Language;
  setLang: (l: Language) => void;
  t: TFn;
  health: Health;
  theme: Theme;
  toggleTheme: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("saarthi.theme");
    if (saved === "dark" || saved === "light") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch { /* ignore */ }
  return "light";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(DEFAULT_LANGUAGE);
  const [health, setHealth] = useState<Health>({ ok: true, live: false, model: "…" });
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  // reflect the theme on <html> and persist the choice
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("saarthi.theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));

  const t = useMemo(() => makeT(lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, health, theme, toggleTheme }), [lang, t, health, theme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
