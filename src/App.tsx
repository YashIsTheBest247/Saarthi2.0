import { useEffect, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { AppProvider, useApp } from "./app/AppContext";
import { Nav } from "./components/Nav";
import { Landing } from "./components/Landing";
import { KavachConsole } from "./features/kavach/KavachConsole";
import { SehatConsole } from "./features/sehat/SehatConsole";
import { SamajhConsole } from "./features/console/SamajhConsole";
import { HaqConsole } from "./features/console/HaqConsole";
import { PaisaConsole } from "./features/console/PaisaConsole";
import { SamayConsole } from "./features/console/SamayConsole";
import { SetuConsole } from "./features/console/SetuConsole";
import { KrishiConsole } from "./features/console/KrishiConsole";
import { KarConsole } from "./features/console/KarConsole";
import { RaahatConsole } from "./features/console/RaahatConsole";
import { DishaConsole } from "./features/console/DishaConsole";
import { StudyConsole } from "./features/study/StudyConsole";
import { PragyanConsole } from "./features/pragyan/PragyanConsole";
import { UdyamConsole } from "./features/console/UdyamConsole";
import { KhananConsole } from "./features/khanan/KhananConsole";
import { WorkflowsView } from "./features/WorkflowsView";
import { Orchestrator } from "./features/Orchestrator";
import { Workforce } from "./features/Workforce";
import { FloatingChat } from "./components/FloatingChat";
import { FeatureKey } from "./lib/api";

type View = "home" | FeatureKey | "workflows" | "orchestrator" | "workforce";

function Shell() {
  const { lang } = useApp();
  const [view, setView] = useState<View>("home");
  const L = lang.iso; // include in keys so a language switch cross-fades smoothly
  const homeScroll = useRef(0);   // remembered landing scroll position
  const wantRestore = useRef(false); // restore it when returning via Back
  const [wfInitial, setWfInitial] = useState<string | undefined>(undefined); // preselected workflow id
  const [wfBuild, setWfBuild] = useState(false); // open straight into the builder canvas
  const [pragyan, setPragyan] = useState<{ title?: string; auto?: boolean }>({}); // deep-link reel seed
  const [wfSeed, setWfSeed] = useState<{ id?: string; custom?: boolean }>({}); // preselect a Workforce employee

  // deep links (e.g. from the Telegram bot): ?agent=kavach opens that console,
  // ?q=... opens the chat pre-filled. URL is cleaned afterwards.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const a = p.get("agent");
    const q = p.get("q");
    const valid = ["kavach", "samajh", "haq", "sehat", "paisa", "samay", "setu", "krishi", "kar", "raahat", "disha", "study", "pragyan", "udyam", "khanan"];
    if (a && valid.includes(a)) {
      setView(a as FeatureKey);
      if (a === "pragyan" && q) setPragyan({ title: q, auto: true }); // auto-make the reel
    } else if (q) window.dispatchEvent(new CustomEvent("saarthi:openchat", { detail: { q } }));
    if (a || q) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // open the agentic workflows view from anywhere (nav, landing); an optional
  // detail.id preselects that specific workflow for a smooth "open this" feel.
  useEffect(() => {
    const h = (e: Event) => {
      if (view === "home") homeScroll.current = window.scrollY;
      setWfInitial((e as CustomEvent).detail?.id);
      setWfBuild(!!(e as CustomEvent).detail?.build);
      setView("workflows");
    };
    window.addEventListener("saarthi:workflows", h);
    return () => window.removeEventListener("saarthi:workflows", h);
  }, [view]);

  // open the Smriti-led orchestrator view (Closing CTA)
  useEffect(() => {
    const h = () => { if (view === "home") homeScroll.current = window.scrollY; setView("orchestrator"); };
    window.addEventListener("saarthi:orchestrator", h);
    return () => window.removeEventListener("saarthi:orchestrator", h);
  }, [view]);

  // open the AI Workforce view (hire rentable AI employees); optional detail
  // preselects an employee (detail.id) or opens the "design your own" panel (detail.custom)
  useEffect(() => {
    const h = (e: Event) => {
      if (view === "home") homeScroll.current = window.scrollY;
      const d = (e as CustomEvent).detail || {};
      setWfSeed({ id: d.id, custom: d.custom });
      setView("workforce");
    };
    window.addEventListener("saarthi:workforce", h);
    return () => window.removeEventListener("saarthi:workforce", h);
  }, [view]);

  // let one agent hand off to another (e.g. Khanan → Haq / Adhrit / Lekh / Smriti)
  useEffect(() => {
    const h = (e: Event) => {
      const k = (e as CustomEvent).detail?.agent as FeatureKey | undefined;
      if (!k) return;
      if (view === "home") homeScroll.current = window.scrollY;
      setView(k);
    };
    window.addEventListener("saarthi:open", h);
    return () => window.removeEventListener("saarthi:open", h);
  }, [view]);

  const open = (k?: FeatureKey) => {
    if (view === "home") homeScroll.current = window.scrollY; // remember where we were
    setView(k ?? "kavach");
  };
  const back = () => { wantRestore.current = true; setView("home"); };

  // run after the outgoing page has animated out and the new one is in the DOM
  const onExitComplete = () => {
    // jump instantly — bypass the global smooth scroll-behavior so a new page
    // doesn't visibly scroll up from wherever the button was on the old page
    if (view === "home" && wantRestore.current) {
      wantRestore.current = false;
      requestAnimationFrame(() => { document.documentElement.scrollTop = homeScroll.current; });
    } else if (view !== "home") {
      document.documentElement.scrollTop = 0;
    }
    // (language switch on home: leave the scroll position untouched)
  };

  return (
    <div className="page-bg relative min-h-screen">
      {view === "home" && <Nav onHome={() => setView("home")} onOpen={open} />}

      <main className="relative z-10">
        <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
          {view === "home" && <Landing key={`home-${L}`} onOpen={open} />}
          {view === "kavach" && <KavachConsole key={`kavach-${L}`} onBack={back} />}
          {view === "samajh" && <SamajhConsole key={`samajh-${L}`} onBack={back} />}
          {view === "haq" && <HaqConsole key={`haq-${L}`} onBack={back} />}
          {view === "sehat" && <SehatConsole key={`sehat-${L}`} onBack={back} />}
          {view === "paisa" && <PaisaConsole key={`paisa-${L}`} onBack={back} />}
          {view === "samay" && <SamayConsole key={`samay-${L}`} onBack={back} />}
          {view === "setu" && <SetuConsole key={`setu-${L}`} onBack={back} />}
          {view === "krishi" && <KrishiConsole key={`krishi-${L}`} onBack={back} />}
          {view === "kar" && <KarConsole key={`kar-${L}`} onBack={back} />}
          {view === "raahat" && <RaahatConsole key={`raahat-${L}`} onBack={back} />}
          {view === "disha" && <DishaConsole key={`disha-${L}`} onBack={back} />}
          {view === "study" && <StudyConsole key={`study-${L}`} onBack={back} />}
          {view === "pragyan" && <PragyanConsole key={`pragyan-${L}`} onBack={back} initialTitle={pragyan.title} autoplay={pragyan.auto} />}
          {view === "udyam" && <UdyamConsole key={`udyam-${L}`} onBack={back} />}
          {view === "khanan" && <KhananConsole key={`khanan-${L}`} onBack={back} />}
          {view === "workflows" && <WorkflowsView key={`workflows-${L}`} onBack={back} initialId={wfInitial} initialBuild={wfBuild} />}
          {view === "orchestrator" && <Orchestrator key={`orchestrator-${L}`} onBack={back} />}
          {view === "workforce" && <Workforce key={`workforce-${L}`} onBack={back} initialId={wfSeed.id} initialCustom={wfSeed.custom} />}
        </AnimatePresence>
      </main>

      <FloatingChat onOpen={open} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
