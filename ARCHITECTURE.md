# Architecture — Saarthi

A deeper look at how Saarthi is built, why, and how the pieces fit. For features and
setup see **[README.md](README.md)**.

---

## 1. Big picture

```
                         ┌──────────────────────────────────────────────┐
                         │                   Vercel                      │
                         │                                               │
  Web browser  ───────►  │  Static frontend (dist/)  ── Vite React SPA   │
   (React SPA)           │                                               │
        │  /api/<x>      │  api/index.js  ──►  server/app.js (Express)   │
        └──────────────► │        │                  │                   │
                         │        │                  ├─► Google Gemini   │
  Telegram  ── webhook ─►│  /api/telegram ───────────┘   (2.5 Flash)     │
                         │                                               │
                         └──────────────────────────────────────────────┘
```

- **One deployment.** The Vite app builds to static `dist/`; the Express API is wrapped as a
  single Vercel **serverless function** (`api/index.js` → `server/app.js`). `vercel.json`
  rewrites `/api/(.*)` to that function, so frontend and API share one origin/URL.
- **Locally** the same Express app runs via `server/index.js` (`app.listen`), and Vite proxies
  `/api` → `:8787` (`vite.config.ts`).
- **Same brain everywhere.** Web, the floating chatbot, and the Telegram bot all call the same
  prompts/schemas in `server/prompts.js`.

---

## 2. Request lifecycle (an agent call)

```
UI tool (e.g. features/Samajh.tsx)
  → lib/api.ts  callFeature("samajh", { text, image, language })
  → POST /api/samajh
  → server/app.js  makeHandler("samajh")
       ├─ no GEMINI_API_KEY?  → return mocks.samajh  (_mock: true)
       └─ generateJSON({ system, parts, schema })  → server/gemini.js
            → Gemini (responseMimeType JSON + responseSchema)
  → typed JSON  → rendered directly by the tool (ResultCard auto-scrolls into view)
```

- **Structured output:** every feature in `prompts.js` declares a strict `responseSchema`
  (using `@google/genai` `Type`). Gemini returns clean typed JSON — no brittle parsing.
- **Multimodal:** image/PDF arrive as base64 `inlineData` parts (Vidya, Asha, Lekh, Bhupati, Smriti).
- **Graceful fallback:** any missing key or API error returns a realistic `mocks[...]` payload
  flagged `_mock: true`, so the UI shows a subtle "sample" badge and demos never break.

---

## 3. AI vs. deterministic (correctness boundary)

The LLM is used for **understanding, extraction and language**. Anything that must be
*correct* is computed **on-device** in plain TypeScript:

| Deterministic (on-device) | Where |
|---|---|
| Income-tax (FY 2025-26 new regime), rebate, cess, capital gains | `src/features/kar/taxEngine.ts` |
| EMI / SIP calculators, 50/30/20 budget | `src/features/console/PaisaConsole.tsx` |
| Scam classifier (rule score) fused with the AI score | `src/features/kavach/engine.ts` |
| Deadlines, on-time forecast, recurrence, `.ics` export | `src/features/console/samayLib.ts` |
| Flood/wildfire risk + resource allocation | `src/features/console/raahatLib.ts` |
| Chat triage keyword fallback | `src/lib/route.ts` |

This keeps figures reproducible and defensible — and the app useful even offline/mock.

---

## 4. Frontend

- **Stack:** React 19, Vite 8, TypeScript, Tailwind CSS v3, Framer Motion v12, lucide-react,
  Leaflet (maps).
- **State / routing:** no router library — `App.tsx` holds a `view` (`"home"` or an agent key)
  inside `AnimatePresence` for smooth transitions. Views are keyed by language so switching
  EN↔HI cross-fades. Scroll position on the landing is saved on open and restored on Back
  (via `onExitComplete`). Deep links (`?agent=`, `?q=`) are read on mount.
