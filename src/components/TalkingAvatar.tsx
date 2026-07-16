import { useEffect, useRef } from "react";
import { avatarState } from "../lib/avatarState";

/* ─────────────────────────────────────────────────────────────────────────────
 * TalkingAvatar — a realistic talking head from a single portrait, in plain DOM.
 * Two stacked copies of the photo: the base, and a "jaw" copy clipped to the
 * lower face. A requestAnimationFrame loop drives the jaw open value from
 *   • word boundaries in the actual speech (avatarState.level spikes per word), +
 *   • organic layered-sine motion,
 * so the mouth opens in a natural, speech-synced way (not a mechanical loop),
 * with a soft dark interior that fades in as it opens. Free, works everywhere.
 * ────────────────────────────────────────────────────────────────────────────*/
export function TalkingAvatar({
  src, speaking, className, mouthTop = 47,
}: {
  src: string; speaking: boolean; className?: string; mouthTop?: number;
}) {
  const jawRef = useRef<HTMLImageElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const spk = speakingRef.current || avatarState.speaking;
      avatarState.level *= 0.84; // decay the per-word spikes
      const now = performance.now() / 1000;
      // organic base motion — three detuned sines so it never looks periodic
      const base = spk
        ? Math.abs(Math.sin(now * 8.5)) * 0.5 + Math.abs(Math.sin(now * 5.3 + 1)) * 0.3 + Math.abs(Math.sin(now * 11.7 + 2)) * 0.2
        : 0;
      const target = spk ? Math.min(1, base * 0.7 + avatarState.level * 0.55) : 0;
      smooth += (target - smooth) * 0.35; // ease toward target
      if (smooth < 0.001) smooth = 0;

      const jaw = jawRef.current, dark = darkRef.current;
      if (jaw) jaw.style.transform = `translateY(${(smooth * 1.25).toFixed(3)}%)`;
      if (dark) dark.style.opacity = Math.min(1, smooth * 1.6).toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`avatar-float relative overflow-hidden ${className || ""}`}>
      {/* base face */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />

      {/* dark mouth interior — opacity driven by the open amount */}
      <div
        ref={darkRef}
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: `${mouthTop - 0.5}%`,
          width: "15%",
          height: "4.2%",
          opacity: 0,
          background: "radial-gradient(ellipse at center, rgba(34,8,10,0.96) 45%, rgba(85,28,30,0.5) 80%, transparent)",
        }}
      />

      {/* jaw = lower face; JS translates it down/up in sync with speech */}
      <img
        ref={jawRef}
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
        style={{ clipPath: `inset(${mouthTop}% 0 0 0)`, willChange: "transform" }}
      />
    </div>
  );
}
