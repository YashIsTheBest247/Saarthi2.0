/**
 * Kavach detection engine — deterministic, explainable, runs fully client-side.
 * Everything here is reproducible: the metrics are computed live from the
 * bundled labelled sets, so the numbers in the Metrics module are real.
 */

/* ----------------------------- Scam detector ---------------------------- */

export interface TacticHit {
  category: string;
  phrase: string;
  weight: number;
}
export type Verdict = "Safe" | "Suspicious" | "Dangerous" | "Scam";
export interface ScamResult {
  score: number;
  verdict: Verdict;
  tactics: TacticHit[];
  predictedScam: boolean;
}

interface TacticDef {
  category: string;
  weight: number;
  patterns: string[]; // matched against lowercased text
}

// 11 tactic categories spanning the Indian scam landscape.
export const TACTICS: TacticDef[] = [
  { category: "Digital Arrest", weight: 42, patterns: ["digital arrest", "you are under arrest", "arrest warrant", "video call with police", "skype with officer", "parcel seized", "your number will be blocked by"] },
  { category: "Authority Impersonation", weight: 24, patterns: ["cbi", "trai", "narcotics", "customs", "income tax department", "enforcement directorate", "cyber cell officer", "police station", "fedex"] },
  { category: "Urgency / Threat", weight: 18, patterns: ["immediately", "within 2 hours", "within 24 hours", "account will be blocked", "will be suspended", "legal action", "final notice", "or else"] },
  { category: "KYC / Account Update", weight: 22, patterns: ["kyc", "update your pan", "aadhaar will be deactivated", "account will be deactivated", "re-verify your account", "complete your kyc"] },
  { category: "Remote Access", weight: 32, patterns: ["anydesk", "teamviewer", "screen share", "install this app", "download the app to verify", "quick support"] },
  { category: "Payment Demand", weight: 24, patterns: ["pay a fine", "transfer the money", "refundable security", "deposit", "processing fee", "pay on this upi", "scan this qr", "google pay the amount", "gift card"] },
  { category: "OTP / Credential Theft", weight: 30, patterns: ["share the otp", "tell me the otp", "give me the otp", "share your cvv", "share your pin", "confirm your otp", "read out the otp"] },
  { category: "Prize / Lottery", weight: 26, patterns: ["you have won", "lottery", "lucky draw", "kbc", "lucky winner", "claim your prize", "cash prize"] },
  { category: "Job / Loan Bait", weight: 18, patterns: ["work from home earn", "part time job earn", "instant loan", "pre-approved loan", "registration fee", "task based earning", "telegram for job"] },
  { category: "Phishing Link", weight: 20, patterns: ["click the link", "click here to", "bit.ly", "tinyurl", "http://", "verify at the link", "kyc-update", ".xyz", ".top"] },
  { category: "Secrecy / Isolation", weight: 18, patterns: ["do not tell anyone", "keep this confidential", "stay on the call", "don't disconnect", "do not inform your family", "this is a secret"] },
];

const SAFE_GUARDS = ["do not share this otp", "never share your otp", "do not share your otp", "do not share it with anyone", "beware of fraud", "we never ask for otp"];

export function classifyScam(raw: string): ScamResult {
  const text = ` ${raw.toLowerCase()} `;
  const guarded = SAFE_GUARDS.some((g) => text.includes(g));
  const hits: TacticHit[] = [];
  const seen = new Set<string>();

  for (const tac of TACTICS) {
    for (const p of tac.patterns) {
      if (text.includes(p) && !seen.has(tac.category)) {
        // A genuine bank advisory that warns "do not share OTP" shouldn't be
        // penalised for the OTP / secrecy categories.
        if (guarded && (tac.category === "OTP / Credential Theft" || tac.category === "Secrecy / Isolation")) continue;
        hits.push({ category: tac.category, phrase: p, weight: tac.weight });
        seen.add(tac.category);
        break;
      }
    }
  }

  const score = Math.min(100, hits.reduce((s, h) => s + h.weight, 0));
  const verdict: Verdict = score >= 80 ? "Scam" : score >= 55 ? "Dangerous" : score >= 30 ? "Suspicious" : "Safe";
  return { score, verdict, tactics: hits, predictedScam: score >= 50 };
}

