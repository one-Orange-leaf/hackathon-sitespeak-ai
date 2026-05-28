# SiteSpeak AI — Architecture, Decisions & Roadmap
**Panathenea Hackathon 2026 | 28–29 May**
**Team:** Anthony Paraskevakis, Pavlos Avgerinos, Maria Papakonstantinou, Yiota Minou

---

## What We Built

SiteSpeak AI is a mobile-first progressive web application for construction site workers. A worker taps one button, speaks a voice note in any language, optionally photographs the problem, confirms with a map preview of their location, and sends. In under 10 seconds, a structured task card appears in Trello — categorised, prioritised, with materials listed, GPS coordinates, a Google Maps link, and the photo attached.

**The positioning:** Every construction site management tool is built for the PM at the desk. SiteSpeak is the only one built for the worker with dirty gloves.

---

## The Problem

Construction sites in Greece run on verbal communication. A foreman notices a problem — missing rebar, a water leak, a faulty socket — and either tells someone verbally (forgotten by lunch) or tries to type it into a phone with dirty gloves in direct sunlight. Neither works reliably. Tasks fall through the cracks, materials don't get ordered, incidents go unlogged.

The gap is between *noticing something on-site* and *that thing entering a system where it can be acted on*. Voice is the natural medium for that moment. Typed forms are not. Photos capture what words miss.

---

## Full Pipeline

```
Worker's phone (Chrome/Safari/Firefox)
  │
  ├─ 1. QR code scan → URL params set worker_id + site_id
  ├─ 2. Page load → GPS requested, cached silently
  ├─ 3. Worker taps RECORD → MediaRecorder captures audio (webm/ogg/mp4)
  ├─ 4. Worker taps again → recording stops (or 30s auto-stop)
  ├─ 5. Audio blob → POST /api/transcribe (raw binary)
  │
  ├─ Vercel Serverless: api/transcribe.js
  │    └─ OpenAI Whisper (whisper-1, verbose_json)
  │         Returns: { transcript, detected_language }
  │
  ├─ 6. Confirm panel → transcript, map preview, identity, photo
  ├─ 7. Worker taps SEND
  ├─ 8. JSON payload → POST /api/analyze
  │
  ├─ Vercel Serverless: api/analyze.js
  │    ├─ Claude Haiku 4.5 (forced tool use → submit_task)
  │    │    Returns: { task_title, category, urgency,
  │    │               materials_requested, summary } — always English
  │    └─ Make.com webhook (awaited, status returned to client)
  │         ├─ Trello: Create Card
  │         ├─ ImgBB: Upload photo (if present)
  │         └─ Trello: Add Attachment (photo URL)
  │
  └─ Result card shown: English title, urgency badge,
     materials pills, summary, [WORKER INPUT] block (original language)
```

---

## Technology Stack

| Concern | Decision | Alternative Considered |
|---|---|---|
| Frontend | Vanilla JS, no framework, no bundler | React — rejected: build complexity, no benefit for single-screen app |
| Backend | Vercel serverless, Node.js ESM | Express on Railway — rejected: unnecessary infrastructure |
| AI extraction | Claude Haiku 4.5, forced tool use | Gemini Flash — rejected (see D1 below) |
| Transcription | OpenAI Whisper via /api/transcribe | Web Speech API — rejected (see D2 below) |
| Structured output | Anthropic tool use, forced tool_choice | Prompt-based JSON parsing — rejected: brittle on demo day |
| Photo compression | Canvas API + FileReader, JPEG 0.7, 800px | None — uncompressed = 6000+ tokens, $0.50/photo |
| Webhook routing | Make.com → Trello + ImgBB | Native Trello API — deferred post-hackathon |
| Animation | CSS Layer 1 + @motionone/dom CDN Layer 2 | GSAP — rejected: commercial license ambiguity |
| PWA | manifest.json + versioned service worker | Native app — not needed for demo |
| npm dependencies | 1 (@anthropic-ai/sdk) | Multiple — rejected: zero build step |

---

## npm Dependencies — Why Only One?

`package.json` lists a single npm dependency: `@anthropic-ai/sdk`. Every other external service is called differently.

