# Saarthi AI Workforce — MSME Innovation Submission

**Rentable, autonomous "AI employees" that plug into an MSME's systems and run entire
back-office workflows on their own.**

- **Live web app:** <https://saarthi20.vercel.app>
- **Telegram bot:** [@saarthi_helper_bot](https://t.me/saarthi_helper_bot)
- **Repo docs:** [README.md](README.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. The form, in one place

- **Sector:** ☑ **Miscellaneous** — specifically **IT / ITES / Electronics** and **Automation**,
  with cross-cutting application to every Miscellaneous sub-sector (Environment & Water; Foods,
  Beverages & FMCG; Infrastructure & Construction; Metals, Machinery, Automotive, EV & Mobility).
- **Title of the proposed idea/innovation:**
  **"Saarthi AI Workforce — rentable, autonomous AI employees that automate MSME back-office
  workflows."**

### The 250-word idea
India's 63 million+ MSMEs lose time and margin to repetitive back-office work — accessing finance
and schemes, Udyam & GST registration, GST invoicing, recovering delayed payments, and staying
compliant (FSSAI, BIS, RERA, pollution board, DPDP) — but cannot afford specialist staff or rigid
enterprise software.

Saarthi AI Workforce lets any organisation **rent autonomous "AI employees."** Each employee is a
role — Finance & Schemes, Accounts & GST, Receivables & MSME Samadhaan, Environment, Food Safety,
Construction, Electronics, Auto/EV — that a business hires, assigns a task to in plain language, and
integrates into its own systems with one API call.

Unlike a chatbot, each AI employee is **genuinely agentic**: it *plans* the steps, *acts* using a
toolbox of specialist skills, *observes* the results, *re-plans* if needed, and hands back
**finished, filing-ready work** — a GST invoice exported to Tally, a bankable project report, an
MSME Samadhaan complaint with statutory interest, an FSSAI-compliant label — not just advice.

Organisations get an API key; they trigger employees from their ERP, a cron job or Zapier, and usage
is **metered per tenant** — a true "agent-as-a-service" rental model.

Built on real AI (Google Gemini 2.5 Flash with multi-key rotation + Groq fallback), real connectors
(Tally XML, GSTIN validation, e-way bill, WhatsApp), bilingual (English/Hindi), and **already live**.
It turns AI from a novelty into an affordable, always-on workforce for the MSME sector.

---

## 2. The problem

MSMEs are ~30% of India's GDP and ~45% of exports, yet run desperately lean — an owner and a handful
of staff juggle everything. The recurring, well-documented pain points:

| # | MSME pain point | Why it hurts |
|---|---|---|
| 1 | **Access to finance** | The #1 gap. Owners don't know which scheme/loan (Mudra, PMEGP, CGTMSE, Stand-Up India, CLCSS) they qualify for, or how to make a bankable project report. |
| 2 | **Delayed payments** | Corporates/PSUs sit on MSME invoices for months. The MSMED Act's 45-day rule and Samadhaan exist, but owners rarely know how to invoke them. |
| 3 | **Registration & compliance** | Udyam, GST, licences, PF/ESI, and a maze of statutory filings. |
| 4 | **Sector compliance** | FSSAI (food), BIS/CRS & E-waste EPR & DPDP (electronics/IT), RERA & BOCW (construction), CPCB/SPCB & EPR (environment), ARAI/AIS (auto/EV). |
| 5 | **Affordability** | Specialist hires are out of reach; enterprise software is costly, rigid and needs an IT team to integrate. |
| 6 | **Existing "AI"** | Chatbots *describe* what to do — the MSME still has to do the work. |

---

## 3. How it maps to the MSME problem statement

Dedicated AI employees for the real pain points — the MSME lifecycle from
*register → fund → comply → produce → sell → get paid*, end to end.

| MSME problem | AI employee | What it does |
|---|---|---|
| **Access to finance** | **Vitta** · Finance & Schemes | Matches Mudra/PMEGP/CGTMSE/Stand-Up India, drafts a bankable project report / CMA, loan-readiness check, CLCSS subsidy tracking, Udyam |
| **Delayed payments** | **Rijul** · Receivables & MSME Samadhaan | MSMED-Act 45-day rule, Section-16 delayed-payment interest (3× RBI rate), Samadhaan complaint, demand notice, TReDS |
| **Accounts & GST** | **Meera** · Accounts, GST & e-Invoicing | GST invoice → **Tally XML**, e-invoice IRN, e-way bill, reconciliation, GST liability |
| **Environment compliance** | **Prithvi** · Environment, Water & Sanitation | CPCB pollution category, CTE/CTO consent, EPR (plastic/e-waste), ZLD/water, BRSR |
| **Food/FMCG compliance** | **Anna** · Foods, Beverages & FMCG | FSSAI licence tier, compliant label generator, HACCP, **PMFME 35% subsidy**, recall |
| **Construction** | **Devraj** · Infrastructure & Construction | Bill of Quantities, RERA, BOCW labour cess, site-safety plan, tender/bid doc |
| **Electronics/IT/Telecom** | **Tara** · Electronics, IT & Telecom | BIS-CRS, **E-waste EPR**, **DPDP Act 2023** checklist, WPC/ETA, PLI |
| **Metals/Auto/EV** | **Kabir** · Metals, Machinery & Mobility | **ARAI/AIS homologation**, **FAME-II/EV subsidy**, PLI-Auto, GeM, BIS quality |

**8 AI employees · 44 concrete functions.** Plus a "design your own employee from a job
description" option so any remaining sub-sector is one paste away.

---

## 4. The AI Workforce — full function list

Each employee ships with named **functions** (its duties) — an org can invoke a specific function
via the API to automate an exact workflow step.

- **Vitta · Finance & Schemes** — scheme & subsidy match · loan recommendation (Mudra/PMEGP/CGTMSE) ·
  bankable project report · loan-readiness check · Udyam registration.
- **Rijul · Receivables & MSME Samadhaan** — Samadhaan filing · Section-16 interest calc · legal
  demand notice · receivables ageing · TReDS onboarding.
- **Meera · Accounts, GST & e-Invoicing** — GST invoice (→ Tally XML) · e-invoice (IRN) · e-way bill ·
  reconciliation · GST liability summary.
- **Prithvi · Environment, Water & Sanitation** — pollution category · CTE/CTO application · EPR
  registration · water/ZLD plan · green incentives · BRSR report.
- **Anna · Foods, Beverages & FMCG** — FSSAI licence tier · compliant label · HACCP plan · PMFME
  subsidy · recall notice · cold-chain & shelf-life.
- **Devraj · Infrastructure & Construction** — Bill of Quantities · RERA compliance · BOCW labour
  cess · site safety plan · tender/bid doc · progress report.
- **Tara · Electronics, IT & Telecom** — BIS-CRS registration · E-waste EPR · DPDP Act 2023 readiness ·
  WPC/ETA approval · PLI eligibility.
- **Kabir · Metals, Machinery & Mobility** — ARAI/AIS homologation · FAME-II/EV subsidy · PLI-Auto ·
  GeM & tenders · BIS/quality certification · vendor & procurement.

Every run can **auto-attach a Tally voucher (XML)** and **e-way bill (JSON)**, **validate every
GSTIN**, export the deliverable to **PDF/Word**, and set **calendar reminders**.

---

## 5. The innovation (why we win)

1. **Agentic, not conversational.** A real *plan → act → observe → reflect → synthesize* loop
   composes an arbitrary chain of specialist skills at runtime and revises it — and produces the
   *finished deliverable*, autonomously. (`server/orchestrator.js`.)
2. **Persona-scoped AI employees.** The same engine is constrained to a job role (JD + SOP + a scoped
   toolset), so output is professional and on-remit — an "employee," not a general bot.
3. **Rent + integrate model.** A clean REST API (`POST /api/employees/:id/task`) with per-tenant API
   keys and usage metering. An MSME automates a workflow by calling one endpoint from tools it
   already uses.
4. **Real, deterministic integrations.** Not fake calls: the official **GSTIN check-digit algorithm**,
   **Tally.ERP-import XML**, **NIC e-way-bill JSON**, and WhatsApp/Email/SMS dispatch.
5. **India-first & resilient.** Bilingual, GST/BIS/FSSAI/RERA/₹-aware, multi-key rotation + Groq
   fallback so it never goes dark mid-shift. PDF & image aware (Gemini vision).

---

## 6. Technology

- **Frontend:** React 19 + Vite + Tailwind + Framer Motion — responsive, bilingual (EN/HI), voice.
- **Backend:** Node/Express, deployed serverless on Vercel; also runs locally.
- **AI:** Google **Gemini 2.5 Flash** with structured JSON output, **multi-key rotation** +
  **Groq (Llama 3.3 70B)** fallback + demo-safe mocks.
- **Agentic core:** `orchestrator.js` (bounded plan/act/reflect/synthesize) · `employees.js`
  (persona layer + auto-artefacts) · `tenancy.js` (API-key metering) · `connectors.js` (real tools).
- **Deterministic engines** on-device for anything that must be exact — GSTIN, Tally XML, e-way,
  tax/GST, EMI/SIP.

Details in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## 7. Feasibility — it already works

- **Live web app** and **Telegram bot** (links at top).
- **Full system test with live keys: 20/20 passing** — consumer agents, autonomous employee runs
  (with auto Tally XML + GSTIN validation), the orchestrator loop, a workflow chain, all connectors,
  tenancy, and PDF/Word export. **Multi-key rotation verified live** (a key hit its quota and the
  system auto-rotated to the next without a failure).
- **Integration is one HTTP call** (see the README) — callable from an ERP, cron, or Zapier.

---

## 8. Business model — "agent as rent" (free trial now)

- **Per-seat subscription** per AI employee (e.g. ₹X/employee/month), or **usage-metered** per task
  run (already metered per API key via `WORKFORCE_API_KEYS`).
- **Tiered plans** (trial → pro) — enterprise = private deployment.
- **Land-and-expand:** an MSME hires one employee (say Accounts & GST), then grows the fleet.
- Billing is **deferred for the pilot** — the platform is free during the trial.

---

## 9. Market & scalability

- **TAM:** 63M+ MSMEs + startups + agencies. Every role generalises across sub-sectors.
- **Marginal cost per new employee ≈ a role definition** (JD + functions + toolset) — scales
  horizontally with almost no new code. "Design your own from a JD" means any sub-sector is one
  paste away.
- The same engine already powers 8 consumer agents, proving breadth.

---

## 10. Social & economic impact

- **Levels the playing field:** gives a 3-person firm the back-office capability of a 30-person firm.
- **Unlocks finance & entitlements:** surfaces the schemes/loans MSMEs are owed but never claim.
- **Recovers cash:** the Samadhaan/receivables employee helps MSMEs get paid — a systemic problem.
- **Bilingual + voice + Telegram:** usable by non-English, non-technical owners across Bharat.
- Augments (not replaces) staff by removing drudge work; frees owners to focus on growth.

---

## 11. Roadmap / use of funds

- Productionise tenancy & billing; live provider integrations (Tally connector, GSTN GSP, WhatsApp
  Business, e-way NIC API); a self-serve Fleet console; SOC-2-style security.
- Wire the orchestrator to delegate directly to workforce employees (Smriti routes a request to the
  exact employee and runs it).

---

## 12. 60-second demo script

1. Open the app → the hero shows the full team → scroll to **"Rent a fleet of AI employees."**
2. Hire **Accounts** → *"Draft a GST invoice for 120 cartons @ ₹450, 18% GST, buyer
   24AAACC1206D1ZM"* → it returns the invoice + a **one-tap Tally XML** + a **green GSTIN check**.
3. Hire **Receivables** → *"A corporate hasn't paid my ₹4L invoice for 90 days"* → a ready **MSME
   Samadhaan complaint** with Section-16 interest, downloadable as **PDF/Word**.
4. Open **Integrate** → show the one-line API call: "your ERP or a cron job calls this — the workflow
   runs itself."
5. **Telegram** → send a bill photo → Vidya reads it; or hire an employee and reply with a task.
6. Close: *"Not a chatbot that talks — a workforce that works."*
