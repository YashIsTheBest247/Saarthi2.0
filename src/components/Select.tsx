import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface Opt { value: string; label: string }

/** App-themed dropdown (replaces native <select> so the OS-blue option list is gone). */
export function Select({
  value, onChange, options, className = "", ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = options.find((o) => o.value === value);
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button" aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-mist px-4 py-3 text-left text-[15px] text-ink outline-none transition-colors hover:bg-paper focus:border-[#2D6BFF]"
      >
        <span className="truncate deva">{cur?.label ?? value}</span>
        <ChevronDown className={`h-4 w-4 flex-none text-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-line bg-paper p-1 shadow-float">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] transition-colors ${on ? "bg-[#E8F0FF] text-[#1A49BD]" : "text-graphite hover:bg-mist"}`}
              >
                <span className="truncate deva">{o.label}</span>
                {on && <Check className="h-4 w-4 flex-none" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
