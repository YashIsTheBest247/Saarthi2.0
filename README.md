# सारथी · Saarthi

**An all-in-one AI copilot for everyday life in India** — eleven specialist AI agents that
spot scams, decode documents, claim government benefits, save on health, make sense of
money, file taxes, plan your work, fight unfair treatment, protect your crop, keep you
safe in a disaster, and get you hired. By **voice or text, in English and Hindi**, on web **and Telegram**.

> Hackathon track: *Challenge 3 — Improve Everyday Life with AI.*
> Real AI (Google **Gemini 2.5 Flash**), premium responsive UI, deterministic on-device
> maths where correctness matters — not a generic chatbot.

### Try it live
- **Web app:** <https://getsaarthi.vercel.app>
- **Telegram bot:** [@saarthi_support_bot](https://t.me/saarthi_support_bot)

---

## Highlights

- **11 specialist agents**, each with a photoreal face, its own console + dashboard, and real tools.
- **Floating AI assistant** that understands your problem and routes you to the right agent.
- **Telegram bot** with the same brain — chat, get full answers, and deep-link back into the app.
- **"Already affected?" emergency mode** on every agent — calm worst-case next steps + real helplines.
- **Searchable helpline directory** (22 official Indian numbers, tap-to-call).
- **Bilingual** (English / हिन्दी) — the UI *and* the AI answers flip language.
- **Voice** input everywhere (Web Speech API).
- **Demo-safe**: realistic mock fallbacks so a live demo never breaks, even with no API key.

---

## The agents

| Agent | Role | What it does |
|------|------|--------------|
| **Abhay** | Scam Shield | Forward any suspicious SMS / WhatsApp / call / email → instant fraud verdict, risk score, red flags, what to do. Crime map, fraud-network graph, voice-spoof & counterfeit checks, and a **live scam-news ticker** (RSS). |
| **Vidya** | Document Decoder | Paste or photograph a bill, insurance, legal notice or govt letter → plain language + hidden charges flagged. |
| **Haq** | Scheme Finder | Share a short profile → central + state schemes you likely qualify for, with how-to-apply steps. |
| **Asha** | Health Saver | Decode a prescription → cheaper **generic** equivalents + Jan Aushadhi savings; symptom guidance; vitals & visit-prep. |
| **Nidhi** | Money Autopilot | Make sense of spends, find leaks, budget (50/30/20), and live EMI / SIP calculators. |
| **Lekh** | Tax Filing Copilot | FY 2025-26 (new regime) tax computed **exactly on-device**; Form-16 PDF auto-extract; old-vs-new compare; PDF export. |
| **Smriti** | Chief of Staff | Dump tasks by text/photo/voice → plan, prioritise, schedule focus blocks, forecast deadlines, Pomodoro, goals & habits, calendar/ICS export. |
| **Adhrit** | Grievance Autopilot | Describe a problem → the right authority, a ready complaint, the escalation ladder, and a rights library. |
| **Bhupati** | Kisan Saathi | Snap a crop photo → diagnosis, action plan, farm schemes, timely advisory. |
| **Narayan** | Disaster Response | Fuse **live** weather + river-discharge + earthquake feeds → flood/wildfire/quake risk scored per city, safe routes, resource allocation, live hazard map (with an "updated" timestamp). |
| **Disha** | Career Copilot | Build a job-ready résumé, find openings that fit, run mock interviews, and map the skills to learn next — the direct **Redrob ecosystem hook** (careers / hiring). |

Every agent also has an **"Already affected?"** tab: describe the worst case (you were scammed,
got a notice, lost a crop…) and it returns urgent next steps, exactly who to contact (real
helplines), a ready script, and what the agent will do for you.

---

## Cross-cutting features

- **AI assistant (floating chat)** — bottom-right on every page. Describe your problem; it
  classifies it (Gemini router + an instant offline keyword fallback) and offers **"Talk to
  {agent}"**. Supports voice input.
- **Helplines** — the navbar phone button opens a searchable modal of 22 official Indian
  helplines (1930, 112, 1098, 1078, 1915, 14416 Tele-MANAS, …), tap-to-call.
- **Deep links** — `?agent=kavach` opens that console, `?q=…` opens the chat pre-filled
  (used by the Telegram bot to hand off into the web app).
- **Live data feeds (keyless)** — Narayan pulls **real** weather + river-discharge from
  [Open-Meteo](https://open-meteo.com) and **live earthquakes** from
  [USGS](https://earthquake.usgs.gov), scoring risk on-device; Abhay's ticker streams **live
  scam-news** via RSS. (Satellite imagery & social signals are simulated — no free keyless
  source — and the app falls back to sample data if a feed is unreachable.)
- **Deterministic engines** — tax, EMI/SIP, the scam classifier, Smriti's forecasts/ICS, and
  Narayan's risk & resource maths run **on-device** for reproducible, defensible numbers; the
  LLM is used for understanding, extraction and language.
- **Premium, responsive UI** — floating glass navbar (hamburger menu on phones), smooth
  page/route transitions, language cross-fade.

---

## Telegram bot

The same agents, in Telegram (`server/telegram.js`):

- **`/start`** → welcome + tappable quick-start buttons and a **"Browse all agents"** menu.
- **Free text** → auto-routes to the best agent and replies with a complete answer
  (English/Hindi auto-detected), plus an **"Open in app"** deep link.
- **Pick an agent** (`/agents` or the menu) → reply to talk **directly** to that specialist.
- Powered by one Gemini `assist` call that routes **and** writes the full answer; falls back to
  mock replies if no key is set.

**Try it:** [@saarthi_support_bot](https://t.me/saarthi_support_bot) — or see **Deploy** below to connect your own.

---

## Architecture (short)

```
Browser (React 19 + Vite + Tailwind + Framer Motion)
   │  POST /api/<feature>   (text, optional image, language)
   ▼
Express app (server/app.js)  ──►  Google Gemini  (structured JSON output)
   │  • API key stays server-side, never shipped to the browser
   │  • graceful mock fallback if no key / API error → demo never breaks
   │
   ├─ /api/telegram   ◄── Telegram webhook (same agents)
   └─ deployed on Vercel as a serverless function (api/index.js)

Telegram  ──►  /api/telegram  ──►  Gemini  ──►  reply + deep link back to the web app
```

- **Structured output** — every feature defines a strict `responseSchema`; Gemini returns
  typed JSON the UI renders directly (no fragile parsing).
- **Multimodal** — Vidya, Asha, Lekh, Bhupati, Smriti accept a **photo/PDF** via Gemini vision.
- **One deploy** — frontend (static `dist/`) + the Express API (serverless) live on one Vercel URL.

Full details in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Setup & run (local)

**1. Install**
```bash
npm install
```

**2. Add your Gemini key** (free at <https://aistudio.google.com/apikey>)
```bash
cp .env.example .env        # then edit .env and paste your key
# GEMINI_API_KEY=AIza...
```
> Skip this and the app still runs in **demo mode** with realistic sample data.

**3. Start** (API + web app together)
```bash
npm run dev
```
Open the printed URL (e.g. <http://localhost:5179>).

**Build**
```bash
npm run build        # builds the web app to dist/
npm start            # runs the local API server (server/index.js)
```

### Environment variables
| Var | Required | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | for live AI | Google AI Studio key (else demo/mock mode) |
| `GEMINI_MODEL` | optional | defaults to `gemini-2.5-flash` |
| `PORT` | optional | local API port (default `8787`) |
| `TELEGRAM_BOT_TOKEN` | for the bot | from @BotFather |
| `APP_URL` | for the bot | deployed URL for deep links, e.g. `https://getsaarthi.vercel.app` |

---

## Deploy (Vercel) + Telegram bot

Frontend **and** the `/api` Gemini backend deploy together — the Express app is wrapped as a
Vercel serverless function (`api/index.js`, routed via `vercel.json`).

### 1. Deploy on Vercel
1. Push the repo to GitHub and **Import Project** on Vercel (auto-detects **Vite**).
2. Add **Environment Variables** (Settings → Environment Variables): `GEMINI_API_KEY`
   (and optionally `GEMINI_MODEL`, plus `TELEGRAM_BOT_TOKEN` & `APP_URL` for the bot).
3. **Deploy.** The site is live; agents / chat / helplines all work via `/api/*`.

### 2. Telegram bot
1. In Telegram, open **@BotFather** → `/newbot` → copy the **token**.
2. Add `TELEGRAM_BOT_TOKEN` and `APP_URL` to Vercel env vars, then **redeploy**.
3. **Register the webhook** once (replace `<TOKEN>` and your domain):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram
   ```
   It should return `{"ok":true}`. Verify the endpoint: open
   `https://<your-app>.vercel.app/api/telegram` → `{"ok":true,"bot":"Saarthi Telegram webhook"}`.
4. Message your bot. (Remove later with `…/bot<TOKEN>/deleteWebhook`.)

> Never commit secrets. `.env` is gitignored — set keys only in the Vercel dashboard.
> If you ever paste a token publicly, **revoke it** via @BotFather.

---

## Project structure

```
api/
  index.js          Vercel serverless wrapper (exports the Express app)
server/
  app.js            Express app + all /api routes (+ telegram webhook)
  index.js          local dev server (listens on PORT)
  gemini.js         Gemini client wrapper (structured JSON)
  prompts.js        per-feature system prompts + JSON schemas (the "brains")
  mocks.js          demo-safe sample responses
  telegram.js       Telegram bot webhook (buttons, agent menu, routing)
  news.js           live scam-news RSS (with fallback)
src/
  App.tsx           view switching, deep links, scroll restore
  app/AppContext    language + health context, i18n helper
  components/       Nav, Landing, FloatingChat, Helplines, Select, Logo,
                    AgentAvatar, LanguagePicker, FeatureShell, ui primitives
  features/         per-agent tools + console/ (dashboards) + kavach/ sehat/ kar/
  lib/              api client, features metadata, languages, i18n (en/hi),
                    route (keyword classifier), confetti
  hooks/            useVoice
vercel.json         build + /api routing + function config
```

---

## Demo

1. **Land** on the hero → switch language to **हिन्दी** (top right); UI + AI output flip.
2. **Abhay** → *Try an example* (digital-arrest scam) → risk ring hits **94**, red flags, 1930 helpline.
3. **Vidya** → snap a hospital bill → flags a **duplicated charge**, explains "TPA".
4. **Haq** → profile a woman farmer in Maharashtra → **PM-KISAN, Ayushman Bharat, Atal Pension** + how to apply.
5. **The floating assistant** → type "*I got an OTP and money was debited*" → it routes to Abhay; open **"Already affected?"** for emergency steps + 1930.
6. **Telegram** → send the same message to the bot → full answer + "Open in app" link.

---

*Made for India · Powered by Gemini.*
