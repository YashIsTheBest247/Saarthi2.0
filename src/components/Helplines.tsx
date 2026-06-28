import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import { useApp } from "../app/AppContext";

interface Helpline { name: string; num: string; cat: string; tags?: string }

const HELPLINES: Helpline[] = [
  { name: "All-in-one Emergency", num: "112", cat: "Emergency" },
  { name: "Police", num: "100", cat: "Emergency" },
  { name: "Fire", num: "101", cat: "Emergency" },
  { name: "Ambulance", num: "108", cat: "Health" },
  { name: "Cyber Fraud / Cybercrime", num: "1930", cat: "Fraud", tags: "scam online upi otp digital arrest" },
  { name: "Women Helpline", num: "181", cat: "Women", tags: "domestic abuse harassment" },
  { name: "Women (Police)", num: "1091", cat: "Women" },
  { name: "Child Helpline", num: "1098", cat: "Children", tags: "kids missing abuse" },
  { name: "Senior Citizen (Elderline)", num: "14567", cat: "Seniors", tags: "elderly old age" },
  { name: "Mental Health (Tele-MANAS)", num: "14416", cat: "Health", tags: "depression stress suicide counselling" },
  { name: "Disaster Management (NDMA)", num: "1078", cat: "Disaster", tags: "flood cyclone earthquake relief" },
  { name: "National Consumer Helpline", num: "1915", cat: "Consumer", tags: "refund complaint cheated product" },
  { name: "Railway Helpline", num: "139", cat: "Travel", tags: "train ticket" },
  { name: "Road Accident Emergency", num: "1073", cat: "Travel", tags: "highway accident" },
  { name: "Poison Control", num: "1066", cat: "Health" },
  { name: "Electricity Complaint", num: "1912", cat: "Utilities", tags: "power bijli" },
  { name: "LPG Gas Leak", num: "1906", cat: "Utilities", tags: "cylinder gas" },
  { name: "Kisan Call Centre", num: "1800-180-1551", cat: "Farming", tags: "crop kisan farmer" },
  { name: "Income Tax Helpline", num: "1800-103-0025", cat: "Tax", tags: "itr refund notice" },
  { name: "EPFO (Provident Fund)", num: "14470", cat: "Money", tags: "pf pension" },
  { name: "Anti-Corruption", num: "1064", cat: "Govt", tags: "bribe vigilance" },
  { name: "Tourist Helpline", num: "1363", cat: "Travel" },
];

export function HelplinesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useApp();
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const list = !s ? HELPLINES : HELPLINES.filter((h) => `${h.name} ${h.cat} ${h.num} ${h.tags ?? ""}`.toLowerCase().includes(s));

  useEffect(() => { if (open) setQ(""); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header + search */}
            <div className="border-b border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="display text-lg font-bold deva">{t("help.title")}</h2>
                  <p className="text-xs text-muted deva">{t("help.sub")}</p>
                </div>
                <button onClick={onClose} className="rounded-full p-1.5 text-faint hover:bg-mist hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-mist px-4">
                <Search className="h-5 w-5 flex-none text-faint" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("help.ph")} className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-faint deva" />
              </div>
            </div>

            {/* list */}
            <div className="grid gap-2.5 overflow-y-auto p-4 sm:grid-cols-2">
              {list.map((h) => (
                <a key={h.num + h.name} href={`tel:${h.num.replace(/[^\d]/g, "")}`}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 transition-all hover:border-faint hover:bg-mist/40">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-mist text-ink transition-colors group-hover:bg-ink group-hover:text-white">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-graphite deva">{h.name}</div>
                    <div className="display text-lg font-bold text-ink">{h.num}</div>
                  </div>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{h.cat}</span>
                </a>
              ))}
              {list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted deva">{t("help.empty")}</p>}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-center text-xs text-faint deva">{t("help.note")}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