| API | How it's called | Why no npm package needed |
|---|---|---|
| Anthropic Claude | `@anthropic-ai/sdk` | SDK handles auth, retries, tool use parsing, typed responses — worth the dependency |
| OpenAI Whisper | Native `fetch()` to `api.openai.com` | A single HTTP POST with FormData — no SDK needed |
| Google Maps Static | `<img src="...maps.googleapis.com...">` | Literally just an image URL in HTML — no JavaScript at all |
| Make.com webhook | Native `fetch()` POST | A single HTTP call — no SDK needed |
| Nominatim (OpenStreetMap) | Native `fetch()` to `nominatim.openstreetmap.org` | Free, no key, no account. Requires `User-Agent` header or requests are blocked. Returns human-readable address from GPS coordinates. |

The principle: add an npm dependency only when it provides something you cannot easily replicate with native `fetch`. The Anthropic SDK does — it handles streaming, tool use response parsing, and typed objects. The others do not. Zero build step, zero dependency conflicts, zero vulnerability surface on demo day.

---

## Canvas API — What It Is and Why No Key Is Needed

The Canvas API is a **built-in browser feature** — part of every modern browser, the same way `document.getElementById` is. It has nothing to do with Canva (the design app). No account, no key, no cost.

We use it to compress photos before sending them to Claude:

```js
const canvas = document.createElement('canvas')
const scale  = Math.min(1, 800 / img.width)
canvas.width  = Math.round(img.width  * scale)
canvas.height = Math.round(img.height * scale)
canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7)
```

This runs entirely in the browser before any network call is made. It scales the image to a maximum of 800px wide and compresses it to JPEG at 70% quality.

**Why this matters:**

| | Tokens | Cost per photo |
|---|---|---|
| Uncompressed phone photo (4–6MB) | ~6,000 | ~$0.50 |
| Compressed (800px, JPEG 0.7) | ~1,600 | ~$0.013 |

Without compression, a single photo submission would cost more than the entire 50-request demo budget. The Canvas API solves this for free, in the browser, in under 100ms.

Note: we use `FileReader → new Image() → Canvas → toBlob` rather than the simpler `createImageBitmap` path because `createImageBitmap` is not supported on iOS 14. The FileReader path works on all browsers back to iOS 12.

---

## Make.com Scenario — Exact Structure

The current production scenario (confirmed working):

```
Webhooks (Custom webhook)
  → Trello (Create a Card)
  → [Filter: image Exists]
  → HTTP (POST to ImgBB API — generic HTTP module, not a dedicated ImgBB connector)
  → Trello (Add an Attachment)
```

The HTTP module posts the base64 image to `https://api.imgbb.com/1/upload`. ImgBB returns a URL. That URL is attached to the Trello card. The filter prevents the HTTP and attachment steps from running when no photo was submitted — without it, ImgBB returns `Empty upload source` and the scenario errors.

---

## Key Architecture Decisions

### D1 — Anthropic over Gemini

We evaluated both. Anthropic's tool use API forces the model to respond with a typed object conforming to our JSON schema — it physically cannot return free text. Gemini's `responseSchema` reduces but does not eliminate the risk of malformed output. For a live demo where JSON parsing failure would be visible to judges, this difference matters. Claude Haiku is also the fastest model in the Claude family — appropriate for a single-turn extraction task.

### D2 — OpenAI Whisper over Web Speech API

Web Speech API has no cross-browser support (Firefox, DuckDuckGo, Samsung Internet all fail), locks transcription to a single language (`lang: 'el-GR'` breaks Mandarin), and processes audio on-device without language detection. Whisper runs server-side, auto-detects language, handles noisy construction environments better, and returns a `detected_language` field we use to drive the readback voice. All browsers use MediaRecorder for audio capture — no browser detection needed for input mode.

### D3 — Forced Tool Use for Guaranteed JSON

```js
tool_choice: { type: 'tool', name: 'submit_task' }
```

With this single line, Claude cannot respond with free text. The response is always a typed object. `response.content.find(b => b.type === 'tool_use').input` is already a parsed JS object — no `JSON.parse`, no markdown fence stripping, no error surface on demo day.

### D4 — English Output Regardless of Input Language

