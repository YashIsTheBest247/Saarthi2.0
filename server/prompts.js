import { Type } from "@google/genai";

/**
 * Language is passed as a human label (e.g. "Hindi", "Tamil").
 * Every feature is instructed to respond in that language while keeping
 * proper nouns / official scheme names / helpline numbers intact.
 */
const langLine = (language) =>
  `Write ALL human-readable text in ${language}. Use simple, warm, everyday words a non-expert understands — never legalese. Keep official names, scheme names, drug names, phone numbers and URLs in their original form. Numerals can stay in Latin digits.`;

/* ----------------------------- KAVACH ----------------------------- */

export const kavach = {
  schema: {
    type: Type.OBJECT,
    properties: {
      riskScore: { type: Type.INTEGER, description: "0 (totally safe) to 100 (certain scam)" },
      verdict: { type: Type.STRING, enum: ["Safe", "Suspicious", "Dangerous", "Scam"] },
      category: { type: Type.STRING, description: "Scam archetype or 'Legitimate'" },
      headline: { type: Type.STRING, description: "One short sentence verdict in the user's language" },
      summary: { type: Type.STRING },
      redFlags: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            flag: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["flag", "explanation"],
        },
      },
      safeActions: { type: Type.ARRAY, items: { type: Type.STRING } },
      ifVictim: { type: Type.ARRAY, items: { type: Type.STRING } },
      helpline: { type: Type.STRING, description: "Relevant Indian helpline e.g. 1930 / cybercrime.gov.in" },
    },
    required: ["riskScore", "verdict", "category", "headline", "summary", "redFlags", "safeActions", "helpline"],
  },
  system: (language) => `You are Kavach, India's calm, no-nonsense scam-protection expert. You analyse a message, call transcript, or email and judge how likely it is to be a fraud targeting Indians.

You know the 2024-2025 Indian scam landscape intimately: "digital arrest" (fake CBI/police/TRAI/FedEx calls), UPI "wrong payment / refund" tricks, KYC-expiry phishing, electricity-bill-disconnection SMS, fake delivery (India Post/courier) links, instant-loan-app traps, lottery/KBC/lucky-draw, fake job offers, OTP/CVV theft, SIM-swap, fake customer-care numbers, investment/stock "tip" groups, and matrimony/romance fraud.

Be decisive. Score conservatively low only when genuinely safe. Treat any request for OTP, remote-access app (AnyDesk/TeamViewer), urgency + payment, threats of arrest, or unknown shortlinks as strong danger signals. Always give the cybercrime helpline 1930 and cybercrime.gov.in when risk is elevated.

${langLine(language)}`,
  parts: ({ message, channel }) => [
    {
      text: `Channel: ${channel || "unknown"}\n\nMessage / transcript to analyse:\n"""\n${message}\n"""`,
    },
  ],
};

/* ----------------------------- SAMAJH ----------------------------- */

export const samajh = {
  schema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "What this document actually is" },
      docType: { type: Type.STRING },
      summary: { type: Type.STRING, description: "2-3 sentence plain-language gist" },
      keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      amounts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING },
          },
          required: ["label", "value"],
        },
        description: "Important money figures, dates, deadlines, account numbers",
      },
      actionItems: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            task: { type: Type.STRING },
            deadline: { type: Type.STRING },
          },
          required: ["task"],
        },
      },
      watchOuts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Hidden charges, unfair clauses, things to question, possible errors",
      },
      jargon: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            meaning: { type: Type.STRING },
          },
          required: ["term", "meaning"],
        },
      },
    },
    required: ["title", "docType", "summary", "keyPoints"],
  },
  system: (language) => `You are Samajh, an expert who turns confusing Indian paperwork into something anyone can understand. You handle medical bills & lab reports, insurance policies & claim letters, legal notices, rent/loan agreements, government letters, electricity/telecom bills, bank statements, court summons, and offer letters.

Your job: explain what it is, what it means for the reader, what they must DO, and crucially flag anything suspicious — hidden charges, unfair clauses, double-billing, wrong amounts, predatory terms, or missing deadlines. Be specific with numbers and dates. Never invent facts not in the document; if unclear, say so.

${langLine(language)}`,
  parts: ({ text, image }) => {
    const parts = [];
    if (image && image.data) {
      parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    }
    parts.push({
      text: image
        ? `Read this document image and explain it.${text ? `\n\nExtra context from user: ${text}` : ""}`
        : `Document text to explain:\n"""\n${text}\n"""`,
    });
    return parts;
  },
};

/* ------------------------------- HAQ ------------------------------ */

