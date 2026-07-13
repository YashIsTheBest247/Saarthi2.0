# सारथी · Saarthi

**AI for everyday India — and a rentable AI workforce for its MSMEs.**

Saarthi is two things in one product:

1. **Consumer copilot** — eight specialist AI agents that claim government schemes, decode
   documents, save on health, plan your work, launch a business, run a compliant mine, fight
   unfair treatment, and turn any topic into an educational video. By **voice or text, in
   English and Hindi**, on web **and Telegram**.
2. **AI Workforce (MSME)** — eight **autonomous, rentable "AI employees"** an organisation can
   hire, assign a task to, and integrate via a REST API to automate real back-office workflows —
   finance & schemes, GST & accounts, delayed-payment recovery (MSME Samadhaan), FSSAI, environment,
   construction, electronics, and auto/EV compliance. Not chatbots — **employees that plan, use
   their tools, and hand back finished, filing-ready work.**

> Real AI (Google **Gemini 2.5 Flash**, multi-key rotation + **Groq fallback**), real integration
> connectors (Tally XML · GSTIN validation · e-way JSON · WhatsApp), and deterministic on-device
> maths where correctness matters — agents that *act*, not a generic chatbot.

### Try it live
- **Web app:** <https://saarthi20.vercel.app>
- **Telegram bot:** [@saarthi_helper_bot](https://t.me/saarthi_helper_bot)

> **MSME challenge submission:** see **[MSME.md](MSME.md)** for the full problem-statement mapping,
> the AI-Workforce deep dive, business model, feasibility and demo script.

---

## Highlights

- **8 consumer agents + 8 AI-Workforce employees** — each with a photoreal face and real tools.
- **Truly agentic** — a *plan → act → observe → reflect → synthesize* loop composes an arbitrary
  chain of specialists at runtime and revises it; it produces the finished deliverable, not advice.
- **Rent an AI employee** — `POST /api/employees/:id/task` with a per-tenant API key. Call it from
  an ERP, a cron job or Zapier to automate a workflow. Usage is metered per tenant.
- **Real integrations** — employees emit **Tally-import XML vouchers**, **NIC e-way-bill JSON**, and
  **validate every GSTIN** (official check-digit algorithm, on-device). WhatsApp/Email/SMS dispatch.
- **Depth functions** — every employee has 5–6 concrete duties (e.g. Accounts: GST invoice → Tally,
  e-invoice IRN, reconciliation, GST liability, e-way) — 44 functions across the fleet.
- **Autonomous scheduling** — dated follow-ups become one-tap **calendar (.ics)** entries.
- **Ready-to-hand-over documents** — a project report, Samadhaan complaint, BOQ, or bid exports to
  **PDF and Word (.docx)** in one tap.
- **PDF & image aware** — attach a bill/invoice/notice (image or PDF); Gemini vision reads it.
- **Bilingual** (English / हिन्दी) — UI *and* AI answers flip language. **Voice** input everywhere.
- **Telegram bot** with the same brain — chat, hire an AI employee, send a photo/PDF to decode.
- **Resilient AI** — rotates multiple Gemini keys, then **falls back to Groq** (Llama 3.3 70B) when
  quota is exhausted, then to realistic mocks so a live demo *never* breaks.

---

## The consumer agents

| Agent | Role | What it does |
|------|------|--------------|
| **Haq** | Scheme Finder | Share a short profile → central + state schemes you likely qualify for, with how-to-apply steps. |
| **Adhrit** | Grievance Autopilot | Describe a problem → the right authority, a ready complaint, the escalation ladder, and a rights library. |
| **Vidya** | Document Decoder | Paste or photograph a bill, insurance, legal notice or govt letter → plain language + hidden charges flagged. |
| **Asha** | Health Saver | Decode a prescription → cheaper **generic** equivalents + Jan Aushadhi savings; symptom guidance; visit-prep. |
| **Smriti** | Chief of Staff | Dump tasks by text/photo/voice → plan, prioritise, schedule focus blocks, forecast deadlines, calendar/ICS export. Also the **orchestrator** that manages the whole team. |
| **Udyam** | Business & MSME Launchpad | Turn a business idea into reality — the exact **Udyam, GST & licence** steps and the **MSME schemes & loans** (Mudra, PMEGP, CGTMSE) you qualify for. |
| **Khanan** | Mining Compliance & Ops | A location-aware compliance + predictive-ops copilot for mine owners — DGMS readiness, royalty/DMF/NMET, permits, legal notices, forecasts. |
| **Pragyan** | Educational Videos & Podcasts | Turn any topic (or a trending Economic Times story) into a short educational **video/podcast** — script, subtitles, images, narration, a shareable link. Works on Telegram. |

---

## The AI Workforce — rentable AI employees (MSME)

Eight autonomous employees, each themed to a **Miscellaneous** MSME sub-sector, plus the
cross-cutting MSME essentials. Each has a job description, an SOP, a scoped toolset, and named
**depth functions**. Hire one → assign a task → get finished work.

| Employee | Sub-sector | Sample functions |
|---|---|---|
| **Vitta** · Finance & Schemes | MSME essentials | scheme & subsidy match · Mudra/PMEGP/CGTMSE loan recommendation · bankable project report · loan-readiness · Udyam |
| **Rijul** · Receivables & Samadhaan | Delayed payments | MSME Samadhaan filing (45-day rule) · Section-16 interest (3× RBI) · legal demand notice · ageing · TReDS |
| **Meera** · Accounts, GST & e-Invoicing | Cross-cutting | GST invoice → **Tally XML** · e-invoice IRN · **e-way bill** · reconciliation · GST liability |
| **Prithvi** · Environment, Water & Sanitation | Environment | CPCB pollution category (Red/Orange/Green) · CTE/CTO · EPR · ZLD/water · BRSR |
| **Anna** · Foods, Beverages & FMCG | Food & FMCG | FSSAI licence tier · compliant label · HACCP · **PMFME 35% subsidy** · recall |
| **Devraj** · Infrastructure & Construction | Construction | Bill of Quantities · RERA · BOCW labour cess · site-safety plan · tender doc |
| **Tara** · Electronics, IT & Telecom | Electronics/IT | BIS-CRS · **E-waste EPR** · **DPDP Act 2023** checklist · WPC/ETA · PLI |
| **Kabir** · Metals, Machinery & Mobility | Auto/EV/metals | **ARAI/AIS homologation** · **FAME-II/EV subsidy** · PLI-Auto · GeM · BIS quality |

**Integrate & rent** — an organisation gets an API key and calls one endpoint:

```bash
curl -X POST https://<app>/api/employees/accounts/task \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-key>" \
  -d '{"function":"invoice","task":"120 cartons @ ₹450, 18% GST, buyer 24AAACC1206D1ZM"}'
# → returns the plan, each step, the finished deliverable, an auto-generated Tally XML,
#   and a validated GSTIN — as JSON.
```

Design your own from a job description, too (`id: "custom"`). Every run can auto-attach a **Tally
voucher (XML)** and **e-way bill (JSON)**, validate GSTINs, export the deliverable to **PDF/Word**,
and set **calendar reminders**.

---

## Cross-cutting features

- **Smriti-led Orchestrator** — a node-graph view with **Smriti at the top** managing the full team
  (consumer agents + AI Workforce). Describe any goal and she decomposes it into agent-actions,
  runs them live down the edges, and turns dated outcomes into a calendar `.ics` + email reminder.
- **Agentic workflows** — the **Workflows** tab runs multi-agent chains, visualised live:
  *Decode → Complaint → Schedule* (Vidya → Adhrit → Smriti), *Register → Schemes → Plan*
  (Udyam → Haq → Smriti), *Decode Rx → Refills* (Asha → Smriti), *Topic → Explainer → Schedule*
  (Pragyan → Smriti). An AI planner picks the right chain from free text.
- **Integrations console** — validate a GSTIN, generate a Tally XML / e-way JSON, or compose a
  WhatsApp send, live. Shows which connectors are live vs. need the org's credentials.
- **Floating AI assistant** — bottom-right on every page. Classifies your problem and offers to open
  the right consumer agent *or* hire the matching AI employee.
- **Deterministic engines** — GSTIN check-digit, Tally XML, e-way payload, tax/EMI/SIP, scam score,
  and the `.ics`/scheduling maths run **on-device** for reproducible, defensible output.
- **Works even with no/low AI quota** — connectors and calculators are keyless; when Gemini quota is
  hit, keys auto-rotate → Groq → mocks, with a clear notice.
- **Premium, responsive UI** — floating glass navbar, smooth transitions, EN↔HI cross-fade, dark/light.

---

## Telegram bot

The same brain, in Telegram (`server/telegram.js`):

- **`/start`** → welcome + quick-starts, **👥 Browse agents**, and **🏢 Hire an AI employee**.
- **Free text** → auto-routes to the best consumer specialist (or answers directly) with an
  **"Open in app"** deep link.
- **🏢 AI Workforce** → pick an employee, reply with a task, and it **runs the autonomous loop** and
  hands back the finished deliverable + an app link.
- **Send a photo or PDF** → Vidya reads and explains it; or reply to a hired employee with a
  document and it acts on it (Gemini vision).
- **Emergency SMS** — set a contact with `/sos +91…`; on an urgent message the bot offers to text
  them (with a Google-Maps location link) via Fast2SMS / TextBelt.

---

## Architecture (short)

```
Browser (React 19 + Vite + Tailwind + Framer Motion)
   │  POST /api/<feature>  ·  /api/employees/:id/task  ·  /api/agent  ·  /api/tools/*
   ▼
Express app (server/app.js)  ──►  Google Gemini (multi-key rotation) ──► Groq fallback ──► mocks
   ├─ orchestrator.js  plan→act→observe→reflect→synthesize (persona-scoped for employees)
   ├─ employees.js     the AI-employee catalog (personas over the agent skills) + auto-artefacts
   ├─ connectors.js    GSTIN validate · Tally XML · e-way JSON · WhatsApp (real, deterministic)
   ├─ tenancy.js       per-tenant API keys + usage metering for the rent API
   ├─ workflows.js     multi-agent chains + planner
   ├─ prompts.js       per-feature system prompts + JSON schemas (the "brains")
   └─ telegram.js      the Telegram webhook (agents + AI Workforce + photo/PDF)
   deployed on Vercel as one serverless function (api/index.js)
```

- **Structured output** — every feature declares a strict `responseSchema`; Gemini returns typed JSON.
- **Multimodal** — image/PDF arrive as base64 `inlineData`; Gemini vision reads them.
- **One deploy** — static `dist/` + the Express API (serverless) on one Vercel URL.

Full details in **[ARCHITECTURE.md](ARCHITECTURE.md)**; MSME deep dive in **[MSME.md](MSME.md)**.

---

## Setup & run (local)

**1. Install**
```bash
npm install
```

**2. Add your keys** (free at <https://aistudio.google.com/apikey>)
```bash
cp .env.example .env        # then edit .env
# GEMINI_API_KEY=AIza...            (add GEMINI_API_KEY_2/3/4… for rotation)
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

**Generate agent / AI-employee faces** (keyless, via Pollinations)
```bash
node scripts/gen-faces.mjs            # consumer agents + hero
node scripts/gen-workforce-faces.mjs  # the 8 AI-Workforce employees
```

### Environment variables
| Var | Required | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | for live AI | Google AI Studio key (else demo/mock mode) |
| `GEMINI_API_KEY_2/3/4/5` | optional | extra keys — auto-**rotated** when one hits its quota |
| `GEMINI_API_KEYS` | optional | comma-separated keys (alternative to the numbered vars) |
| `GEMINI_MODEL` | optional | defaults to `gemini-2.5-flash` |
| `GROQ_API_KEY` | optional | **automatic fallback** when all Gemini keys are exhausted |
| `WORKFORCE_API_KEYS` | optional | `key:Tenant:plan,…` — enables per-tenant metering for the rent API (open demo if unset) |
| `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN` | optional | provider (Meta/Gupshup) for real WhatsApp send (else a keyless `wa.me` link) |
| `TELEGRAM_BOT_TOKEN` | for the bot | from @BotFather |
| `APP_URL` | for the bot | deployed URL for deep links, e.g. `https://getsaarthi.vercel.app` |
| `SMTP_HOST/PORT/USERNAME/PASSWORD/FROM_EMAIL` | for email | Gmail SMTP for "email me when it's done" (+ `.ics`) |
| `FAST2SMS_KEY` / `TEXTBELT_KEY` | for SMS | emergency SMS from the Telegram bot |
| `PEXELS_API_KEY` | optional | nicer Pragyan stock images (keyless Pollinations fallback) |

---

## Deploy (Vercel) + Telegram bot

Frontend **and** the `/api` backend deploy together — the Express app is wrapped as a Vercel
serverless function (`api/index.js`, routed via `vercel.json`).

### 1. Deploy on Vercel
1. Push the repo to GitHub and **Import Project** on Vercel (auto-detects **Vite**).
2. Add **Environment Variables** — at minimum `GEMINI_API_KEY` (+ `GEMINI_API_KEY_2/3…` for rotation),
   optionally `GROQ_API_KEY`, `WORKFORCE_API_KEYS`, `TELEGRAM_BOT_TOKEN` & `APP_URL`, SMTP/SMS keys.
3. **Deploy.** The site is live; agents, AI Workforce, connectors and chat all work via `/api/*`.

### 2. Telegram bot
1. In Telegram, open **@BotFather** → `/newbot` → copy the **token**.
2. Add `TELEGRAM_BOT_TOKEN` and `APP_URL` to Vercel env vars, then **redeploy**.
3. **Register the webhook** once (replace `<TOKEN>` and your domain):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram
   ```
   It should return `{"ok":true}`. Verify: open `https://<your-app>.vercel.app/api/telegram`.
4. Message your bot `/start`. (Remove later with `…/bot<TOKEN>/deleteWebhook`.)

> Never commit secrets. `.env` is gitignored — set keys only in the Vercel dashboard.

---

## Project structure

```
api/index.js         Vercel serverless wrapper (exports the Express app)
server/
  app.js             Express app + all /api routes (agents, employees, tools, telegram, notify)
  index.js           local dev server (listens on PORT)
  gemini.js          Gemini client — multi-key rotation + Groq fallback (structured JSON)
  orchestrator.js    autonomous plan→act→reflect→synthesize loop (persona-scoped for employees)
  employees.js       the 8-employee AI-Workforce catalog + real integration artefacts
  connectors.js      GSTIN validate · Tally XML · e-way JSON · WhatsApp (deterministic, real)
  tenancy.js         per-tenant API keys + usage metering
  workflows.js       multi-agent chains + planner;  prompts.js  per-feature prompts + schemas
  telegram.js        Telegram webhook (agents + AI Workforce + photo/PDF)
  mocks.js           demo-safe sample responses;  notify.js / sms.js / docgen.js  actions
src/
  App.tsx            view switching, deep links (?agent, ?q, ?hire), scroll restore
  components/        Nav, Landing, FloatingChat, ActionBar, Helplines, Logo, ui …
  features/          Workforce (hire/assign), Orchestrator, WorkflowsView, Integrations,
                     per-agent consoles (kavach/ sehat/ study/ pragyan/ khanan/ console/)
  lib/               api client, features/roleIcons/hire metadata, i18n (en/hi), reminders (ICS)
scripts/             gen-faces.mjs · gen-workforce-faces.mjs (keyless portrait generation)
vercel.json          build + /api routing + function config
```

---

## Demo (60 seconds)

1. **Land** → the hero shows the full team; scroll to **"Rent a fleet of AI employees."**
2. **AI Workforce** → hire **Accounts** → *"Draft a GST invoice for 120 cartons @ ₹450, 18% GST,
   buyer 24AAACC1206D1ZM"* → get the invoice + **one-tap Tally XML** + a **green GSTIN check**.
3. **Receivables** → *"A corporate hasn't paid my ₹4L invoice for 90 days"* → a ready **MSME Samadhaan
   complaint** with Section-16 interest, downloadable as **PDF/Word**.
4. **Integrate** → copy the one-line API call — "your ERP or cron calls this; the workflow runs itself."
5. **Telegram** → send a bill photo → Vidya reads it; or hire an employee and reply with a task.
6. Close: *"Not a chatbot that talks — a workforce that works."*
