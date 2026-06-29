import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, X, Copy, Check, Trash2, Download } from "lucide-react";
import { useLocal } from "../features/console/kit";

/**
 * A always-available scratchpad. Jot or paste anything (agent answers, drafts,
 * numbers) and copy it back out — saved per-device in localStorage.
 */
export function Notepad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useLocal<string>("saarthi.notepad", "");
  const [copied, setCopied] = useState(false);

  const copy = () => { try { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const download = () => {
    const b = new Blob([text], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href = u; a.download = "saarthi-notes.txt"; a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 left-4 z-[70] flex h-[26rem] max-h-[72vh] w-[92vw] max-w-[22rem] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-float sm:left-6"
          >
            <div className="flex items-center gap-2 border-b border-line bg-ink px-4 py-3 text-white">
              <StickyNote className="h-4 w-4" />
              <div className="text-sm font-bold">Notepad</div>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={copy} title="Copy all" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
                <button onClick={download} title="Download .txt" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><Download className="h-4 w-4" /></button>
                <button onClick={() => setText("")} title="Clear" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Jot or paste anything here — agent answers, drafts, numbers… It stays saved on this device."
              className="flex-1 resize-none bg-paper p-4 text-sm leading-relaxed text-ink outline-none deva"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notepad"
        className="fixed bottom-5 left-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-float transition-transform hover:-translate-y-0.5 sm:left-6"
      >
        {open ? <X className="h-6 w-6" /> : <StickyNote className="h-6 w-6" />}
      </button>
    </>
  );
}
