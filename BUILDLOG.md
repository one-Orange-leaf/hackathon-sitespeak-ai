# SiteSpeak AI — Build Log
> Hackathon: Panathenea 2026 — 28-29 May 2026
> Team: Tony
> Start time: ~10:00 EET

---

## Step 1 — Project Scaffold
**Time:** 10.30am
**Files:** .gitignore, package.json, vercel.json
**Commit:** chore: project scaffold, package.json, vercel config
**Why:** Establish project identity, declare the single npm dependency
(@anthropic-ai/sdk), and configure Vercel serverless function runtimes
before writing any application code.
**Claude Code prompt:** Scoped to scaffold only — no application logic.

---

## Step 2 — HTML Skeleton
**Time:** 11:50am
**Files:** public/index.html
**Commit:** feat: html skeleton with state-driven panels
**Why:** Markup-only skeleton defines every panel and element ID the app needs.
CSS and JS reference these IDs — clean separation of concerns means the
designer owns style.css exclusively and never touches app logic.
**Claude Code prompt:** Scoped to markup structure only.

---

## Step 3 — Stylesheet
**Time:** 12:20pm
**Files:** public/style.css
**Commit:** feat: mobile-first stylesheet with state machine visibility
**Why:** All show/hide logic lives in CSS via body[data-state] (idle, recording, transcribing, confirming, sending, done, error) selectors. 
JS only changes one attribute — CSS does all the visibility work. 
Designer can restyle freely without touching app logic.

---

## Step 4 — App Logic
**Time:** 12:40pm
**Files:** public/app.js
**Commit:** feat: app state machine, media recorder, GPS, photo compression
**Why:** Core brain of the frontend. State machine drives all UI transitions. 
GPS requested on load only — never mid-flow. Photo compressed before transmission 
to keep API costs low (~1600 tokens vs 6000+ uncompressed).

---

## Step 5 — Transcription Endpoint
**Time:** 13:00
**Files:** api/transcribe.js
**Commit:** feat: whisper transcription endpoint with multipart parsing
**Why:** Separate transcription endpoint means Whisper errors surface before 
Claude is called — cleaner debugging. verbose_json returns detected_language 
in one pass, no second API call needed. bodyParser: false is mandatory — 
Vercel's default parser corrupts raw binary audio.

---

## Step 6 — Analysis Endpoint
**Time:** 13.15
**Files:** api/analyze.js
**Commit:** feat: claude haiku extraction, forced tool use, make.com webhook
**Why:** Forced tool use (tool_choice: tool) guarantees structured JSON — no 
prompt-engineering tricks, no JSON.parse on free text. Webhook is awaited and 
status returned to client. 50-request cap protects demo budget (total cost ~$0.05-0.07).

---

## Step 7 — Motion Helpers
**Time:** 13:35
**Files:** public/motion.js
**Commit:** feat: motion helpers for UI animations
**Why:** Lightweight animation layer — pulseElement() and fadeIn() add tactile 
feedback to state transitions without any external dependency. Defensive design: 
both functions null-check the element before animating so a missing DOM node 
never throws. Optional layer — app works fully without it.

---

## Step 8 — PWA
**Time:** 13:45
**Files:** public/sw.js, public/manifest.json
**Commit:** feat: service worker and PWA manifest
**Why:** Service worker enables offline error handling on API routes and 
installable PWA on Android Chrome. Cache versioned — increment on every 
deploy to force fresh files to installed clients.

---

