import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone, Siren, Sparkles, Play, Pause, RotateCcw, Loader2, TrendingUp, Film, Mic, Download, Copy, Hash, Volume2,
} from "lucide-react";
import { AgentConsole, ConsoleModule } from "../console/AgentConsole";
import { Emergency } from "../Emergency";
import { H, Wrap } from "../console/kit";
import { useApp } from "../../app/AppContext";
import { callFeature } from "../../lib/api";
import { Thinking, MockNote } from "../../components/ui";

const ACCENT = "#E14434";

interface Scene { narration: string; caption: string; imageQuery: string; seconds?: number }
interface Reel { title: string; hook: string; scenes: Scene[]; hashtags?: string[]; description?: string; _mock?: boolean }
interface Trend { title: string; link?: string; trend?: number; source?: string }

// Narration voices — each maps to a voice-pick strategy + pitch/rate so it works
// across whatever voices the browser/OS actually provides.
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

export function PragyanConsole({ onBack, initialTitle, autoplay }: { onBack: () => void; initialTitle?: string; autoplay?: boolean }) {
  const modules: ConsoleModule[] = [
    { id: "studio", label: "Studio", icon: Film, render: () => <Studio initialTitle={initialTitle} autoplay={autoplay} /> },
    { id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="pragyan" /> },
  ];
  return <AgentConsole agentKey="pragyan" platform="Educational Videos & Podcasts" badge={Megaphone} modules={modules} onBack={onBack} />;
}

