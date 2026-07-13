// Clean lucide line-icons for each AI-employee role (no emoji / AI-generated art).
// The server sends an `icon` token (server/employees.js); this maps it to a component.
import {
  Package, ShieldCheck, Truck, Headphones, Leaf, Wrench, Receipt, Users,
  Megaphone, Sprout, Pill, Zap, GraduationCap, Sparkles, LucideIcon,
  UtensilsCrossed, HardHat, Server, Stamp, Landmark, Scale, ClipboardList, Ship, Cpu, Car,
} from "lucide-react";

export const ROLE_ICONS: Record<string, LucideIcon> = {
  package: Package,
  shield: ShieldCheck,
  truck: Truck,
  headphones: Headphones,
  leaf: Leaf,
  wrench: Wrench,
  receipt: Receipt,
  users: Users,
  megaphone: Megaphone,
  sprout: Sprout,
  pill: Pill,
  energy: Zap,
  education: GraduationCap,
  food: UtensilsCrossed,
  construction: HardHat,
  server: Server,
  stamp: Stamp,
  landmark: Landmark,
  scale: Scale,
  clipboard: ClipboardList,
  ship: Ship,
  cpu: Cpu,
  car: Car,
  sparkles: Sparkles,
};

export const roleIcon = (token?: string): LucideIcon => ROLE_ICONS[token || ""] || Sparkles;
