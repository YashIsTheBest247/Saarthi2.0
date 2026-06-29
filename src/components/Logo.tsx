import type { LucideIcon } from "lucide-react";

/**
 * Saarthi brand mark — a sophisticated line-only orbital glyph: two interlocking
 * elliptical orbits crossing through a shared core. Uses `currentColor`, so it
 * inherits the surrounding text colour (black on light, white over dark).
 */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" role="img" aria-label="Saarthi">
      <g transform="translate(24 24)" stroke="currentColor" strokeWidth="2.2">
        <ellipse rx="19" ry="7.6" transform="rotate(35)" />
        <ellipse rx="19" ry="7.6" transform="rotate(-35)" />
        <ellipse rx="19" ry="7.6" transform="rotate(90)" strokeOpacity="0.38" />
      </g>
      <circle cx="24" cy="24" r="2.6" fill="currentColor" />
    </svg>
  );
}

/** The brand mark typed so it can be used wherever a lucide icon is expected. */
export const LogoIcon = BrandMark as unknown as LucideIcon;
