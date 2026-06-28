import { FeatureKey } from "./api";

/**
 * Instant, offline keyword classifier — maps a free-text problem to the best
 * agent. Used as a fallback (and warm-start) for the chat router so triage
 * always works even without the Gemini key. English + Hindi cues.
 */
const KEYWORDS: Record<string, string[]> = {
  kavach: ["scam", "fraud", "otp", "lottery", "kyc", "arrest", "cyber", "phishing", "suspicious", "fake", "blackmail", "ठगी", "धोखा", "फ्रॉड", "ओटीपी", "संदिग्ध"],
  samajh: ["document", "bill", "notice", "letter", "policy", "contract", "agreement", "statement", "understand", "explain", "meaning", "दस्तावेज़", "बिल", "नोटिस", "चिट्ठी", "समझ"],
  haq: ["scheme", "yojana", "benefit", "subsidy", "pension", "welfare", "eligible", "ration", "scholarship", "योजना", "सब्सिडी", "पेंशन", "हक़", "राशन"],
  sehat: ["medicine", "prescription", "doctor", "health", "symptom", "fever", "generic", "pharmacy", "sick", "tablet", "दवा", "पर्ची", "सेहत", "बुखार", "बीमार"],
  paisa: ["money", "budget", "spend", "saving", "expense", "loan", "emi", "subscription", "salary spend", "finance", "पैसा", "बजट", "खर्च", "बचत", "लोन"],
  kar: ["tax", "income tax", "form-16", "form 16", "itr", "regime", "refund", "tds", "capital gain", "टैक्स", "इनकम टैक्स", "रिटर्न", "रिफंड"],
  samay: ["task", "deadline", "schedule", "plan", "productivity", "todo", "assignment", "meeting", "exam", "time", "काम", "डेडलाइन", "शेड्यूल", "योजना", "परीक्षा"],
  setu: ["complaint", "refund", "consumer", "faulty", "denied", "civic", "water supply", "electricity", "grievance", "rights", "शिकायत", "उपभोक्ता", "अधिकार", "रिफंड"],
  krishi: ["crop", "farm", "pest", "disease", "soil", "kisan", "harvest", "fertilizer", "plant", "agriculture", "फसल", "खेत", "कीट", "किसान", "खाद"],
  raahat: ["flood", "wildfire", "fire", "cyclone", "disaster", "evacuate", "rescue", "earthquake", "relief", "storm", "heatwave", "landslide", "बाढ़", "आपदा", "चक्रवात", "राहत", "भूकंप"],
  disha: ["job", "jobs", "resume", "résumé", "cv", "interview", "career", "hiring", "hire", "internship", "salary", "fresher", "vacancy", "naukri", "नौकरी", "रिज्यूमे", "रेज़्यूमे", "इंटरव्यू", "करियर"],
};

export function routeToAgent(text: string): FeatureKey | null {
  const s = text.toLowerCase();
  let best: FeatureKey | null = null;
  let bestScore = 0;
  for (const [key, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) if (s.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = key as FeatureKey;
    }
  }
  return bestScore > 0 ? best : null;
}

export const AGENT_KEYS: FeatureKey[] = ["kavach", "samajh", "haq", "sehat", "paisa", "kar", "samay", "setu", "krishi", "raahat", "disha"];