- **i18n:** `src/lib/i18n.ts` holds `en`/`hi` dictionaries; `AppContext` exposes `t()` and the
  current language. A `.deva` class provides a Devanagari font fallback.
- **Console pattern:** `features/console/AgentConsole.tsx` is a reusable shell (avatar header +
  tab nav + animated content). Each console supplies an array of modules (Dashboard, the tool,
  extras, and the shared **Emergency** "Already affected?" tab). Tools render standalone or
  `embedded` inside a console via `FeatureShell`.
- **Shared UI:** `components/ui.tsx` (Reveal, Thinking, ResultCard with auto-scroll, ListBlock,
  CopyBlock, …), `Select.tsx` (themed dropdown replacing native `<select>`), `Logo.tsx`
  (`BrandMark`), `AgentAvatar` (photo with monogram fallback).
- **Entry points to help:** the floating `FloatingChat`, the `Helplines` modal (navbar), and
  per-agent consoles — all reachable on every page.

---

## 5. Backend (`server/`)

| File | Role |
|------|------|
| `app.js` | Express app; mounts all `/api/*` routes + the Telegram webhook. Exported (no `listen`). |
| `index.js` | Local dev entry — imports `app` and `listen`s on `PORT`. |
| `gemini.js` | `GoogleGenAI` wrapper; `generateJSON({system, parts, schema})`; `hasKey` flag. |
| `prompts.js` | Per-feature `{ system(language), schema, parts(input) }` — the "brains". Includes `route` (chat triage), `emergency` (worst-case), `assist` (Telegram one-shot), `form16` (PDF extract). |
| `mocks.js` | Demo-safe sample responses per feature. |
| `telegram.js` | Telegram webhook: `/start` + buttons, agent menu, free-text routing, reply-to-talk, deep links. |
| `news.js` | Live scam-news via RSS (cached, with curated fallback). |

`makeHandler(key)` is a generic factory: read `{ language, ...input }`, call Gemini with that
feature's prompt+schema, or fall back to the mock.

---

## 6. Telegram bot

Stateless (serverless-friendly):

- **Inline keyboards** for quick-starts and the agent menu (`callback_query`).
- **"Talk to a specific agent"** via Telegram `force_reply`: the prompt carries a hidden
  `#<agentKey>` tag; the user's reply (`reply_to_message`) is parsed to force that agent.
- One Gemini **`assist`** call both routes (`agent`) and writes the full `reply`; an optional
  `agentHint` biases it when a specific agent was chosen.
- Replies end with an **`APP_URL/?agent=…&q=…`** deep link to continue in the web app.
- **Important serverless detail:** the handler does all work (Gemini + `sendMessage`) and only
  then acks `200` — sending the response first would freeze the lambda before the reply goes out.

---

## 7. Security & resilience

- API key is **server-side only**; never bundled into the client.
- `.env` is gitignored; production secrets live in the Vercel dashboard.
- Every Gemini path has a **mock fallback** → no hard failures on stage.
- Tiles/news/face images degrade gracefully (Leaflet needs internet; faces fall back to a
  tinted monogram).

---

## 8. Extending — add a new agent

1. `src/lib/api.ts` — add the key to `FeatureKey`.
2. `src/lib/features.tsx` — add a `FeatureMeta` (icon, accent, photo, stats, group).
3. `src/lib/i18n.ts` — add `name/tag/desc/persona` (+ any tool strings) in `en` and `hi`.
4. `server/prompts.js` — add a feature `{ system, schema, parts }`; export it in `features`.
5. `server/mocks.js` — add a demo-safe mock.
6. `server/app.js` — `app.post("/api/<key>", makeHandler("<key>"))`.
7. Build a tool component + a console (reuse `AgentConsole`, add the `Emergency` module).
8. Wire the view in `src/App.tsx`. It auto-appears in the landing grid, nav, footer and chat
   router (add a keyword set in `src/lib/route.ts`).