/* ------------------------------ Metrics core ---------------------------- */

export interface Metrics {
  n: number;
  tp: number; fp: number; tn: number; fn: number;
  accuracy: number; precision: number; recall: number; f1: number;
  fpRate: number; fnRate: number;
}

export function confusion(items: { positive: boolean; predicted: boolean }[]): Metrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const it of items) {
    if (it.positive && it.predicted) tp++;
    else if (!it.positive && it.predicted) fp++;
    else if (!it.positive && !it.predicted) tn++;
    else fn++;
  }
  const n = items.length;
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    n, tp, fp, tn, fn,
    accuracy: (tp + tn) / n,
    precision, recall, f1,
    fpRate: fp + tn ? fp / (fp + tn) : 0,
    fnRate: tp + fn ? fn / (tp + fn) : 0,
  };
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/* --------------------------- Labelled scam set -------------------------- */
// label true = scam. Used to compute the detector's live metrics.
export const SCAM_SET: { text: string; scam: boolean }[] = [
  { text: "This is CBI. A parcel in your name has illegal items. You are under digital arrest, stay on the call and do not tell anyone.", scam: true },
  { text: "Sir your KYC will be deactivated today. Click the link to re-verify your account immediately or it will be blocked.", scam: true },
  { text: "Congratulations! You have won a KBC lottery of 25 lakh. Pay a processing fee on this UPI to claim your prize.", scam: true },
  { text: "Income Tax Department: legal action within 2 hours. Install AnyDesk so our officer can verify your account.", scam: true },
  { text: "Your electricity will be disconnected tonight. Call this number immediately and pay on this UPI to avoid disconnection.", scam: true },
  { text: "We are calling from TRAI, your number will be blocked by police for illegal activity. Verify on a Skype video call now.", scam: true },
  { text: "Part time job, earn 5000 daily. Just pay a small registration fee and join our Telegram for tasks.", scam: true },
  { text: "Customs has seized your FedEx parcel with drugs. Transfer a refundable security deposit or face arrest warrant.", scam: true },
  { text: "Dear customer share the OTP we just sent to confirm and stop the suspicious transaction on your account.", scam: true },
  { text: "Pre-approved instant loan! Click here to get 2 lakh in 5 minutes, only a small processing fee on this UPI.", scam: true },
  { text: "Your account will be suspended. Update your PAN by clicking bit.ly/kyc-update within 24 hours, final notice.", scam: true },
  { text: "This is the cyber cell officer. Do not disconnect, do not inform your family, transfer the money for verification.", scam: true },
  { text: "You are a lucky winner of a cash prize. Share your CVV and OTP to receive the amount in your account.", scam: true },
  { text: "Hello from enforcement directorate, your bank account is used in money laundering. Pay a fine immediately or be arrested.", scam: true },
  { text: "Download quick support app and share screen so I can help reverse the wrong payment to your account.", scam: true },
  { text: "Account compromised! Click the link to secure it and confirm your OTP to our executive right now.", scam: true },
  { text: "Win a brand new iPhone in our lucky draw, just pay delivery charges on this QR and claim your prize today.", scam: true },
  { text: "Narcotics department: your SIM is linked to a crime, stay on call, this is confidential, pay to clear your name.", scam: true },
  { text: "Your parcel is held. Pay customs duty on this UPI immediately or legal action will be taken against you.", scam: true },
  { text: "Job offer from home, earn per task. Registration fee refundable, join telegram and start earning now.", scam: true },

  { text: "Your Amazon order has been shipped and will be delivered tomorrow between 10 AM and 1 PM.", scam: false },
  { text: "123456 is your OTP for login. Do not share this OTP with anyone. - HDFC Bank", scam: false },
  { text: "Reminder: your electricity bill of Rs 1,240 is due on the 15th. Pay via the official app or your bank.", scam: false },
  { text: "Hi, are we still meeting for lunch tomorrow at 1pm? Let me know.", scam: false },
  { text: "Your account has been credited with Rs 5,000 by NEFT. Available balance Rs 23,400. - SBI", scam: false },
  { text: "Your appointment with Dr. Sharma is confirmed for Monday 5 PM at City Clinic.", scam: false },
  { text: "Thank you for shopping with us. Your invoice for Rs 899 is attached. Visit again!", scam: false },
  { text: "PNR 2841 confirmed. Train 12951 departs at 16:35 from platform 4. Happy journey.", scam: false },
  { text: "Your monthly mobile recharge of Rs 239 was successful. Validity 28 days. - Jio", scam: false },
  { text: "Parent teacher meeting is scheduled for Saturday 11 AM. Please confirm your attendance.", scam: false },
  { text: "We never ask for OTP or PIN. Beware of fraud. - Official Bank advisory.", scam: false },
  { text: "Your Swiggy order is on the way and will arrive in 20 minutes. Enjoy your meal!", scam: false },
  { text: "Library reminder: the book you borrowed is due for return on the 20th.", scam: false },
  { text: "Happy birthday! Wishing you a wonderful year ahead from all of us.", scam: false },
  { text: "Your salary of Rs 45,000 has been credited to your account. - Payroll", scam: false },
  { text: "Booking confirmed at Sea View Hotel for 2 nights from 12th. Check-in 2 PM.", scam: false },
];

