import { ShieldCheck, ScanText, Landmark, HeartPulse, Wallet, Target, Scale, Sprout, LucideIcon } from "lucide-react";
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
    key: "kavach",
    icon: ShieldCheck,
    nameKey: "k.name", tagKey: "k.tag", descKey: "k.desc", personaKey: "k.persona",
    accent: "#2D6BFF", accentDark: "#1A49BD", tint: "#E8F0FE",
    photo: "/agents/kavach.jpg", index: "01", group: "protect",
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
    photo: "/agents/samajh.jpg", index: "02", group: "protect",
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
    photo: "/agents/haq.jpg", index: "03", group: "claim",
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
    photo: "/agents/sehat.jpg", index: "04", group: "claim",
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
    photo: "/agents/paisa.jpg", index: "05", group: "claim", badge: "New",
    stats: [
      { v: "sorts your money", l: "in seconds, automatically" },
      { v: "finds leaks", l: "unused subs & extra charges" },
      { v: "flags dues", l: "never miss a payment" },
      { v: "a save plan", l: "tailored to your spending" },
    ],
  },
  {
    key: "samay",
    icon: Target,
    nameKey: "sm.name", tagKey: "sm.tag", descKey: "sm.desc", personaKey: "sm.persona",
    accent: "#2E3A7B", accentDark: "#1F2A5E", tint: "#E7E9F4",
    photo: "/agents/samay.jpg", index: "06", group: "automate", badge: "New",
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
    photo: "/agents/setu.jpg", index: "07", group: "automate", badge: "New",
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
    photo: "/agents/krishi.jpg", index: "08", group: "automate", badge: "New",
    stats: [
      { v: "photo diagnosis", l: "pests & crop disease" },
      { v: "action plan", l: "what to do right now" },
      { v: "farm schemes", l: "PM-KISAN · PMFBY · KCC" },
      { v: "₹0", l: "free advice, in any language" },
    ],
  },
];

export const featureByKey = (k: FeatureKey) => FEATURES.find((f) => f.key === k)!;