Workers speak any language. Claude always outputs `task_title` and `summary` in English. The original transcript (in the worker's language) is stored separately and shown in the `[WORKER INPUT]` block on the result card. The Trello card receives English fields — readable by the Greek PM at the desk without translation. This is one system prompt instruction, not a code branch.

### D5 — URL Param Identity (Phase A)

Workers are identified by QR codes encoding URL params: `?site=Ellinikon&worker=Lars+Rasmussen`. No login, no account, no app install. The PM prints QR codes, one per worker or one per zone. Identity persists for the session — `clearAppState()` does not reset `worker_id` or `site_id`. Phase B replaces this with Worker PINs and authenticated identity.

### D6 — GPS Cached on Page Load

GPS is requested once on page load, silently, as part of app init. Never requested mid-flow — that fires a blocking permission modal at the worst possible moment (when the worker is about to record). `maximumAge: 60000` reuses cached fix up to 1 minute, reducing battery drain. `null` coordinates never block submission.

### D7 — Webhook Awaited, Status Returned

Original design: fire and forget. Reversed after review. The webhook is now awaited — `webhook_ok: true/false` is returned to the client and displayed on the result card ("✓ Sent to Trello"). Judges see confirmation without switching screens. If the webhook fails, the AI result still displays correctly. The status is informational, not blocking.

### D8 — FileReader Image Compression (Not createImageBitmap)

`createImageBitmap` is not supported on iOS 14. We use `FileReader → new Image() → Canvas → toBlob` — works on all browsers back to iOS 12. Uncompressed phone photos are 6000+ tokens (~$0.50 per photo at Haiku pricing). Compressed to 800px width, JPEG 0.7 = ~1600 tokens. Mandatory before transmission.

### D9 — In-Memory Usage Cap + Client Cooldown

Two-layer protection for demo context. Layer 1: 50-request aggregate cap per 12-hour window in `api/analyze.js` — prevents runaway API charges. Layer 2: 2-second client-side cooldown on the restart button — prevents a single judge rapidly burning the cap. Total cost at 50 requests including vision: $0.05–0.07.

### D11 — Whisper Language Detection Drives Readback

Whisper returns `detected_language` alongside the transcript (e.g. `"el"`, `"zh"`, `"en"`). This field is stored in `appState.detectedLanguage` and used to set the language of the speech synthesis readback button in the confirm panel. A Greek worker hears Greek readback. A Mandarin worker hears Mandarin. This is one line — `utt.lang = appState.detectedLanguage` — not a code branch per language.

### D12 — Phase A / Phase B Architecture Split

The build is deliberately split into two phases:

**Phase A (current build):** Full pipeline proven end-to-end. GPS active. Worker identity via QR code URL params (`?site=X&worker=Y`). `worker_id` and `site_id` are null when no params present. Every response envelope includes these fields regardless — null in Phase A, populated in Phase B.

**Phase B (next build):** Per-site webhook routing, manager dashboard, Supabase data layer, Worker PINs for authenticated identity. No structural refactor of Phase A code required — the data model, API schema, and Make.com payload shape were all designed with Phase B fields from day one.

### D13 — Judge Personalisation via QR Codes

Each judge and team member has a personalised QR code encoding their name and an assigned construction site. When a judge scans their code, their name and site appear in the confirm panel and Trello card — making the demo feel live and real rather than generic.

| Judge | Site | Why |
|---|---|---|
| Lars Rasmussen | Ellinikon (Athens) | Co-founder of Google Maps — the Google Maps link in every card is his work |
| Mads Rydahl | Grand Paris Express | Founding CPO of Siri — same voice-first problem, industrial scale |
| Christian Dorffer | Fehmarnbelt Tunnel | Partner at Florent VC — Scandinavian tunnel, multinational workforce |
| Thomas Dohmke | Sagrada Família | Founder of Entire.io — world's longest-running project, commit log analogy |

Team QR codes use `site=Panathenea2026` — honest about the context.

---

## Demo Day Resource Plan

**Primary plan:** Use the working production URL. No rebuild needed.

**Contingency 1 — Claude Code quota:** If Claude Code hits the claude.ai Pro 5-hour window limit mid-rebuild, switch to API key mode:
```bash
ANTHROPIC_API_KEY=sk-ant-... claude
```
This bypasses the subscription quota entirely and bills directly to the Anthropic API account at pay-as-you-go rates. Full rebuild cost at API rates: ~$0.15.

**Contingency 2 — Buy extra usage:** Claude Pro allows purchasing additional usage credits during a session. If quota is low before the sprint, add credits via the claude.ai settings before the clock starts.

**Contingency 3 — Repo recovery:** If the environment breaks but the repo is intact, recovery is: `git clone` → `npm install` → add `.env.local` → `vercel link` (existing project, not new) → `vercel --prod`. Running in under 10 minutes without any AI generation.

**Critical note:** `vercel link` must connect to the existing `sitespeak-ai` project — not create a new one. A new project gets a new domain and all 8 printed QR codes stop working.

---

## Bugs We Hit and Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| `createImageBitmap` crash on iOS | API not supported on iOS < 15 | FileReader + Image + Canvas path |
| Coordinates showing as `3823.756` in Trello | Make.com joining lat and lng with no separator | Two separate tokens with `, ` between them |
| Service worker caching broken build | Old cache served after deploy | Versioned cache key — increment on every deploy |
| `[WORKER INPUT]` block invisible on Android | CSS specificity conflict between `display:none` and `style.display` | Switched to `.visible` class toggle instead of inline style |
| ImgBB error on no-photo submissions | Make.com running ImgBB step even when `image` is null | Added `image Exists` filter before HTTP module |
| Readback auto-playing on iOS Safari | `speechSynthesis.speak()` called outside user gesture | Moved to opt-in button tap — iOS requires user gesture |
| Counter counting down (49/50, 48/50) | Displaying `remaining` instead of `count` | Changed to `d.count / d.max` |
| Coordinates null on short recordings | GPS still pending when confirm panel opened | `enterConfirming()` waits up to 3s for GPS to leave `pending` |
| Tab switch reset all state mid-recording | `visibilitychange` unconditional reset | Selective: only `recording` state triggers stop, all others preserved |
| Discard during send corrupted state | In-flight fetch had no abort mechanism | AbortController on every fetch, aborted in `clearAppState()` |

---

## Security Decisions

- API keys server-side only — never in client-side code or API responses
- Google Maps key in HTML source — acceptable because the key is referrer-restricted in Google Cloud Console to `sitespeak-ai.vercel.app/*` and `localhost`. No other domain can use it.
- Audio sent to OpenAI Whisper for transcription only — never stored server-side, never logged
- Input sanitisation applied before every Claude call: 2000 character cap, backtick and backslash stripping applied identically to all input paths
- CORS headers on all API responses
- `.env.local` gitignored — API keys never touch the GitHub repository

---

## Cost Model

| Item | Per request | 50 requests |
|---|---|---|
| Claude Haiku input (~400 tokens) | $0.0001 | $0.005 |
| Claude Haiku output (~150 tokens) | $0.0001875 | $0.009 |
| Whisper (30s audio @ $0.006/min) | ~$0.003 | $0.15 |
| Vision (when photo attached) | ~$0.001 | $0.05 |
| **Total ceiling** | **~$0.005** | **~$0.21** |

Make.com: free tier, 1000 operations/month.
ImgBB: free tier, no rate limit at demo volume.
Google Maps Static: $2 per 1000 requests — 50 demo requests = $0.10.
Vercel: free hobby tier, no cost.

**Total demo day cost: under €0.35.**

---

## Competitive Landscape

**Procore, Autodesk Build, Fieldwire:** serve the PM at the desk. Cost €200+/user/month. Require full company onboarding. Workers don't use them — they tolerate them. English-first. Not designed for point-of-notice capture.

**Otter.ai, Fireflies:** transcription only. Output is a wall of text. Worker still has to re-enter data manually.

**Apple/Google Dictation:** transcription only. No extraction, no routing, no structure.

**The gap:** zero-onboarding, voice-first, photo-aware, language-native, structured capture that integrates with whatever the company already uses via webhook. Workers don't install anything. Scan a QR code, speak, done.

---

## Roadmap

### Q3 2026 — Worker PINs
Replace URL param identity with authenticated PINs. Worker enters a 4-digit code, app looks up their identity server-side. No change to the data model — `worker_id` and `site_id` are already in the Phase A payload. Higher security, same UX friction.

### Q4 2026 — HSE Alerts
AI detects safety incident language in the transcript and triggers a separate high-priority alert channel. No schema change needed — `category: 'safety'` and `urgency: 'critical'` already exist. A second Make.com scenario routes critical safety submissions to a dedicated Slack channel or SMS.

### V1 Post-Hackathon — Supabase Data Layer
Replace Make.com with direct Supabase integration. Every submission logged, queryable. Manager dashboard aggregating tasks by site, category, and urgency over time. Per-site webhook routing. Per-IP rate limiting with Vercel KV.

### V2 — Offline Queuing
Device records and queues submission when connectivity is poor. Fires automatically when signal returns. Critical for underground sites and basement work. Uses Service Worker Background Sync API.

### V2 — UI Localization
Bulgarian, Albanian, Romanian — the three most common non-Greek languages on Greek construction sites. One `lang` attribute change per locale. UI localization is separate from voice input language, which already works for any language Whisper supports.

---

## Monetization

**Option 1 (primary): Per-site SaaS subscription**
€49–99/month per active construction site. Flat fee, not per user. One PM buying for a 10-site portfolio: €500–1000/month. You don't need many customers to be viable.

**Option 2: White-label / integration license**
License the voice capture layer to larger platforms (Procore, Fieldwire) that don't want to build Greek or multilingual capture themselves. Partnership or exit play.

**Option 3: Usage-based (weakest)**
Per-transcription pricing creates friction at exactly the wrong moment — the point of capture. Greek foremen don't want to think about cost when they're reporting a problem.

**The moat:** each company's logged submissions become training data. The tool learns their specific sites, suppliers, material names, and crew roles over time. That's why you charge monthly, not per-use.

---

## Market Size

Greece has approximately 150,000 active construction workers. Fewer than 8% use any form of digital on-site logging. The architecture is language-agnostic by design — demonstrated live with the Mandarin scenario. Any market where construction workers don't speak the language of enterprise software is a target. The EU construction workforce is approximately 18 million people.

---

## Project File Map

Every file in the repository and what it does.

### Frontend — runs in the worker's browser (`public/`)

| File | Role |
|---|---|
| `index.html` | The skeleton of the entire app. Defines every button, panel, and text area the worker sees. Contains zero logic — just structure. Every element has a unique ID that `app.js` and `style.css` reference by name. |
| `style.css` | Controls everything visual — colours, layout, fonts, animations. Uses `body[data-state]` attribute selectors to show and hide panels. When `app.js` changes the app state, CSS does all the showing and hiding automatically. No JS needed for visibility. Designer's exclusive file — never needs to touch `app.js`. |
| `app.js` | The brain of the frontend. Handles the entire user journey: GPS on load, identity from QR code URL params, MediaRecorder audio capture, sending audio to Whisper, confirm panel rendering, Google Maps embed, sending to Claude, displaying the result card. The most complex file in the project — 600+ lines. |
| `motion.js` | Optional animation layer. Adds smooth transitions when panels appear, the record button scales on tap, and the result card cascades in. Uses `@motionone/dom` from CDN via a lazy dynamic import — if the CDN fails, the app continues without animations. CSS Layer 1 handles all critical visibility regardless. |
| `sw.js` | The service worker. Caches the app shell (HTML, CSS, JS) so it loads instantly even on poor connections. API calls always go to the network — never cached. The version string (`sitespeak-v3`) must be incremented on every deploy — without this, phones serve the old cached version even after a fix is pushed live. |
| `manifest.json` | Tells the browser the app is installable as a PWA. Defines the app name, icons, dark background colour, and standalone display mode (no browser chrome when launched from the home screen). Without this file, Chrome never shows the "Add to home screen" prompt. |

### Backend — runs on Vercel serverless Node.js (`api/`)

| File | Role |
|---|---|
| `transcribe.js` | Receives the raw audio blob from the worker's phone and forwards it to OpenAI Whisper (`whisper-1`, `verbose_json` format). Returns the text transcript and the detected language (`el`, `zh`, `en`, etc.). This is why the app works in any language — Whisper auto-detects it server-side. No audio is stored. |
| `analyze.js` | The core AI endpoint. Receives the transcript, GPS coordinates, photo (base64), worker identity, and site ID. Calls Claude Haiku with forced tool use — guaranteed structured JSON output. Builds the Trello payload and awaits the Make.com webhook. Returns the full result envelope to the frontend including `webhook_ok` status, `transcript`, and `detected_language`. Also handles the `GET` request that returns the usage counter. |

### Configuration — tells Vercel and npm how to run the project

| File | Role |
|---|---|
| `package.json` | Declares the project name and its single npm dependency: `@anthropic-ai/sdk`. One dependency only — no build step, no bundler, no compilation. Run `npm install` once and you're done. |
| `package-lock.json` | Auto-generated by npm. Locks the exact version of every dependency (and every dependency's dependency) so the install is identical on any machine. Never edited manually — committed to git so hackathon day installs are reproducible. |
| `vercel.json` | Tells Vercel how to deploy the two serverless functions. Sets `analyze.js` timeout to 45 seconds (Whisper + Claude sequential call) and `transcribe.js` to 30 seconds. Without this file, Vercel uses a 10-second default and both functions time out before returning a result. |
| `.gitignore` | Prevents `.env.local` (which contains all API keys) from being committed to GitHub. If this file were missing and the repo were pushed, all API keys would be publicly exposed. First file created in any project — never removed. |
| `.env.local` | Not in the repo — gitignored. Contains `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `MAKE_WEBHOOK_URL`. These three secrets are the only things connecting the app to external paid services. Must also be set in the Vercel Dashboard for production and preview environments. Keep a copy offline. |

### Documentation — not shipped to users, stay in the repo for reference

| File | Role |
|---|---|
| `CLAUDE.md` | Read automatically by Claude Code at every session. Contains every architectural constraint, naming convention, API schema, and coding rule. The single source of truth for the codebase — if anything changed mid-build, it was recorded here first. |
| `ARCHITECTURE.md` | This file. Leave-behind document for judges and mentors. Full pipeline, every technology decision with alternatives considered, bugs hit and fixed, security model, cost breakdown, competitive landscape, and roadmap. |
| `DEMO.md` | Demo script, talking points, failure recovery scripts, and anticipated judge Q&A with prepared answers. Every scenario — Greek, Mandarin, photo-only — is scripted. The silent fallback signal protocol is defined here. |
| `PITCH.md` | Judge preparation document. Competitive landscape, monetization options ranked by viability, market size, and the one-line positioning statement. |
| `RUNBOOK.md` | Operational playbook for hackathon day. Symptom → cause → fix → judge line tables for every failure mode we encountered during the build. Pre-demo preflight checklist with curl commands. Emergency redeploy procedures. Kept open on the support laptop throughout the demo. |
| `PLANNING.md` | Architecture decision log from the pre-hackathon planning session. Records every decision made and the alternative rejected. Do not modify during execution — reference only. |
| `SUMMING.md` | Session handoff file. Updated at the end of every Claude Code session. Answers "where are we right now" — current build step, last completed action, active blockers, environment state, gate results, and next actions. |
| `TESTING.md` | Gate checklist, crush test matrix, and enforced step sequence. Every development step must pass the full gate before the next step begins. Referenced by `CLAUDE.md`. |
| `PRD.md` | Product Requirements Document. Full bug list with severity, all confirmed requirements by build block, UI polish spec, Make.com walkthrough, and the definition of done. |
| `HACKATHON_PROMPT_V3.md` | Emergency rebuild prompt. Paste into Claude Code to regenerate all 10 source files from scratch. Includes environment setup, Make.com rebuild steps, Vercel deployment steps, QR code URLs, and a 14-step completion checklist. Use only if the repo is lost. |
| `README.md` | Project entry point on GitHub. Currently a brief Greek description from the initial commit. Should be updated post-hackathon with full setup instructions for public release. |
| `LICENSE` | Legal terms under which the code is shared. Defines what others can and cannot do with the source code. |

---

## Data Privacy

**What to say when judges ask:**

"Audio is sent to OpenAI Whisper for transcription and then discarded. We do not store audio server-side. Only the text transcript is retained in the task record. By default, OpenAI does not use API inputs to train their models."

This is the complete and honest answer. The privacy story is strong: no permanent audio storage, no recordings accessible beyond the transcription call, no user accounts, no data retained between sessions. The only persistent data is what lands in Trello — which the site manager already controls.