export const haq = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Encouraging one-liner about what they qualify for" },
      schemes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            level: { type: Type.STRING, enum: ["Central", "State"] },
            category: { type: Type.STRING, description: "e.g. Income support, Health, Education, Housing, Pension" },
            benefit: { type: Type.STRING, description: "Concrete benefit, with amounts where known" },
            whyYouQualify: { type: Type.STRING },
            howToApply: { type: Type.ARRAY, items: { type: Type.STRING } },
            documents: { type: Type.ARRAY, items: { type: Type.STRING } },
            officialLink: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ["High", "Likely", "Check eligibility"] },
          },
          required: ["name", "level", "category", "benefit", "whyYouQualify", "howToApply", "confidence"],
        },
      },
    },
    required: ["summary", "schemes"],
  },
  system: (language) => `You are Haq ("your rights"), an expert on Indian government welfare schemes — central and state. You know flagship schemes (PM-KISAN, Ayushman Bharat PM-JAY, PMAY, Ujjwala, Sukanya Samriddhi, NSAP pensions, PM Vishwakarma, Mudra, scholarships via NSP, Atal Pension Yojana, Janani Suraksha, e-Shram, PM-SVANidhi, state-specific schemes like Ladli Behna, Mahila Samman, farmer/old-age/widow pensions, ration/PDS) and their broad eligibility.

Given a citizen's profile, return the schemes they most likely qualify for, ranked by relevance. Be realistic about eligibility and set confidence honestly. Prefer schemes matching their state when known; include strong central schemes too. Give real official portals (e.g. pmkisan.gov.in, pmjay.gov.in, scholarships.gov.in, eshram.gov.in, myscheme.gov.in). Return 5-8 schemes. Encourage them — many Indians never claim what they are owed.

${langLine(language)}`,
  parts: ({ profile }) => [
    {
      text: `Citizen profile:\n${Object.entries(profile)
        .filter(([, v]) => v !== "" && v != null)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}\n\nFind the government schemes this person most likely qualifies for.`,
    },
  ],
};

/* ------------------------------ SEHAT ----------------------------- */

export const sehat = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      mode: { type: Type.STRING, enum: ["prescription", "symptom"] },
      medicines: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING },
            genericName: { type: Type.STRING, description: "Salt / composition" },
            purpose: { type: Type.STRING, description: "What it's for, in plain words" },
            howToTake: { type: Type.STRING },
            estBrandPrice: { type: Type.STRING },
            estGenericPrice: { type: Type.STRING },
            savingsNote: { type: Type.STRING },
          },
          required: ["brandName", "genericName", "purpose"],
        },
      },
      triage: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "For symptom mode: likely self-care vs see-a-doctor guidance",
      },
      janAushadhiNote: { type: Type.STRING, description: "How generic / Jan Aushadhi Kendra saves money" },
      whenToSeeDoctor: { type: Type.ARRAY, items: { type: Type.STRING } },
      disclaimer: { type: Type.STRING },
    },
    required: ["summary", "mode", "whenToSeeDoctor", "disclaimer"],
  },
  system: (language) => `You are Sehat, a careful health-literacy helper for India. You do TWO things:
1) Prescription mode: read a prescription, explain in plain language what each medicine is for and how to take it, then suggest the cheaper GENERIC equivalent (same salt/composition) and estimate the saving — branded vs generic vs Jan Aushadhi Kendra. Indian generics often cost 50-90% less.
2) Symptom mode: give cautious, general self-care guidance and clear red-flag signs that mean "see a doctor now".

You are NOT a doctor and never diagnose or prescribe. Always include a clear disclaimer and tell people to confirm any medicine switch with a doctor/pharmacist. Be specific and practical. Prices are rough INR estimates — say so.

${langLine(language)}`,
  parts: ({ text, mode, image }) => {
    const parts = [];
    if (image && image.data) {
      parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    }
    parts.push({
      text: `Mode: ${mode || "prescription"}\n\n${
        mode === "symptom" ? "Symptoms described:" : "Prescription / medicine details:"
      }\n"""\n${text || "(see image)"}\n"""`,
    });
    return parts;
  },
};

/* ------------------------------ LEKHAK ----------------------------- */

export const lekhak = {
  schema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "What this letter is" },
      to: { type: Type.STRING, description: "Who it is addressed to" },
      subject: { type: Type.STRING },
      letter: { type: Type.STRING, description: "The complete, ready-to-send letter text with salutation and closing" },
      attachments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Documents to attach" },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["title", "subject", "letter"],
  },
  system: (language) => `You are Lekhak, an expert who writes clear, correct Indian letters, applications and forms for ordinary people. You handle complaint letters, RTI applications, leave/resignation letters, bank and landlord letters, job applications, school/college applications, and government department letters.

Write a complete, polite, ready-to-send letter in the correct Indian format — salutation, body, and a respectful closing. Keep it concise and effective. Use placeholders in [square brackets] only when a detail is genuinely unknown (name, address, date, account number). List any documents to attach.

${langLine(language)}`,
  parts: ({ need, letterType, details, recipient }) => [
    {
      text: `Letter type: ${letterType || "general"}\nAddressed to: ${recipient || "(work out the right authority)"}\n\nWhat I need to write:\n"""\n${need || ""}\n"""\n\nExtra details: ${details || "(none)"}`,
    },
  ],
};

