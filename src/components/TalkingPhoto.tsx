import { useEffect, useRef } from "react";
import { avatarState } from "../lib/avatarState";

/* ─────────────────────────────────────────────────────────────────────────────
 * TalkingPhoto — a photorealistic portrait that "talks". While `speaking` is
 * true it animates the jaw/mouth in real time on a 2D canvas: the lower face
 * drops and a soft dark mouth-interior opens, driven by a layered-sine amplitude
 * so it looks like natural speech. Plus a gentle idle "breathing" sway so she
 * feels alive. 100% client-side, free — no 3D, no model, no paid service.
 *
 * Tuning per portrait: mouthY (where the lips sit, 0..1 of height), mouthX
 * (horizontal centre), mouthW (mouth width as a fraction of image width).
 * ────────────────────────────────────────────────────────────────────────────*/
export function TalkingPhoto({
  src, speaking, className,
  mouthY = 0.66, mouthX = 0.5, mouthW = 0.26, onError,
}: {
  src: string; speaking: boolean; className?: string;
  mouthY?: number; mouthX?: number; mouthW?: number; onError?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const openRef = useRef(0);

  // load the portrait
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      if (c) { c.width = img.naturalWidth; c.height = img.naturalHeight; }
    };
    img.onerror = () => onError?.();
    img.src = src;
    return () => { imgRef.current = null; };
  }, [src, onError]);

  // render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0, last = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const img = imgRef.current;
      const iw = canvas.width, ih = canvas.height;
      if (img && iw && ih) {
        const t = now / 1000;

        // target mouth opening (0..1) from layered sines while speaking
        const amp = Math.abs(Math.sin(t * 10)) * 0.6 + Math.abs(Math.sin(t * 6.3 + 1)) * 0.4;
        const spk = speakingRef.current || avatarState.speaking;
        const target = spk ? 0.4 + amp * 0.6 : 0;
        openRef.current += (target - openRef.current) * Math.min(1, dt * 18);
        const open = openRef.current * ih * 0.035;         // max jaw drop in px
        const bob = speakingRef.current ? Math.sin(t * 3) * ih * 0.004 : Math.sin(t * 1.2) * ih * 0.0025; // breathing / talk-bob

        const mY = mouthY * ih;
        ctx.clearRect(0, 0, iw, ih);
        ctx.save();
        ctx.translate(0, bob);

        // 1) upper face (above the lips), unchanged
        ctx.drawImage(img, 0, 0, iw, mY, 0, 0, iw, mY);

        // 2) the open mouth interior — a soft dark shape that grows with `open`
        if (open > 0.4) {
          const mx = mouthX * iw, mw = mouthW * iw;
          const grad = ctx.createLinearGradient(0, mY, 0, mY + open);
          grad.addColorStop(0, "rgba(60,20,22,0.85)");
          grad.addColorStop(0.5, "rgba(35,10,12,0.92)");
          grad.addColorStop(1, "rgba(70,25,28,0.8)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(mx, mY + open * 0.5, mw * 0.5, open * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3) lower face / jaw, shifted down by `open`
        ctx.drawImage(img, 0, mY, iw, ih - mY, 0, mY + open, iw, ih - mY);
        ctx.restore();
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mouthX, mouthY, mouthW]);

  return <canvas ref={canvasRef} className={className} />;
}
