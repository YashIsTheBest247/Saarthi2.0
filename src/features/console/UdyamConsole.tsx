import { Building2 } from "lucide-react";
import { AdvisorConsole } from "./AdvisorConsole";
import { useApp } from "../../app/AppContext";

export function UdyamConsole({ onBack }: { onBack: () => void }) {
  const { t } = useApp();
  return (
    <AdvisorConsole
      agentKey="udyam"
      badge={Building2}
      placeholder={t("ud.ph")}
      example="I want to start a small home-bakery in Pune. What registrations, licenses and loans do I need?"
      onBack={onBack}
    />
  );
}
