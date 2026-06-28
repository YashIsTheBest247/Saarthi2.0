import { LayoutDashboard, Briefcase, FileText, Siren } from "lucide-react";
import { AgentConsole, ConsoleModule } from "./AgentConsole";
import { H, Wrap, StatTiles } from "./kit";
import { Disha } from "../Disha";
import { ResumeTailor } from "../ResumeTailor";
import { Emergency } from "../Emergency";

const ACCENT = "#6D4AA7";

export function DishaConsole({ onBack }: { onBack: () => void }) {
  const modules: ConsoleModule[] = [
    {
      id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
      render: (go) => (
        <Wrap>
          <H title="Career dashboard" sub="Get job-ready — résumé, openings, interviews and the skills to learn next." />
          <StatTiles accent={ACCENT} tiles={[
            { v: "Résumé", l: "tailored to each role" },
            { v: "Job search", l: "where the jobs are" },
            { v: "Mock interview", l: "questions + answers" },
            { v: "Skill plan", l: "what to learn next" },
          ]} />
          <div className="mt-6 card flex flex-col justify-between p-6">
            <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Get hired faster</h3><p className="text-[15px] text-graphite">Tell Disha about yourself or paste a job description — get a sharp résumé, an application message, interview practice, or a skill plan.</p></div>
            <button onClick={() => go("coach")} className="btn-accent mt-5 w-fit text-sm" style={{ background: ACCENT }}>Open career coach</button>
          </div>
        </Wrap>
      ),
    },
    { id: "coach", label: "Career coach", icon: Briefcase, render: () => <Wrap><Disha embedded /></Wrap> },
    { id: "resume", label: "Resume tailor", icon: FileText, render: () => <Wrap><ResumeTailor /></Wrap> },
  ];

  modules.push({ id: "sos", label: "Already affected?", icon: Siren, render: () => <Emergency agentKey="disha" /> });
  return <AgentConsole agentKey="disha" platform="Career Copilot" badge={Briefcase} modules={modules} onBack={onBack} />;
}