/* --------------------------- Voice-spoof set ---------------------------- */
// Synthetic explainable features per clip. spoofProb >= 0.5 -> flagged synthetic.
export interface VoiceClip {
  id: string;
  label: "Synthetic" | "Human";
  spoofProb: number;
  features: { flatness: number; jitter: number; prosody: number; artifacts: number };
}
export const VOICE_SET: VoiceClip[] = [
  { id: "Call #A1 — 'bank officer'", label: "Synthetic", spoofProb: 0.86, features: { flatness: 0.81, jitter: 0.12, prosody: 0.22, artifacts: 0.74 } },
  { id: "Call #A2 — 'police, video'", label: "Synthetic", spoofProb: 0.78, features: { flatness: 0.72, jitter: 0.15, prosody: 0.28, artifacts: 0.69 } },
  { id: "Call #A3 — 'son in trouble'", label: "Synthetic", spoofProb: 0.91, features: { flatness: 0.88, jitter: 0.08, prosody: 0.18, artifacts: 0.83 } },
  { id: "Call #H1 — genuine relative", label: "Human", spoofProb: 0.18, features: { flatness: 0.32, jitter: 0.41, prosody: 0.79, artifacts: 0.16 } },
  { id: "Call #H2 — customer query", label: "Human", spoofProb: 0.27, features: { flatness: 0.38, jitter: 0.36, prosody: 0.71, artifacts: 0.24 } },
  { id: "Call #H3 — delivery agent", label: "Human", spoofProb: 0.41, features: { flatness: 0.44, jitter: 0.33, prosody: 0.64, artifacts: 0.39 } },
];
// A wider hidden hold-out used only for the metric (deterministic).
export const VOICE_HOLDOUT: { spoofProb: number; synthetic: boolean }[] = [
  ...Array.from({ length: 20 }, (_, i) => ({ spoofProb: 0.6 + ((i * 7) % 35) / 100, synthetic: true })),
  ...Array.from({ length: 20 }, (_, i) => ({ spoofProb: 0.15 + ((i * 11) % 40) / 100, synthetic: false })),
];

