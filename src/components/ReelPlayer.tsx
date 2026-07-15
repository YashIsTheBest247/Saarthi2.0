import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Loader2, Mic, Download, Copy, Hash, Volume2 } from "lucide-react";
import { useApp } from "../app/AppContext";

/* A self-contained "video/podcast" reel player: it slideshows a stock image per
 * scene (Pexels → Pollinations, server-side), narrates with the browser's speech
 * synthesis, shows subtitles, and offers script/subtitle/caption downloads.
 * Shared by Pragyan's studio and the Orchestrator feed so a reel renders the same
 * everywhere Pragyan produces one. */
export interface Scene { narration: string; caption?: string; imageQuery?: string; seconds?: number }
export interface Reel { title: string; hook?: string; scenes: Scene[]; hashtags?: string[]; description?: string; _mock?: boolean }

type VoiceGender = "any" | "female" | "male";
interface VoiceProfile { id: string; label: string; gender: VoiceGender; pitch: number; rate: number }
const VOICES: VoiceProfile[] = [
  { id: "natural", label: "Natural", gender: "any", pitch: 1, rate: 1.02 },
  { id: "female", label: "Female", gender: "female", pitch: 1.12, rate: 1.0 },
  { id: "male", label: "Male", gender: "male", pitch: 0.92, rate: 0.97 },
  { id: "cheerful", label: "Cheerful", gender: "female", pitch: 1.32, rate: 1.08 },
];
const FEMALE_RE = /female|woman|girl|aditi|heera|swara|kalpana|lekha|veena|raveena|samantha|victoria|zira|susan|fiona|tessa|neerja|asha|google\s*(uk|us)?\s*english\s*female/i;
const MALE_RE = /\bmale|\bman\b|ravi|hemant|rishi|prabhat|madhur|david|mark|alex|daniel|george|google\s*(uk|us)?\s*english\s*male|microsoft\s*(david|mark)/i;

