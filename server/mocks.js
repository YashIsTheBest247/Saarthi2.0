/**
 * Demo-safe canned responses. Used only when GEMINI_API_KEY is missing
 * or a live call fails, so the product always works on stage.
 * Each carries `_mock: true` so the UI can show a subtle "sample" badge.
 */

export const mocks = {
  kavach: {
    _mock: true,
    riskScore: 94,
    verdict: "Scam",
    category: "Digital Arrest Scam",
    headline: "यह एक खतरनाक धोखाधड़ी है — किसी भी पैसे का भुगतान न करें।",
    summary:
      "This message pretends to be from the police/CBI and threatens arrest unless you pay or share details. Real agencies never arrest you over a video call or ask for money on UPI.",
    redFlags: [
      { flag: "Threat of immediate arrest", explanation: "Creates panic so you act without thinking. No genuine officer works this way." },
      { flag: "Asks to keep it secret", explanation: "Scammers isolate victims so no family member can warn them." },
      { flag: "Demands money via UPI / gift cards", explanation: "Courts and police never collect fines through UPI or QR codes." },
    ],
    safeActions: [
      "Cut the call. Do not share OTP, Aadhaar or bank details.",
      "Do not install any app like AnyDesk or TeamViewer.",
      "Verify by calling the official number from the real website yourself.",
    ],
    ifVictim: [
      "Call 1930 (cyber helpline) immediately — the first hours matter most.",
      "Report at cybercrime.gov.in and inform your bank to freeze the transaction.",
    ],
    helpline: "1930 · cybercrime.gov.in",
  },

  samajh: {
    _mock: true,
    title: "Hospital Bill — Inpatient Charges",
    docType: "Medical Bill",
    summary:
      "This is a hospital bill for a 2-day admission. The total payable is ₹48,200, but a few line items look duplicated and one charge may be claimable from your insurance.",
    keyPoints: [
      "Admission: 2 days (room + nursing).",
      "Total billed: ₹48,200; advance paid: ₹20,000; balance due: ₹28,200.",
      "Insurance TPA approval number is missing on this copy.",
    ],
    amounts: [
      { label: "Total billed", value: "₹48,200" },
      { label: "Balance due", value: "₹28,200" },
      { label: "Payment deadline", value: "On discharge" },
    ],
    actionItems: [
      { task: "Ask the billing desk to remove the duplicated 'consumables' line", deadline: "Before payment" },
      { task: "Get the TPA/insurance approval number added to the bill", deadline: "Today" },
    ],
    watchOuts: [
      "'Consumables' is charged twice (₹1,200 each) — query this.",
      "Service charge of 5% on medicines is unusual — ask for a breakup.",
    ],
    jargon: [
      { term: "TPA", meaning: "Third Party Administrator — the company that processes your insurance claim." },
      { term: "Consumables", meaning: "Small use-and-throw items like gloves, syringes, cotton." },
    ],
  },

  haq: {
    _mock: true,
    summary: "Based on your profile, you likely qualify for at least 6 schemes — here are the strongest matches.",
    schemes: [
      {
        name: "PM-KISAN Samman Nidhi",
        level: "Central",
        category: "Income support",
        benefit: "₹6,000 per year in 3 instalments, directly to your bank account.",
        whyYouQualify: "You are a land-holding farmer — the core eligibility for PM-KISAN.",
        howToApply: ["Visit pmkisan.gov.in → 'New Farmer Registration'", "Enter Aadhaar & land details", "Verify at your local CSC if needed"],
        documents: ["Aadhaar", "Land records", "Bank passbook"],
        officialLink: "pmkisan.gov.in",
        confidence: "High",
      },
      {
        name: "Ayushman Bharat (PM-JAY)",
        level: "Central",
        category: "Health",
        benefit: "Free hospital treatment up to ₹5 lakh per family per year.",
        whyYouQualify: "Your household income falls within the PM-JAY beneficiary criteria.",
        howToApply: ["Check eligibility on pmjay.gov.in", "Visit a nearby empanelled hospital or CSC", "Get your Ayushman card made"],
        documents: ["Aadhaar", "Ration card"],
        officialLink: "pmjay.gov.in",
        confidence: "Likely",
      },
      {
        name: "Atal Pension Yojana",
        level: "Central",
        category: "Pension",
        benefit: "Guaranteed pension of ₹1,000–₹5,000/month after age 60.",
        whyYouQualify: "You are aged 18–40 and in the unorganised sector.",
        howToApply: ["Ask your bank to open an APY account", "Choose pension amount & auto-debit"],
        documents: ["Aadhaar", "Bank account"],
        officialLink: "npscra.nsdl.co.in",
        confidence: "High",
      },
    ],
  },

  sehat: {
    _mock: true,
    mode: "prescription",
    summary: "Your prescription has 2 medicines. Switching to generics could save you about ₹540 a month.",
    medicines: [
      {
        brandName: "Glycomet 500",
        genericName: "Metformin 500 mg",
        purpose: "Controls blood sugar in type-2 diabetes.",
        howToTake: "Usually with or after meals — follow your doctor's timing.",
        estBrandPrice: "~₹120 / strip",
        estGenericPrice: "~₹18 / strip",
        savingsNote: "Same salt (Metformin). Generic saves ~85%.",
      },
      {
        brandName: "Ecosprin 75",
        genericName: "Aspirin 75 mg",
        purpose: "Keeps blood thin to protect the heart.",
        howToTake: "Once daily, usually after dinner.",
        estBrandPrice: "~₹12 / strip",
        estGenericPrice: "~₹6 / strip",
        savingsNote: "Available at Jan Aushadhi Kendra cheaply.",
      },
    ],
    janAushadhiNote:
      "Pradhan Mantri Jan Aushadhi Kendras sell the same-quality generic medicines at much lower prices. Find your nearest one at janaushadhi.gov.in.",
    whenToSeeDoctor: [
      "Never stop or switch a medicine without telling your doctor.",
      "See a doctor if blood sugar stays high, or you feel dizzy/breathless.",
    ],
    disclaimer: "Asha is not a doctor. This is general information — confirm any change with your doctor or pharmacist. Prices are rough estimates.",
  },

  setu: {
    _mock: true,
    summary: "You have a strong case under the Consumer Protection Act. Here's your complaint and exactly how to escalate it.",
    authority: "Start with the seller's grievance cell, then the National Consumer Helpline (1915). If unresolved, the District Consumer Disputes Redressal Commission — your purchase qualifies.",
    draftComplaint:
      "To,\nThe Grievance Officer,\n[Seller / Company Name]\n\nSubject: Complaint regarding a defective product and refusal of refund — Order [Order Number]\n\nRespected Sir/Madam,\n\nI, [Your Name], purchased [Product] on [Date] for ₹[Amount] (Order [Order Number]). The product was delivered in a damaged/defective condition. Despite my request on [Date], a refund/replacement has been refused.\n\nThis is a deficiency in service and sale of defective goods under the Consumer Protection Act, 2019. I request a full refund/replacement within 7 days, failing which I will approach the National Consumer Helpline and the Consumer Commission.\n\nI am attaching the invoice and photos of the defect.\n\nYours sincerely,\n[Your Name] · [Phone] · [Date]",
    yourRights: [
      "Under the Consumer Protection Act 2019, you have the right to a refund or replacement for defective goods.",
      "You can claim compensation for deficiency in service.",
    ],
    escalation: [
      { step: "1. Seller's grievance cell", where: "Email/portal of the company — give 7 days" },
      { step: "2. National Consumer Helpline", where: "Call 1915 or file at consumerhelpline.gov.in" },
      { step: "3. District Consumer Commission", where: "File at edaakhil.nic.in (online consumer case)" },
      { step: "4. RTI (if a govt body)", where: "Ask for records via rtionline.gov.in" },
    ],
    portals: [
      { name: "National Consumer Helpline", link: "consumerhelpline.gov.in · 1915" },
      { name: "e-Daakhil (consumer case)", link: "edaakhil.nic.in" },
      { name: "CPGRAMS (govt grievances)", link: "pgportal.gov.in" },
    ],
    followUp: ["Note the complaint/docket number you receive.", "Keep all screenshots, bills and chats together.", "Escalate to the next step if there's no reply in the stated time."],
  },

  paisa: {
    _mock: true,
    summary: "You spent about ₹19,650 this month. With a few easy cuts, you could save roughly ₹2,800 every month.",
    totals: [
      { label: "Total spent", value: "₹19,650" },
      { label: "Biggest category", value: "Food & delivery" },
      { label: "Possible saving", value: "₹2,800/mo" },
    ],
    breakdown: [
      { category: "Food & delivery", amount: "₹5,400", note: "18 orders — eating out is your top spend" },
      { category: "Subscriptions", amount: "₹1,290", note: "Netflix, Spotify, 2 unused apps" },
      { category: "Rent & bills", amount: "₹9,800", note: "Essential" },
      { category: "Shopping", amount: "₹3,160", note: "Mostly impulse buys" },
    ],
    leaks: [
      "₹600/mo on 2 subscriptions you haven't opened in 30 days — cancel them.",
      "Food delivery 18× this month — cooking 8 of those saves ~₹1,600.",
      "Two late-payment fees of ₹300 — set autopay to avoid them.",
    ],
    dues: [
      { item: "Credit card bill", due: "5th — set autopay" },
      { item: "Electricity bill", due: "12th" },
    ],
    plan: [
      "Cancel the 2 unused subscriptions today (₹600 saved).",
      "Set a weekly food-delivery limit of ₹800.",
      "Auto-transfer ₹2,000 to savings on salary day (pay yourself first).",
      "Turn on autopay for bills to kill late fees.",
    ],
    savingEstimate: "≈ ₹2,800 / month",
  },

  krishi: {
    _mock: true,
    summary: "The yellow spots with dark edges most likely point to early blight on your tomato crop — treatable if you act now.",
    diagnosis: "Early blight (Alternaria) — a common fungal disease in tomato, worsened by humidity.",
    severity: "Medium",
    actionPlan: [
      { step: "Remove and destroy affected lower leaves to stop spread", when: "Today" },
      { step: "Organic: spray neem oil (5 ml/litre) early morning, repeat in 7 days", when: "This week" },
      { step: "Chemical (if severe): Mancozeb as per label dosage — read instructions and wear gloves", when: "If it spreads" },
      { step: "Avoid overhead watering; water at the base to keep leaves dry", when: "Ongoing" },
    ],
    prevention: ["Rotate crops each season", "Space plants for airflow", "Use disease-resistant varieties next sowing"],
    schemes: [
      "PMFBY (Pradhan Mantri Fasal Bima Yojana) — crop insurance against loss",
      "Soil Health Card — free soil testing for the right nutrients",
      "Kisan Credit Card — low-interest credit for inputs",
    ],
    advisory: ["Check the 3-day forecast — avoid spraying before rain.", "Visit your nearest Krishi Vigyan Kendra (KVK) for a free check."],
    disclaimer: "Bhupati gives general guidance. Please confirm with your local KVK or agriculture officer before using any chemical.",
  },

  samay: {
    _mock: true,
    summary: "You have 5 commitments — 2 are urgent. Here's a plan that gets everything done before each deadline.",
    topPriority: "Start the Physics assignment now — it's due tomorrow 5 PM and needs ~3 hours, the tightest deadline you have.",
    tasks: [
      {
        title: "Physics assignment (Ch. 5 problems)",
        deadline: "Tomorrow, 5:00 PM",
        priority: "High",
        estimate: "3 hrs",
        category: "Studies",
        why: "Shortest deadline and graded.",
        firstStep: "Open the problem set and finish the first 3 questions in a 45-min sprint.",
        draft: "Outline:\n1. List formulae for Ch.5\n2. Solve Q1–Q5 (kinematics)\n3. Solve Q6–Q10 (forces)\n4. Re-check units & final answers",
      },
      {
        title: "Prepare sales deck for Monday meeting",
        deadline: "Sunday night",
        priority: "High",
        estimate: "2.5 hrs",
        category: "Work",
        why: "Client-facing and fixed meeting date.",
        firstStep: "Draft the 5 key slides: Problem, Solution, Demo, Pricing, Next steps.",
        draft: "Slide outline:\n• Title\n• The problem (1 stat)\n• Our solution\n• Live demo\n• Pricing\n• Why now + next steps",
      },
      {
        title: "Pay rent",
        deadline: "5th of the month",
        priority: "Medium",
        estimate: "10 min",
        category: "Personal",
        why: "Fixed date, avoids late fee.",
        firstStep: "Set a UPI autopay or transfer now so it's off your plate.",
      },
      {
        title: "Mom's birthday gift",
        deadline: "Sunday",
        priority: "Medium",
        estimate: "30 min",
        category: "Personal",
        why: "Meaningful and time-bound.",
        firstStep: "Order a gift online today so it arrives in time.",
      },
    ],
    schedule: [
      { block: "Today, 4:00–7:00 PM", task: "Physics assignment", focus: "Finish all Ch.5 problems in two focus sprints." },
      { block: "Today, 8:00–8:15 PM", task: "Pay rent + order gift", focus: "Knock out both quick personal tasks." },
      { block: "Saturday, 11 AM–1:30 PM", task: "Sales deck", focus: "Build the 6 core slides from the outline." },
      { block: "Sunday, 5–6 PM", task: "Sales deck polish", focus: "Rehearse and tighten the demo flow." },
    ],
  },

  kar: {
    _mock: true,
    summary: "On a ₹15,00,000 salary under the new regime, your taxable income is ₹14,25,000. Your total tax works out to about ₹97,500 — so with ₹50,000 TDS already paid, around ₹47,500 is still payable.",
    answer: "Most classic deductions (80C, HRA) don't apply in the new regime, but you still have a few legitimate levers — the biggest is your employer's NPS contribution.",
    tips: [
      "Ask your employer to route part of your CTC as NPS u/s 80CCD(2) — it's deductible even in the new regime.",
      "Compare the old regime: if you have large HRA, 80C and home-loan interest, it may save more.",
      "Check your TDS in AIS / Form 26AS so you claim full credit and avoid a notice.",
      "File before the due date (usually 31 July) and keep your capital-gains statements handy.",
    ],
    regimeHint: "With few deductions, the new regime is usually better up to ~₹12L. Above that, compare both regimes if you have significant HRA/80C/home-loan.",
    disclaimer: "Lekh gives general guidance for FY 2025-26 and is not a substitute for a chartered accountant.",
  },

  raahat: {
    _mock: true,
    summary:
      "Three days of intense rain over the upper catchment have pushed the Brahmaputra near its danger mark. Satellite imagery shows growing inundation in low-lying wards, and local posts report water entering homes in the eastern belt. Flood risk is High and rising over the next 24–48 hours.",
    overallLevel: "High",
    hazards: [
      { type: "Flood", level: "Severe", window: "next 24-48 hrs", rationale: "River at/above danger level + saturated soil + continued IMD rain warning; satellite shows expanding water extent." },
      { type: "Landslide", level: "Moderate", window: "next 72 hrs", rationale: "Saturated hill slopes around the catchment raise slip risk along highway cuttings." },
    ],
    immediateActions: [
      "Move residents from low-lying eastern wards to higher-ground shelters before nightfall.",
      "Stop vehicle movement on the riverside road and any submerged crossings.",
      "Pre-position NDRF boats and pumps at the two worst-hit wards.",
      "Broadcast alerts in local language via community radio and WhatsApp groups.",
    ],
    safeRoutes: [
      "Use the NH ring-road (higher elevation) for evacuation — avoid the riverside arterial which is flooding.",
      "Nearest shelters: government school (Ward 12) and the community hall (Ward 9), both above the flood line.",
      "Do not cross causeways where water is over the road — even shallow flow can sweep a person.",
    ],
    resourcePlan: [
      "Allocate ~60% of boats and medics to the eastern wards (highest affected population × severity).",
      "Send food kits and clean-water units to the two largest shelters first.",
      "Keep a medical reserve for snakebite and waterborne illness, which spike after floods.",
    ],
    vulnerableGroups: [
      "Elderly and bed-ridden residents in kuccha homes near the bank.",
      "Children and pregnant women in the inundated eastern belt.",
      "Livestock-dependent families — plan cattle evacuation too.",
    ],
    advisory: "Follow NDMA helpline 1078 and emergency 112. Track IMD warnings at mausam.imd.gov.in and obey your State Disaster Management Authority's orders.",
    disclaimer: "Narayan is decision-support, not an official warning. Always follow NDMA / SDMA / local administration instructions.",
  },

  disha: {
    _mock: true,
    summary: "Here's a tighter, job-ready version of your profile and where to apply next.",
    output: "RAHUL SHARMA\nCustomer Success Associate · Pune\n\nSUMMARY\nResults-driven professional with 2+ years in B2B sales, moving into customer success. Strong at relationship-building, retention and turning churn risk into renewals.\n\nEXPERIENCE\nSales Executive — [Company], Pune (2023–present)\n• Managed a 60-account portfolio; grew renewals by [X]%.\n• Cut response time by setting up a simple follow-up cadence.\n\nSKILLS\nCRM (HubSpot), account management, onboarding, upselling, communication.\n\nEDUCATION\n[Degree], [University].",
    highlights: [
      "Reframe sales wins as retention/renewal outcomes — exactly what CS roles want.",
      "Quantify impact: add real numbers for renewals, accounts, response time.",
    ],
    whereToLook: [
      "Redrob — AI-matched roles to your profile.",
      "Apna and LinkedIn for customer-success openings in Pune.",
      "National Career Service (ncs.gov.in) and company career pages.",
    ],
    tips: [
      "Tailor the summary line to each job description's keywords.",
      "Prepare 3 STAR stories: a save, an upsell, and a tough customer.",
    ],
  },

  resume: {
    _mock: true,
    role: "Customer Success Associate",
    keywords: ["customer success", "retention", "onboarding", "CRM", "renewals"],
    notes: [
      "Re-angled sales bullets toward retention & renewals to match the JD.",
      "Add a free GEMINI_API_KEY for live, JD-specific tailoring.",
    ],
    tex: "% Sample (mock) output — set GEMINI_API_KEY for real tailoring.\n% Your edited résumé is returned tailored to the job description here.",
  },

  extract: {
    _mock: true,
    text: "[Sample] Add a GEMINI_API_KEY to extract the real text from your uploaded résumé PDF here.",
  },

  route: {
    _mock: true,
    agent: "samajh",
    reason: "Let's start by understanding the details — Vidya can break this down for you.",
  },

  emergency: {
    _mock: true,
    headline: "Take a breath — this can still be handled, and you're not alone.",
    severity: "Act now",
    immediateSteps: [
      { step: "Stop any further loss", detail: "Don't pay, share, or sign anything more until you've acted on the steps below.", window: "right now" },
      { step: "Report it on the official channel", detail: "Use the helpline/portal listed below — reporting fast gives the best chance of recovery.", window: "within the golden hour" },
      { step: "Preserve evidence", detail: "Keep screenshots, messages, receipts and reference numbers together in one place.", window: "today" },
      { step: "Inform the people who can freeze/act", detail: "Your bank, the authority, or the company — tell them in writing and note the complaint number.", window: "today" },
    ],
    contacts: [
      { name: "National Emergency", contact: "112", why: "For any immediate danger to life or safety." },
      { name: "Cyber Fraud Helpline", contact: "1930 · cybercrime.gov.in", why: "To report online fraud and try to freeze the transaction." },
      { name: "Tele-MANAS (mental health)", contact: "14416", why: "If the stress feels overwhelming — free, confidential, 24×7." },
    ],
    whatToSay: "Namaste, I need to report an urgent issue. Here is what happened: [brief facts, date, amount, reference number]. Please register my complaint and share the complaint/reference number.",
    whatSaarthiDoes: [
      "Draft your complaint/report so it's ready to send.",
      "Point you to the exact office, portal or helpline for your case.",
      "Walk you through each step and what to expect next.",
    ],
    reassurance: "Acting quickly matters far more than acting perfectly. Take the first step now — Saarthi will guide the rest.",
  },

  assist: {
    _mock: true,
    agent: "samajh",
    agentName: "Vidya",
    reply: "I can help with that. Tell me a bit more — what exactly happened, and any amount, date or reference number? Meanwhile: never share OTPs or passwords, and if money was lost to fraud call 1930 immediately. Open the Saarthi app and I'll guide you step by step.",
  },

  form16: {
    _mock: true,
    grossSalary: 1500000,
    tds: 50000,
    otherIncome: 0,
    employerNps: 0,
    note: "Parsed from a sample Form-16.",
  },

  manager: {
    _mock: true,
    canDelegate: true,
    agent: "setu",
    agentName: "Adhrit",
    status: "Completed",
    reason: "This needs a written draft — Adhrit handles letters & emails.",
    deliverable:
      "Subject: Following up on my project query\n\nDear Professor,\n\nI hope you're well. I'm writing to follow up on the project we discussed. Could you please confirm the expected scope and the submission deadline? I want to make sure I'm aligned before I proceed.\n\nThank you for your time and guidance.\n\nWarm regards,\n[Your name]",
  },
};