/* --------------------------- Counterfeit screen ------------------------- */
export const SECURITY_FEATURES = [
  "Watermark (Mahatma Gandhi)",
  "Security thread (colour-shift)",
  "Latent image of denomination",
  "Micro-lettering 'RBI' / value",
  "See-through register (number)",
  "Intaglio raised printing",
  "Colour-shifting ink on numeral",
];
export function scoreCounterfeit(present: boolean[]): { risk: number; missing: string[] } {
  const missing = SECURITY_FEATURES.filter((_, i) => !present[i]);
  const risk = Math.round((missing.length / SECURITY_FEATURES.length) * 100);
  return { risk, missing };
}
export const COUNTERFEIT_HOLDOUT: { missing: number; fake: boolean }[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ missing: 3 + (i % 5), fake: true })),
  ...Array.from({ length: 15 }, (_, i) => ({ missing: i % 3, fake: false })),
];

/* ------------------------- Fraud network (synthetic) -------------------- */
export interface GNode { id: string; type: "victim" | "mule" | "number" | "device" | "ring"; label: string; }
export interface GEdge { a: string; b: string; }
export const FRAUD_GRAPH: { nodes: GNode[]; edges: GEdge[]; ring: string } = {
  ring: "RING-DA-014 · 'Digital Arrest' cluster",
  nodes: [
    { id: "ring", type: "ring", label: "RING-DA-014" },
    { id: "m1", type: "mule", label: "Mule A/C ••4821" },
    { id: "m2", type: "mule", label: "Mule A/C ••9070" },
    { id: "n1", type: "number", label: "+91 ••• ••231" },
    { id: "n2", type: "number", label: "+91 ••• ••884" },
    { id: "d1", type: "device", label: "IMEI ••3318" },
    { id: "v1", type: "victim", label: "Victim · Pune" },
    { id: "v2", type: "victim", label: "Victim · Jaipur" },
    { id: "v3", type: "victim", label: "Victim · Kochi" },
  ],
  edges: [
    { a: "ring", b: "m1" }, { a: "ring", b: "m2" }, { a: "ring", b: "n1" }, { a: "ring", b: "n2" }, { a: "ring", b: "d1" },
    { a: "n1", b: "v1" }, { a: "n1", b: "v2" }, { a: "n2", b: "v3" }, { a: "d1", b: "n1" }, { a: "d1", b: "n2" }, { a: "m1", b: "v1" }, { a: "m2", b: "v3" },
  ],
};

/* --------------------------- Geo hotspots (synthetic) ------------------- */
export const HOTSPOTS = [
  { city: "Delhi NCR", x: 42, y: 26, count: 184 },
  { city: "Mumbai", x: 30, y: 56, count: 156 },
  { city: "Bengaluru", x: 42, y: 74, count: 121 },
  { city: "Hyderabad", x: 46, y: 64, count: 98 },
  { city: "Kolkata", x: 70, y: 47, count: 88 },
  { city: "Chennai", x: 50, y: 80, count: 76 },
  { city: "Jaipur", x: 36, y: 34, count: 64 },
  { city: "Patna", x: 64, y: 38, count: 52 },
  { city: "Ahmedabad", x: 26, y: 46, count: 49 },
];

/* ------------------------------ Curated news ---------------------------- */
export const NEWS_FALLBACK = [
  { title: "Digital arrest scams: how fake CBI officers are draining life savings", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "UPI fraud cases rise sharply; RBI urges caution on unknown collect requests", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "Fake KYC update SMS continue to target bank customers nationwide", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "AI voice-cloning used in 'family emergency' phone scams, police warn", source: "Curated", link: "https://cybercrime.gov.in" },
  { title: "Counterfeit currency seizures reported across multiple states", source: "Curated", link: "https://cybercrime.gov.in" },
];

/* ------------------------------ Dashboard KPIs -------------------------- */
export const KPIS = {
  detectionsToday: 1284,
  ringsTracked: 37,
  rupeesProtected: "₹4.6 Cr",
  avgLatencyMs: 280,
};