const slug = (s: string) => (s || "reel").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "reel";
function dl(text: string, name: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function ReelPlayer({ reel, mode = "video", accent = "#E14434" }: { reel: Reel; mode?: "video" | "podcast"; accent?: string }) {
  const { t: _t, lang } = useApp();
  const [images, setImages] = useState<Record<number, string>>({});
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [voiceId, setVoiceId] = useState("natural");
  const stopRef = useRef(false);
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  const scenes = reel?.scenes || [];

  // fetch a stock image per scene (server-side Pexels → Pollinations fallback)
  useEffect(() => {
    let alive = true;
    setImages({}); setScene(0);
    scenes.forEach(async (s, i) => {
      try {
        const j = await (await fetch(`/api/pexels?q=${encodeURIComponent(s.imageQuery || reel.title)}`)).json();
        if (alive && j.url) setImages((p) => ({ ...p, [i]: j.url }));
      } catch { /* leave blank */ }
    });
    // warm up the browser's async voice list
    try { window.speechSynthesis?.getVoices?.(); } catch { /* noop */ }
    return () => { alive = true; stopRef.current = true; try { window.speechSynthesis?.cancel(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel]);

  function pickVoice(gender: VoiceGender): SpeechSynthesisVoice | undefined {
    const want = lang.speech || (lang.iso === "hi" ? "hi-IN" : "en-IN");
    const base = want.split("-")[0];
    const vs = window.speechSynthesis?.getVoices?.() || [];
    const pool = [
      ...vs.filter((v) => v.lang === want),
      ...vs.filter((v) => v.lang?.startsWith(base) && v.lang !== want),
      ...vs.filter((v) => v.lang?.startsWith("en") && !v.lang?.startsWith(base)),
    ];
    const list = pool.length ? pool : vs;
    if (gender === "female") return list.find((v) => FEMALE_RE.test(v.name)) || list.find((v) => !MALE_RE.test(v.name)) || list[0];
    if (gender === "male") return list.find((v) => MALE_RE.test(v.name)) || list[0];
    return list[0];
  }

  function stopSpeech() { stopRef.current = true; try { window.speechSynthesis?.cancel(); } catch { /* noop */ } setPlaying(false); }

  function playFrom(start: number) {
    if (!scenes.length || !("speechSynthesis" in window)) return;
    stopRef.current = false; setPlaying(true);
    const profile = VOICES.find((v) => v.id === voiceIdRef.current) || VOICES[0];
    const voice = pickVoice(profile.gender);
    const speak = (i: number) => {
      if (stopRef.current || i >= scenes.length) { setPlaying(false); return; }
      setScene(i);
      const u = new SpeechSynthesisUtterance(scenes[i].narration);
      u.lang = lang.speech || (lang.iso === "hi" ? "hi-IN" : "en-IN");
      if (voice) u.voice = voice;
      u.rate = profile.rate; u.pitch = profile.pitch;
      u.onend = () => { if (!stopRef.current) speak(i + 1); };
      u.onerror = () => { if (!stopRef.current) setTimeout(() => speak(i + 1), 600); };
      try { window.speechSynthesis.speak(u); } catch { /* noop */ }
    };
    speak(start);
  }

  const togglePlay = () => { if (playing) stopSpeech(); else playFrom(scene >= scenes.length - 1 ? 0 : scene); };
  const restart = () => { stopSpeech(); setScene(0); setTimeout(() => playFrom(0), 120); };

  function srt() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const tc = (s: number) => `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))},000`;
    let acc = 0; const lines = scenes.map((s, i) => {
      const a = acc, b = acc + (s.seconds || 5); acc = b;
      return `${i + 1}\n${tc(a)} --> ${tc(b)}\n${s.narration}\n`;
    });
    dl(lines.join("\n"), `${slug(reel.title)}.srt`, "text/plain");
  }
  function script() {
    const body = `${reel.title}\n\n${reel.hook || ""}\n\n${scenes.map((s, i) => `${i + 1}. ${s.narration}`).join("\n")}\n\n${reel.description || ""}\n${(reel.hashtags || []).join(" ")}`;
    dl(body, `${slug(reel.title)}.txt`, "text/plain");
  }
  const shareText = () => navigator.clipboard?.writeText(`${reel.title}\n\n${reel.description || ""}\n${(reel.hashtags || []).join(" ")}`);

  const cur = scenes[scene];
  if (!scenes.length) return null;

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden p-0">
        {/* stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-ink">
          {mode === "video" ? (
            images[scene] ? (
              <motion.img key={scene} src={images[scene]} alt="" initial={{ scale: 1.0, opacity: 0.4 }} animate={{ scale: 1.08, opacity: 1 }} transition={{ duration: (cur?.seconds || 5), ease: "linear" }} className="absolute inset-0 h-full w-full object-cover" />
            ) : <div className="absolute inset-0 flex items-center justify-center text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: `radial-gradient(circle at 50% 40%, ${accent}33, #16140f 70%)` }}>
              <div className="flex items-end gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <motion.span key={i} animate={playing ? { height: [10, 34, 10] } : { height: 10 }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }} className="w-2 rounded-full" style={{ background: "#fff", opacity: 0.85 }} />
                ))}
              </div>
              <Mic className="h-7 w-7 text-white/70" />
            </div>
          )}

          {/* gradient + subtitle */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-14">
            {cur?.caption && <div className="mb-1 inline-block rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">{cur.caption}</div>}
            <p className="text-balance text-base font-semibold leading-snug text-white deva">{cur?.narration}</p>
          </div>

          {/* progress segments */}
          <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
            {scenes.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: i < scene ? "100%" : i === scene ? "60%" : "0%" }} />
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 p-3">
          <button onClick={togglePlay} className="btn-accent text-sm" style={{ background: accent }}>{playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}</button>
          <button onClick={restart} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Restart</button>
          <div className="flex items-center gap-1 rounded-full border border-line bg-paper p-1">
            <Volume2 className="ml-1.5 h-3.5 w-3.5 flex-none text-faint" />
            {VOICES.map((v) => (
              <button key={v.id} onClick={() => { setVoiceId(v.id); if (playing) { stopSpeech(); setTimeout(() => playFrom(scene), 120); } }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${voiceId === v.id ? "text-white" : "text-graphite hover:bg-mist"}`}
                style={voiceId === v.id ? { background: accent } : undefined}>{v.label}</button>
            ))}
          </div>
          <span className="ml-auto text-xs text-faint">Scene {Math.min(scene + 1, scenes.length)} / {scenes.length}</span>
        </div>
      </div>

      {/* meta + downloads */}
      <div className="flex flex-wrap items-center gap-2">
        {reel.hashtags?.length ? reel.hashtags.slice(0, 5).map((h, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-graphite"><Hash className="h-3 w-3" />{h.replace(/^#/, "")}</span>
        )) : null}
        <button onClick={script} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Script</button>
        <button onClick={srt} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Subtitles</button>
        <button onClick={shareText} className="btn-ghost text-sm"><Copy className="h-4 w-4" /> Copy caption</button>
      </div>
    </div>
  );
}
