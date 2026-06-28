import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, MessageCircle, ArrowRight } from "lucide-react";
import { useApp } from "../app/AppContext";
import { FEATURES, FeatureMeta } from "../lib/features";
import { FeatureKey } from "../lib/api";
import { AgentAvatar } from "./AgentAvatar";

interface CmdItem {
  id: string;
  label: string;
  sub?: string;
  kind: string;
  f?: FeatureMeta;
  run: () => void;
}

export function CommandPalette({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (k?: FeatureKey) => void }) {
  const { t } = useApp();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const goSection = (id: string) => () => {
    onClose();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else window.location.hash = id;
  };

  const items: CmdItem[] = useMemo(() => {
    const agents = FEATURES.map((f) => ({
      id: `agent-${f.key}`, label: t(f.nameKey), sub: t(f.tagKey), kind: "Agent", f,
      run: () => { onOpen(f.key); onClose(); },
    }));
    const actions: CmdItem[] = [
      { id: "chat", label: t("chat.title"), sub: t("chat.subtitle"), kind: "Action", run: () => { onClose(); window.dispatchEvent(new Event("saarthi:openchat")); } },
      { id: "how", label: t("nav.how"), kind: "Go to", run: goSection("how") },
      { id: "agents", label: t("nav.agents"), kind: "Go to", run: goSection("agents") },
      { id: "team", label: t("nav.features"), kind: "Go to", run: goSection("team") },
      { id: "caps", label: t("cap.title"), kind: "Go to", run: goSection("flagship") },
    ];
    return [...agents, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => (it.label + " " + (it.sub ?? "")).toLowerCase().includes(s));
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-[14vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-paper shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            {/* search input */}
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 flex-none text-faint" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("cmd.ph")}
                className="w-full bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-faint deva"
              />
              <span className="hidden flex-none rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-faint sm:block">Esc</span>
            </div>

            {/* results */}
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted deva">{t("cmd.empty")}</div>
              ) : (
                filtered.map((it, i) => {
                  const on = i === active;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={it.run}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${on ? "bg-mist" : "hover:bg-mist/60"}`}
                    >
                      {it.f ? (
                        <AgentAvatar photo={it.f.photo} name={it.label} tint={it.f.tint} accent={it.f.accent} rounded="rounded-lg" className="h-8 w-8 flex-none" />
                      ) : (
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-mist text-graphite">
                          {it.id === "chat" ? <MessageCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink deva">{it.label}</span>
                        {it.sub && <span className="block truncate text-xs text-faint deva">{it.sub}</span>}
                      </span>
                      <span className="flex-none rounded-md bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{it.kind}</span>
                      {on && <CornerDownLeft className="h-4 w-4 flex-none text-faint" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
