import type { Employee } from "./api";

/* Hindi display strings for the AI-Workforce employees. The employee catalog comes
 * from the server in English; this maps each employee id → Hindi for the fields the
 * UI shows (short role, full title, sector/sub-sector badges, tagline). Names stay
 * as-is. Use wfLoc(e, isHi) to get the right fields for the current language. */
export interface WfLoc { name: string; title: string; short: string; sector: string; subSector: string; tagline: string }

const HI: Record<string, WfLoc> = {
  finance: {
    name: "विट्टा", title: "MSME वित्त एवं योजना सलाहकार", short: "वित्त एवं योजनाएँ",
    sector: "MSME अनिवार्य", subSector: "ऋण · योजनाएँ · सब्सिडी",
    tagline: "सही ऋण और योजना (मुद्रा, PMEGP, CGTMSE) दिलाता है और प्रोजेक्ट रिपोर्ट बनाता है।",
  },
  receivables: {
    name: "रिजुल", title: "प्राप्य एवं MSME समाधान", short: "प्राप्य एवं समाधान",
    sector: "MSME अनिवार्य", subSector: "विलंबित भुगतान · MSMED अधिनियम",
    tagline: "45-दिन नियम के तहत बकाया वसूलता है — समाधान फाइलिंग, ब्याज, नोटिस।",
  },
  accounts: {
    name: "मीरा", title: "अकाउंट्स, GST एवं e-इनवॉइसिंग", short: "अकाउंट्स, GST एवं e-इनवॉइसिंग",
    sector: "MSME अनिवार्य", subSector: "GST · e-इनवॉइस · टैली",
    tagline: "GST इनवॉइस (→ टैली XML), e-इनवॉइस IRN, e-वे बिल, रिकंसिलिएशन।",
  },
  enviro: {
    name: "पृथ्वी", title: "पर्यावरण एवं प्रदूषण-नियंत्रण अनुपालन", short: "पर्यावरण, जल एवं स्वच्छता",
    sector: "पर्यावरण एवं जल", subSector: "पर्यावरण, वन, जल एवं स्वच्छता",
    tagline: "CPCB श्रेणी, CTE/CTO फाइलिंग, EPR, ZLD एवं हरित सब्सिडी।",
  },
  food: {
    name: "अन्ना", title: "खाद्य सुरक्षा, FSSAI एवं PMFME", short: "खाद्य, पेय एवं FMCG",
    sector: "खाद्य एवं FMCG", subSector: "खाद्य, पेय, FMCG, उपभोक्ता वस्तुएँ",
    tagline: "FSSAI श्रेणी एवं लाइसेंस, अनुपालन लेबल, HACCP, और PMFME 35% सब्सिडी।",
  },
  build: {
    name: "देवराज", title: "निर्माण, RERA एवं BOQ", short: "अवसंरचना एवं निर्माण",
    sector: "अवसंरचना एवं निर्माण", subSector: "अवसंरचना, निर्माण, आवास",
    tagline: "BOQ अनुमान, RERA अनुपालन, BOCW श्रम उपकर एवं साइट-सुरक्षा योजनाएँ।",
  },
  electronics: {
    name: "तारा", title: "इलेक्ट्रॉनिक्स, IT एवं टेलीकॉम अनुपालन", short: "इलेक्ट्रॉनिक्स, IT एवं टेलीकॉम",
    sector: "इलेक्ट्रॉनिक्स, IT एवं टेलीकॉम", subSector: "IT, ITES, इलेक्ट्रॉनिक्स, व्हाइट गुड्स, टेलीकॉम",
    tagline: "BIS-CRS, ई-कचरा EPR, DPDP अधिनियम 2023, WPC/ETA एवं हार्डवेयर PLI।",
  },
  mobility: {
    name: "कबीर", title: "ऑटो, EV एवं इंजीनियरिंग अनुपालन", short: "धातु, मशीनरी एवं मोबिलिटी",
    sector: "धातु, मशीनरी एवं मोबिलिटी", subSector: "धातु, मशीनरी, ऑटो, EV, रेल, विमानन, UAV",
    tagline: "ARAI/AIS होमोलोगेशन, FAME-II/EV सब्सिडी, PLI-ऑटो, GeM एवं BIS गुणवत्ता।",
  },
};

/** Return the employee's display fields for the current language (Hindi or the English original). */
export function wfLoc(e: Pick<Employee, "id" | "name" | "title" | "short" | "sector" | "subSector" | "tagline">, isHi: boolean): WfLoc {
  const en: WfLoc = { name: e.name, title: e.title, short: e.short, sector: e.sector, subSector: e.subSector, tagline: e.tagline };
  return isHi && HI[e.id] ? HI[e.id] : en;
}
