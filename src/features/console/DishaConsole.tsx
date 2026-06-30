import { LayoutDashboard, Briefcase, FileText, Siren, Sparkles } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { H, Wrap, StatTiles } from "./kit";
import { Disha } from "../Disha";
import { ResumeTailor } from "../ResumeTailor";
import { Catalyst } from "../disha/Catalyst";
import { Emergency } from "../Emergency";

const ACCENT = "#6D4AA7";

export function DishaConsole({ onBack }: { onBack: () => void }) {
  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Career dashboard" sub="Beyond résumés — assess real skills, close gaps, and get hired." />
          <StatTiles accent={ACCENT} tiles={[
            { v: "Skill match", l: "JD ↔ résumé, scored" },
            { v: "SkillLens", l: "adaptive AI interview" },
            { v: "Gap analysis", l: "what to learn next" },
            { v: "Learning plan", l: "roadmap + resources" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Catalyst AI — skill assessment</h3><p className="text-[15px] text-graphite">Paste a JD &amp; résumé → Disha extracts skills, finds gaps, runs an adaptive interview, scores readiness, and builds a personalized learning roadmap.</p></div>
            <button onClick={() => go("catalyst")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Start assessment</button>
          </div>
        </Wrap>
      ),
    },
    { id: "catalyst", label: "Catalyst (skills)", icon: Sparkles, render: () => <Wrap><Catalyst /></Wrap> },
    { id: "coach", label: "Career coach", icon: Briefcase, render: () => <Wrap><Disha embedded /></Wrap> },
    { id: "resume", label: "Resume tailor", icon: FileText, render: () => <Wrap><ResumeTailor /></Wrap> },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="disha" /> });
  return <AgentConsole agentKey="disha" platform="Career Copilot" badge={Briefcase} modules={modules} onBack={onBack} />;
}
