import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app/AppContext";
import { getEmployees, Employee } from "./api";
import { wfLoc } from "./wfI18n";

/* Fetch the AI-Workforce catalog and localize its display fields (title, short,
 * sector, subSector, tagline) to the current language. Re-localizes instantly on
 * a language switch. Names/ids/icons are unchanged. Drop-in for the old
 * `useState([]) + useEffect(getEmployees)` pattern. */
export function useEmployees(): Employee[] {
  const { lang } = useApp();
  const [raw, setRaw] = useState<Employee[]>([]);
  useEffect(() => { getEmployees().then(setRaw); }, []);
  const hi = lang.iso === "hi";
  return useMemo(() => raw.map((e) => ({ ...e, ...wfLoc(e, hi) })), [raw, hi]);
}