function Studio({ initialTitle, autoplay }: { initialTitle?: string; autoplay?: boolean }) {
  const { t, lang } = useApp();
  const [topic, setTopic] = useState(initialTitle || "");
  const [mode, setMode] = useState<"video" | "podcast">("video");
  const [loading, setLoading] = useState(false);
  const [reel, setReel] = useState<Reel | null>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [trending, setTrending] = useState<Trend[]>([]);
  const [trendLive, setTrendLive] = useState(false);

  // playback
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [voiceId, setVoiceId] = useState("natural");
  const stopRef = useRef(false);
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  useEffect(() => {
    fetch("/api/trending").then((r) => r.json()).then((d) => { setTrending(d.items || []); setTrendLive(!!d.live); }).catch(() => {});
    // warm up the speech voice list (Chrome loads it asynchronously)
    try { window.speechSynthesis?.getVoices?.(); window.speechSynthesis?.addEventListener?.("voiceschanged", () => {}); } catch { /* noop */ }
    return () => { stopRef.current = true; try { window.speechSynthesis?.cancel(); } catch { /* noop */ } };
  }, []);

  async function generate(title?: string) {
    const tt = (title ?? topic).trim();
    if (!tt && !trending.length) return;
    stopSpeech();
    setLoading(true); setReel(null); setImages({}); setScene(0);
    try {
      const headlines = trending.slice(0, 6).map((x, i) => `${i + 1}. ${x.title}`).join("\n");
      const r = await callFeature<Reel>("pragyan", { title: tt || trending[0]?.title, headlines, mode, language: lang.name });
      setReel(r);
      // fetch a stock image per scene (Pexels → Pollinations fallback, server-side)
      (r.scenes || []).forEach(async (s, i) => {
        try {
          const j = await (await fetch(`/api/pexels?q=${encodeURIComponent(s.imageQuery || r.title)}`)).json();
          setImages((p) => ({ ...p, [i]: j.url }));
        } catch { /* leave blank */ }
      });
    } catch { /* mock fallback handled server-side */ } finally { setLoading(false); }
  }

  // auto-generate from a deep link (Telegram "watch the reel")
  useEffect(() => { if (initialTitle && autoplay) generate(initialTitle); /* eslint-disable-next-line */ }, []);

  function pickVoice(gender: VoiceGender): SpeechSynthesisVoice | undefined {
    const want = lang.speech || (lang.iso === "hi" ? "hi-IN" : "en-IN");
    const base = want.split("-")[0];
    const vs = window.speechSynthesis?.getVoices?.() || [];
    // prefer exact locale, then same language, then any English — so it always speaks
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
    if (!reel?.scenes?.length || !("speechSynthesis" in window)) return;
    stopRef.current = false; setPlaying(true);
    const profile = VOICES.find((v) => v.id === voiceIdRef.current) || VOICES[0];
    const voice = pickVoice(profile.gender);
    const speak = (i: number) => {
      if (stopRef.current || i >= reel.scenes.length) { setPlaying(false); return; }
      setScene(i);
      const u = new SpeechSynthesisUtterance(reel.scenes[i].narration);
      u.lang = lang.speech || (lang.iso === "hi" ? "hi-IN" : "en-IN");
      if (voice) u.voice = voice;
      u.rate = profile.rate; u.pitch = profile.pitch;
      u.onend = () => { if (!stopRef.current) speak(i + 1); };
      u.onerror = () => { if (!stopRef.current) setTimeout(() => speak(i + 1), 600); };
      try { window.speechSynthesis.speak(u); } catch { /* noop */ }
    };
    speak(start);
  }

  const togglePlay = () => { if (playing) stopSpeech(); else playFrom(scene >= (reel?.scenes.length || 0) - 1 ? 0 : scene); };
  const restart = () => { stopSpeech(); setScene(0); setTimeout(() => playFrom(0), 120); };

  /* downloads */
  function srt() {
    if (!reel) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const tc = (s: number) => `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))},000`;
    let acc = 0; const lines = reel.scenes.map((s, i) => {
      const a = acc, b = acc + (s.seconds || 5); acc = b;
      return `${i + 1}\n${tc(a)} --> ${tc(b)}\n${s.narration}\n`;
    });
    dl(lines.join("\n"), `${slug(reel.title)}.srt`, "text/plain");
  }
  function script() {
    if (!reel) return;
    const body = `${reel.title}\n\n${reel.hook}\n\n${reel.scenes.map((s, i) => `${i + 1}. ${s.narration}`).join("\n")}\n\n${reel.description || ""}\n${(reel.hashtags || []).join(" ")}`;
    dl(body, `${slug(reel.title)}.txt`, "text/plain");
  }
  const shareText = () => reel && navigator.clipboard?.writeText(`${reel.title}\n\n${reel.description || ""}\n${(reel.hashtags || []).join(" ")}`);

  const cur = reel?.scenes?.[scene];

  return (
    <Wrap>
      <H title="Educational video & podcast studio" sub="Give any topic to explain — or pick a trending news story — and Pragyan scripts a short educational video or podcast, finds visuals, and narrates it right here." />

      {/* composer */}
      <div className="card p-5">
        <div className="mb-3 inline-flex rounded-full border border-line bg-paper p-1 text-sm">
          {(["video", "podcast"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-colors ${mode === m ? "text-white" : "text-graphite"}`} style={mode === m ? { background: ACCENT } : undefined}>
              {m === "video" ? <Film className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {m === "video" ? "Video" : "Podcast"}
            </button>
          ))}
        </div>
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} placeholder="A topic to explain… e.g. How UPI works, photosynthesis, the new tax regime (or pick a trending story below)" className="field resize-none deva" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => generate()} disabled={loading || (!topic.trim() && !trending.length)} className="btn-accent text-[15px]" style={{ background: ACCENT }}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Producing…</> : <><Sparkles className="h-4 w-4" /> Make {mode === "video" ? "video" : "podcast"}</>}
          </button>
          {trending[0] && <button onClick={() => { setTopic(trending[0].title); generate(trending[0].title); }} className="btn-ghost text-sm"><TrendingUp className="h-4 w-4" /> Use #1 trending</button>}
        </div>
      </div>

      {loading && <div className="card mt-5 p-8"><Thinking label="Scripting · finding visuals · narrating…" /></div>}

      {/* the reel */}
      {reel && !loading && (
        <div className="mt-5 space-y-4">
          <div className="card overflow-hidden p-0">
            {/* stage */}
            <div className="relative aspect-video w-full overflow-hidden bg-ink">
              {mode === "video" ? (
                images[scene] ? (
                  <motion.img key={scene} src={images[scene]} alt="" initial={{ scale: 1.0, opacity: 0.4 }} animate={{ scale: 1.08, opacity: 1 }} transition={{ duration: (cur?.seconds || 5), ease: "linear" }} className="absolute inset-0 h-full w-full object-cover" />
                ) : <div className="absolute inset-0 flex items-center justify-center text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT}33, #16140f 70%)` }}>
                  <div className="flex items-end gap-1.5">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <motion.span key={i} animate={playing ? { height: [10, 34, 10] } : { height: 10 }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }} className="w-2 rounded-full" style={{ background: "#fff", opacity: 0.85 }} />
                    ))}
                  </div>
                  <Mic className="h-7 w-7 text-white/70" />
                </div>
              )}

              {/* gradient + subtitle */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16">
                {cur?.caption && <div className="mb-1 inline-block rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm">{cur.caption}</div>}
                <p className="text-balance text-lg font-semibold leading-snug text-white deva">{cur?.narration}</p>
              </div>

              {/* progress segments */}
              <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
                {reel.scenes.map((_, i) => (
                  <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-white transition-all" style={{ width: i < scene ? "100%" : i === scene ? "60%" : "0%" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-2 p-4">
              <button onClick={togglePlay} className="btn-accent text-sm" style={{ background: ACCENT }}>{playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}</button>
              <button onClick={restart} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Restart</button>
              <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper p-1">
                <Volume2 className="ml-1.5 h-3.5 w-3.5 flex-none text-faint" />
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setVoiceId(v.id); if (playing) { stopSpeech(); setTimeout(() => playFrom(scene), 120); } }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${voiceId === v.id ? "text-white" : "text-graphite hover:bg-mist"}`}
                    style={voiceId === v.id ? { background: ACCENT } : undefined}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-faint">Scene {Math.min(scene + 1, reel.scenes.length)} / {reel.scenes.length}</span>
            </div>
          </div>

          {/* meta */}
          <div className="card p-5">
            <div className="display text-lg font-bold deva">{reel.title}</div>
            {reel.description && <p className="mt-1 text-sm text-muted deva">{reel.description}</p>}
            {reel.hashtags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">{reel.hashtags.map((h, i) => <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-graphite"><Hash className="h-3 w-3" />{h.replace(/^#/, "")}</span>)}</div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={script} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Script (.txt)</button>
              <button onClick={srt} className="btn-ghost text-sm"><Download className="h-4 w-4" /> Subtitles (.srt)</button>
              <button onClick={shareText} className="btn-ghost text-sm"><Copy className="h-4 w-4" /> Copy caption</button>
            </div>
            {reel._mock && <MockNote text="Sample reel — add a Gemini key for a fully custom script." />}
            <p className="mt-3 text-xs text-faint">Tip: YouTube auto-upload needs a server worker (FFmpeg + OAuth) and isn't available on the hosted demo — this plays your reel right here and gives you the script, subtitles &amp; caption to post.</p>
          </div>
        </div>
      )}

      {/* trending */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <TrendingUp className="h-4 w-4" style={{ color: ACCENT }} /> News provider · trending on Economic Times
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendLive ? "bg-[#E4F1EA] text-[#2E6F52]" : "bg-mist text-faint"}`}>{trendLive ? "LIVE" : "sample"}</span>
        </div>
        <div className="space-y-2">
          {trending.map((x, i) => (
            <div key={i} className="card flex items-center gap-3 p-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span>
              <a href={x.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-graphite hover:text-ink deva">{x.title}</a>
              {typeof x.trend === "number" && <span className="hidden flex-none text-xs font-semibold sm:inline" style={{ color: ACCENT }}>{x.trend}🔥</span>}
              <button onClick={() => { setTopic(x.title); generate(x.title); }} className="btn-ghost flex-none px-3 py-1.5 text-xs"><Film className="h-3.5 w-3.5" /> Explain</button>
            </div>
          ))}
          {!trending.length && <p className="text-sm text-muted">Loading trending stories…</p>}
        </div>
      </div>
    </Wrap>
  );
}

const slug = (s: string) => (s || "reel").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "reel";
function dl(text: string, name: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
