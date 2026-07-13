import { ShieldCheck, ScanText, Landmark, HeartPulse, Wallet, Target, Scale, Sprout, Calculator, Briefcase, GraduationCap, Video, Building2, Mountain, LucideIcon } from "lucide-react";
import { FeatureKey } from "./api";

export type Group = "protect" | "claim" | "automate";

export interface Stat {
  v: string;
  l: string;
}

export interface FeatureMeta {
  key: FeatureKey;
  icon: LucideIcon;
  nameKey: string;
  tagKey: string;
  descKey: string;
  personaKey: string;
  accent: string;
  accentDark: string;
  tint: string;
  photo: string;
  index: string;
  group: Group;
  badge?: string;
  stats: Stat[];
}

export const FEATURES: FeatureMeta[] = [
  {
    key: "raahat",
    icon: ShieldCheck,
    nameKey: "rh.name", tagKey: "rh.tag", descKey: "rh.desc", personaKey: "rh.persona",
    accent: "#C0397B", accentDark: "#962B5F", tint: "#FBE6F1",
    photo: "/agents/suraksha.jpg", index: "01", group: "protect", badge: "New",
    stats: [
      { v: "112 · 1091 · 181", l: "the right helplines, built in" },
      { v: "calm next steps", l: "what to do, in order" },
      { v: "your rights", l: "POSH, PWDVA, Zero-FIR" },
      { v: "24×7", l: "support, never judgement" },
    ],
  },
  {
    key: "disha",
    icon: Briefcase,
    nameKey: "ds.name", tagKey: "ds.tag", descKey: "ds.desc", personaKey: "ds.persona",
    accent: "#6D4AA7", accentDark: "#4E3480", tint: "#EEE8F7",
    photo: "/agents/disha.jpg", index: "01", group: "automate",
    stats: [
      { v: "resume in minutes", l: "tailored to each job" },
      { v: "find openings", l: "where the jobs actually are" },
      { v: "mock interview", l: "questions + model answers" },
      { v: "skill gaps", l: "what to learn next" },
    ],
  },
  {
    key: "kavach",
    icon: ShieldCheck,
    nameKey: "k.name", tagKey: "k.tag", descKey: "k.desc", personaKey: "k.persona",
    accent: "#2D6BFF", accentDark: "#1A49BD", tint: "#E8F0FE",
    photo: "/agents/kavach.jpg", index: "02", group: "protect",
    stats: [
      { v: "₹22,800Cr", l: "lost to cyber fraud in India yearly" },
      { v: "60 sec", l: "to check any message or call" },
      { v: "24×7", l: "always-on protection" },
      { v: "1930", l: "cyber helpline built in" },
    ],
  },
  {
    key: "samajh",
    icon: ScanText,
    nameKey: "s.name", tagKey: "s.tag", descKey: "s.desc", personaKey: "s.persona",
    accent: "#C2641F", accentDark: "#9C4F18", tint: "#FBEEDD",
    photo: "/agents/samajh.jpg", index: "03", group: "protect",
    stats: [
      { v: "30 sec", l: "to decode any document" },
      { v: "100%", l: "plain-language, no jargon" },
      { v: "any", l: "bill, notice, policy or letter" },
      { v: "₹0", l: "no charge, no login" },
    ],
  },
  {
    key: "haq",
    icon: Landmark,
    nameKey: "h.name", tagKey: "h.tag", descKey: "h.desc", personaKey: "h.persona",
    accent: "#1F7A55", accentDark: "#155041", tint: "#E4F3EC",
    photo: "/agents/haq.jpg", index: "04", group: "claim",
    stats: [
      { v: "₹ Lakhs Cr", l: "welfare unclaimed every year" },
      { v: "500+", l: "central & state schemes known" },
      { v: "5–8", l: "matches per profile" },
      { v: "step-by-step", l: "how to apply guidance" },
    ],
  },
  {
    key: "sehat",
    icon: HeartPulse,
    nameKey: "m.name", tagKey: "m.tag", descKey: "m.desc", personaKey: "m.persona",
    accent: "#C0453B", accentDark: "#9A352D", tint: "#FBE9EA",
    photo: "/agents/sehat.jpg", index: "05", group: "claim",
    stats: [
      { v: "50–90%", l: "saved with generic medicines" },
      { v: "₹540/mo", l: "typical prescription saving" },
      { v: "Jan Aushadhi", l: "nearest-store guidance" },
      { v: "24×7", l: "safe health guidance" },
    ],
  },
  {
    key: "paisa",
    icon: Wallet,
    nameKey: "pa.name", tagKey: "pa.tag", descKey: "pa.desc", personaKey: "pa.persona",
    accent: "#138A72", accentDark: "#0E6356", tint: "#E1F2EE",
    photo: "/agents/paisa.jpg", index: "06", group: "claim",
    stats: [
      { v: "sorts your money", l: "in seconds, automatically" },
      { v: "finds leaks", l: "unused subs & extra charges" },
      { v: "flags dues", l: "never miss a payment" },
      { v: "a save plan", l: "tailored to your spending" },
    ],
  },
  {
    key: "kar",
    icon: Calculator,
    nameKey: "tx.name", tagKey: "tx.tag", descKey: "tx.desc", personaKey: "tx.persona",
    accent: "#A06A1F", accentDark: "#7C5115", tint: "#F5ECD9",
    photo: "/agents/kar.jpg", index: "07", group: "claim",
    stats: [
      { v: "AY 2026-27", l: "new regime (FY 2025-26)" },
      { v: "Form-16 PDF", l: "auto-extracted by AI" },
      { v: "exact math", l: "computed on-device, not by AI" },
      { v: "refund or payable", l: "with full breakdown" },
    ],
  },
  {
    key: "samay",
    icon: Target,
    nameKey: "sm.name", tagKey: "sm.tag", descKey: "sm.desc", personaKey: "sm.persona",
    accent: "#2E3A7B", accentDark: "#1F2A5E", tint: "#E7E9F4",
    photo: "/agents/samay.jpg", index: "08", group: "automate",
    stats: [
      { v: "plans & does", l: "goes beyond reminders" },
      { v: "focus blocks", l: "auto-scheduled to hit deadlines" },
      { v: "snap · talk · paste", l: "capture tasks any way" },
      { v: "first draft", l: "deliverables started for you" },
    ],
  },
  {
    key: "setu",
    icon: Scale,
    nameKey: "st.name", tagKey: "st.tag", descKey: "st.desc", personaKey: "st.persona",
    accent: "#2F6F8F", accentDark: "#1F4E66", tint: "#E4EEF3",
    photo: "/agents/setu.jpg", index: "09", group: "automate",
    stats: [
      { v: "the right authority", l: "found for your problem" },
      { v: "complaint drafted", l: "ready to file" },
      { v: "escalation path", l: "forum · RTI · 1915" },
      { v: "your rights", l: "explained in plain words" },
    ],
  },
  {
    key: "krishi",
    icon: Sprout,
    nameKey: "kr.name", tagKey: "kr.tag", descKey: "kr.desc", personaKey: "kr.persona",
    accent: "#4B7A2B", accentDark: "#355820", tint: "#EAF1E0",
    photo: "/agents/krishi.jpg", index: "10", group: "automate",
    stats: [
      { v: "photo diagnosis", l: "pests & crop disease" },
      { v: "action plan", l: "what to do right now" },
      { v: "farm schemes", l: "PM-KISAN · PMFBY · KCC" },
      { v: "₹0", l: "free advice, in any language" },
    ],
  },
  {
    key: "study",
    icon: GraduationCap,
    nameKey: "ac.name", tagKey: "ac.tag", descKey: "ac.desc", personaKey: "ac.persona",
    accent: "#7A4FB0", accentDark: "#553487", tint: "#EFE9F8",
    photo: "/agents/lekhak.jpg", index: "12", group: "automate",
    stats: [
      { v: "essays & reports", l: "written to your brief" },
      { v: "Times New Roman 12", l: "professional formatting" },
      { v: "PDF · Word · PPT", l: "export in any format" },
      { v: "set a deadline", l: "Smriti reminds you to submit" },
    ],
  },
  {
    key: "pragyan",
    icon: Video,
    nameKey: "pr.name", tagKey: "pr.tag", descKey: "pr.desc", personaKey: "pr.persona",
    accent: "#E14434", accentDark: "#B5301F", tint: "#FBE6E2",
    photo: "/agents/pragyan.jpg", index: "13", group: "automate", badge: "New",
    stats: [
      { v: "any topic", l: "explained simply" },
      { v: "video or podcast", l: "script · visuals · subtitles" },
      { v: "voice narration", l: "watch & listen in-browser" },
      { v: "trending news", l: "a built-in topic source" },
    ],
  },
  {
    key: "udyam",
    icon: Building2,
    nameKey: "ud.name", tagKey: "ud.tag", descKey: "ud.desc", personaKey: "ud.persona",
    accent: "#0E7490", accentDark: "#0A5566", tint: "#DDF0F4",
    photo: "/agents/udyam.jpg", index: "14", group: "automate",
    stats: [
      { v: "Udyam + GST", l: "registrations, step by step" },
      { v: "licenses", l: "exactly what your trade needs" },
      { v: "Mudra · PMEGP", l: "collateral-free credit & subsidy" },
      { v: "idea → launch", l: "a clear path to formalise" },
    ],
  },
  {
    key: "khanan",
    icon: Mountain,
    nameKey: "kn.name", tagKey: "kn.tag", descKey: "kn.desc", personaKey: "kn.persona",
    accent: "#B45309", accentDark: "#8A3F07", tint: "#F7ECD9",
    photo: "/agents/khanan.jpg", index: "15", group: "automate",
    stats: [
      { v: "leases & permits", l: "forms and the right office" },
      { v: "DGMS safety", l: "compliance, made simple" },
      { v: "clearances", l: "EC · JSPCB consent" },
      { v: "worker rights", l: "CMPF · wages · compensation" },
    ],
  },
];

export const featureByKey = (k: FeatureKey) => FEATURES.find((f) => f.key === k)!;

// The consumer specialists surfaced to users. The rest still power internal
// workflows, the orchestrator and the chat router, but aren't browsed directly —
// the app's public face is these five plus the AI Workforce (server/employees.js).
export const KEEP_KEYS: FeatureKey[] = ["haq", "setu", "samajh", "sehat", "samay", "udyam", "khanan", "pragyan"];
export const VISIBLE_FEATURES = KEEP_KEYS.map(featureByKey);