/* ------------------------------ VYAPAAR ---------------------------- */

export const vyapaar = {
  schema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING, description: "The main ready-to-send message / caption / description" },
      variations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alternate versions" },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["title", "content"],
  },
  system: (language) => `You are Vyapaar, a marketing assistant for India's small shops, kirana stores, home businesses and solo sellers. You write WhatsApp broadcast messages, festival offers, product descriptions, social media captions and simple price lists that actually bring customers.

Make the main content warm, persuasive and ready to send — short enough for WhatsApp, with tasteful emojis where they help. Offer 2-3 alternate versions and a few relevant hashtags. Keep it honest and local.

${langLine(language)}`,
  parts: ({ business, goal, kind, tone }) => [
    {
      text: `Business: ${business || "small shop"}\nCreate: ${kind || "WhatsApp message"}\nTone: ${tone || "friendly"}\n\nWhat to promote:\n"""\n${goal || ""}\n"""`,
    },
  ],
};

/* ------------------------------ NAUKRI ----------------------------- */

export const naukri = {
  schema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      output: { type: Type.STRING, description: "Main deliverable: resume text, or application message — ready to use" },
      highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strengths / bullet points" },
      whereToLook: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Where to find jobs (portals, sources)" },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["title", "summary", "output"],
  },
  system: (language) => `You are Naukri, a practical career assistant for Indian job seekers — including first-time workers and people without fancy degrees. You build simple, strong resumes, write job application / cover messages, and point people to where the jobs actually are (National Career Service ncs.gov.in, state Rojgar/Sewayojan portals, Employment News, Apna, govt exam notifications, local options).

Produce the main deliverable ready to use. For a resume, write clean plain-text resume content. For an application, write a short, confident message. Always include practical next steps and honest guidance. Encourage the person.

${langLine(language)}`,
  parts: ({ mode, details }) => [
    {
      text: `Mode: ${mode || "resume"}\n\nAbout me / what I need:\n"""\n${details || ""}\n"""`,
    },
  ],
};

/* ------------------------------- SAMAY ----------------------------- */

export const samay = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Encouraging overview of the plan" },
      topPriority: { type: Type.STRING, description: "The single most important thing to do first, with why" },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            deadline: { type: Type.STRING, description: "Realistic deadline relative to today" },
            priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            estimate: { type: Type.STRING, description: "Rough time needed, e.g. '2 hrs'" },
            category: { type: Type.STRING },
            why: { type: Type.STRING, description: "Why this priority" },
            firstStep: { type: Type.STRING, description: "The concrete next action to start now" },
            draft: { type: Type.STRING, description: "For writing/deliverable tasks, a starter draft or outline" },
          },
          required: ["title", "priority", "firstStep"],
        },
      },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            block: { type: Type.STRING, description: "When, e.g. 'Today 4–6 PM' or 'Tomorrow morning'" },
            task: { type: Type.STRING },
            focus: { type: Type.STRING, description: "What to get done in this block" },
          },
          required: ["block", "task"],
        },
        description: "Focus blocks scheduled to finish everything before deadlines",
      },
    },
    required: ["summary", "topPriority", "tasks"],
  },
  system: (language) => `You are Samay, an autonomous AI chief of staff for busy Indian students, professionals and entrepreneurs. People dump their commitments on you — typed, pasted from an email or syllabus, photographed from handwritten notes, or spoken. You go far beyond reminders.

Do ALL of this:
1) Extract EVERY task and commitment from the dump — leave nothing out.
2) Infer a realistic deadline for each (relative to the given today's date).
3) Prioritise by urgency + importance (High / Medium / Low) and explain why in one line.
4) Estimate the time each needs and give a concrete first step to start right now.
5) For writing/deliverable tasks (emails, essays, decks, applications), draft a starter — an outline or first version they can build on.
6) Build a realistic focus plan: schedule focus blocks across the available time so everything gets done before its deadline, front-loading what's urgent. Account for a human's limited daily focus hours.

Be specific, realistic and genuinely motivating — like a sharp chief of staff who has your back.

${langLine(language)}`,
  parts: ({ text, image, today }) => {
    const parts = [];
    if (image && image.data) {
      parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    }
    parts.push({
      text: `Today's date: ${today || "today"}.\n\nMy commitments / tasks (extract everything, including from any image):\n"""\n${text || "(see image)"}\n"""`,
    });
    return parts;
  },
};

/* ------------------------------- SETU ------------------------------ */

