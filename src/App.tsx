import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "./app/AppContext";
import { Nav } from "./components/Nav";
import { Landing } from "./components/Landing";
import { KavachConsole } from "./features/kavach/KavachConsole";
import { Samajh } from "./features/Samajh";
import { Haq } from "./features/Haq";
import { Sehat } from "./features/Sehat";
import { Paisa } from "./features/Paisa";
import { Samay } from "./features/Samay";
import { Setu } from "./features/Setu";
import { Krishi } from "./features/Krishi";
import { FeatureKey } from "./lib/api";

type View = "home" | FeatureKey;

function Shell() {
  const [view, setView] = useState<View>("home");

  // scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const open = (k?: FeatureKey) => setView(k ?? "kavach");
  const back = () => setView("home");

  return (
    <div className="page-bg relative min-h-screen">
      {view === "home" && <Nav onHome={() => setView("home")} onOpen={() => open()} />}

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {view === "home" && <Landing key="home" onOpen={open} />}
          {view === "kavach" && <KavachConsole key="kavach" onBack={back} />}
          {view === "samajh" && <Samajh key="samajh" onBack={back} />}
          {view === "haq" && <Haq key="haq" onBack={back} />}
          {view === "sehat" && <Sehat key="sehat" onBack={back} />}
          {view === "paisa" && <Paisa key="paisa" onBack={back} />}
          {view === "samay" && <Samay key="samay" onBack={back} />}
          {view === "setu" && <Setu key="setu" onBack={back} />}
          {view === "krishi" && <Krishi key="krishi" onBack={back} />}
        </AnimatePresence>
      </main>
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
