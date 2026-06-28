# सारथी · Saarthi

**An all-in-one AI copilot for everyday life in India.**
Spot scams before they cost you, decode any confusing document, find the government schemes you deserve, and save money on medicines — by **voice or text, in 10 Indian languages.**

> Hackathon track: *Challenge 3 — Improve Everyday Life with AI.*
> Real AI (Google Gemini), premium responsive UI, ten tools that solve real daily Indian problems — not a generic chatbot.

---

## Why Saarthi

Most "AI apps" are an English chat box. But everyday life in India is fought in paperwork, regional languages, government portals, and a relentless wave of digital fraud. Saarthi packages ten high-impact, India-specific helpers behind one calm, premium experience:

| Tool | Name | What it does | Real problem it solves |
|------|------|--------------|------------------------|
| 🛡️ **Kavach** | *Scam Shield* | Forward any suspicious SMS / WhatsApp / call / email → instant fraud verdict, risk score, red flags, and what to do | ₹22,800 Cr+ lost to cyber fraud in India in a single year; "digital arrest" & UPI scams target elders daily |
| 📄 **Samajh** | *Document Decoder* | Paste or photograph a medical bill, insurance, legal notice or govt letter → plain language + hidden charges flagged | Crucial documents are in English/legalese most people can't parse |
| 🏛️ **Haq** | *Scheme Finder* | Share a short profile → the central + state government schemes you likely qualify for, with how to apply | Lakhs of crores in welfare go unclaimed because people don't know what they're owed |
| ❤️ **Sehat** | *Health Saver* | Decode a prescription → cheaper **generic** equivalents + Jan Aushadhi savings; or describe symptoms for safe guidance | Indian generics cost 50–90% less; people overpay out of confusion |

Every tool works **by voice** and answers in the user's **chosen language** (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, English). The interface itself flips between English and हिन्दी.

---

## Tech & architecture

```
Browser (React 19 + Vite + Tailwind + Framer Motion)
   │  POST /api/<tool>   (text, optional image, language)
   ▼
Express proxy (server/)  ──►  Google Gemini (structured JSON output)
   │  key stays server-side; never shipped to the browser
   ▼  graceful mock fallback if no key / API error → demo never breaks on stage
```

- **Structured output** — each tool defines a strict `responseSchema`, so Gemini returns clean, typed JSON the UI renders directly (no fragile parsing).
- **Multimodal** — Samajh & Sehat accept a **photo** (bill / prescription) via Gemini vision.
- **Voice** — Web Speech API, locale-aware per selected language.
- **Demo-safe** — if `GEMINI_API_KEY` is missing or a call fails, the server returns realistic sample data flagged with a subtle "sample result" badge, so a live demo always works.

Key files:

```
server/
  index.js     Express routes + graceful fallback
  prompts.js   per-tool system prompts + JSON schemas (the "brains")
  gemini.js    Gemini client wrapper
  mocks.js     demo-safe sample responses
src/
  features/    Kavach · Samajh · Haq · Sehat
  components/  Landing, Nav, FeatureShell, LanguagePicker, ui primitives
  lib/         languages, i18n (en/hi), api client, feature metadata
  hooks/       useVoice
```

---

## Run it

**1. Install**
```bash
npm install
```

**2. Add your Gemini key** (free at <https://aistudio.google.com/apikey>)
```bash
cp .env.example .env       # then edit .env and paste your key
# GEMINI_API_KEY=AIza....
```
> Skip this and the app still runs in **demo mode** with realistic sample data.

**3. Start** (runs the API + web app together)
```bash
npm run dev
```
Open the printed URL (e.g. <http://localhost:5179>). The badge in each tool shows **Live AI** or **Demo mode**.

**Build for production**
```bash
npm run build && npm start   # serves the API; host dist/ on any static host
```

---

## 90-second demo script (for judges)

1. **Land** on the hero — switch the language to **हिन्दी** (top right); the whole UI + AI output flips.
2. **Kavach** → *Try an example* (an electricity-disconnection scam) → watch the risk ring hit **94**, red flags, and the 1930 helpline. Mention this protects elders from "digital arrest" fraud.
3. **Samajh** → paste/snap a hospital bill → it flags a **duplicated charge** and explains "TPA".
4. **Haq** → set profile to a woman farmer in Maharashtra → it surfaces **PM-KISAN, Ayushman Bharat, Atal Pension** with how-to-apply steps.
5. **Sehat** → example prescription → shows **generic alternatives** and "₹540/month saved" + Jan Aushadhi tip.
6. Close on the voice button — *"all of this, spoken, for someone who can't type English."*

---

*Made for India · Powered by Gemini.*