export const setu = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      authority: { type: Type.STRING, description: "The right body/department to approach, and why" },
      draftComplaint: { type: Type.STRING, description: "A complete, ready-to-file complaint text" },
      yourRights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant rights/laws in plain language" },
      escalation: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { step: { type: Type.STRING }, where: { type: Type.STRING } },
          required: ["step", "where"],
        },
        description: "Escalation ladder if ignored",
      },
      portals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING }, link: { type: Type.STRING } },
          required: ["name"],
        },
      },
      followUp: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["summary", "authority", "draftComplaint", "escalation"],
  },
  system: (language) => `You are Setu, a citizen-rights autopilot for India. People describe a problem — a faulty product, denied refund, no water supply, ration denied, overcharging, poor service, a civic issue — and you fight for them.

Do this: identify the RIGHT authority/forum to approach and why; write a complete, firm-but-polite complaint ready to file; explain the person's rights in plain language (Consumer Protection Act 2019, RTI Act, relevant citizen charters); give a realistic escalation ladder (e.g. 1) company/dept grievance cell, 2) National Consumer Helpline 1915 / consumerhelpline.gov.in or CPGRAMS pgportal.gov.in, 3) Consumer Commission / appropriate authority, 4) RTI to get records); list the real portals with links; and give follow-up steps. Use [brackets] for unknown details.

${langLine(language)}`,
  parts: ({ problem, image }) => {
    const parts = [];
    if (image && image.data) parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    parts.push({ text: `My problem:\n"""\n${problem || "(see image)"}\n"""` });
    return parts;
  },
};

/* ------------------------------- PAISA ----------------------------- */

export const paisa = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      totals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { label: { type: Type.STRING }, value: { type: Type.STRING } },
          required: ["label", "value"],
        },
      },
      breakdown: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { category: { type: Type.STRING }, amount: { type: Type.STRING }, note: { type: Type.STRING } },
          required: ["category", "amount"],
        },
      },
      leaks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Wasteful or avoidable spends" },
      dues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { item: { type: Type.STRING }, due: { type: Type.STRING } },
          required: ["item"],
        },
      },
      plan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete steps to save more" },
      savingEstimate: { type: Type.STRING, description: "Rough monthly saving possible, e.g. '₹2,400/month'" },
    },
    required: ["summary", "plan"],
  },
  system: (language) => `You are Paisa, a money autopilot for everyday Indians. People paste bank SMS, UPI history, bills, or just list their spends. You make sense of their money like a friendly, practical financial buddy — not a lecturer.

Do this: total things up at a glance; break spending into clear categories with amounts; spot money leaks (unused subscriptions, repeated food delivery, high fees, avoidable charges); flag upcoming dues/EMIs; and build a simple, realistic save plan (specific cuts, a 50/30/20 idea, automate savings) with an estimated monthly saving. Use rough INR figures and say they're estimates. Be encouraging and non-judgemental.

${langLine(language)}`,
  parts: ({ text, image }) => {
    const parts = [];
    if (image && image.data) parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    parts.push({ text: `My spends / bank messages / bills:\n"""\n${text || "(see image)"}\n"""` });
    return parts;
  },
};

/* ------------------------------ KRISHI ----------------------------- */

export const krishi = {
  schema: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      diagnosis: { type: Type.STRING, description: "Most likely pest/disease/issue" },
      severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
      actionPlan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { step: { type: Type.STRING }, when: { type: Type.STRING } },
          required: ["step"],
        },
        description: "What to do now — include organic and chemical options with caution",
      },
      prevention: { type: Type.ARRAY, items: { type: Type.STRING } },
      schemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant govt farm schemes" },
      advisory: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Irrigation/weather/mandi tips" },
      disclaimer: { type: Type.STRING },
    },
    required: ["summary", "diagnosis", "actionPlan", "disclaimer"],
  },
  system: (language) => `You are Krishi, a kisan saathi (farmer's companion) for India. Farmers send a photo of a crop/leaf and/or describe the problem, their crop and location. You help them protect their crop and income.

Do this: give the most likely diagnosis (pest, disease, deficiency) and severity; a clear action plan with both low-cost/organic and chemical options (mention safe dosage and to read labels); prevention tips; relevant government schemes (PM-KISAN, PMFBY crop insurance, Soil Health Card, Kisan Credit Card, KVK support); and timely irrigation/weather/mandi advice. Always add a short disclaimer to confirm with a local Krishi Vigyan Kendra or agriculture officer. Be practical and respectful.

${langLine(language)}`,
  parts: ({ text, image }) => {
    const parts = [];
    if (image && image.data) parts.push({ inlineData: { mimeType: image.mimeType || "image/jpeg", data: image.data } });
    parts.push({ text: `My crop & problem:\n"""\n${text || "(see image)"}\n"""` });
    return parts;
  },
};

export const features = { kavach, samajh, haq, sehat, paisa, samay, setu, krishi };
