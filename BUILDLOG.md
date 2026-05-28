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

## Step 4 — Frontend Logic
**Time:** 12:45pm
**Files:** public/app.js
**Commit:** feat: app state machine, recording, transcription fetch, confirm panel, result card
**Why:** Single-file frontend brain. State machine driven by `document.body.dataset.state`
attribute — CSS handles all show/hide, JS never touches classList for visibility.
GPS requested on page load (never mid-flow). MediaRecorder with MIME type negotiation
covers Chrome/Firefox/Safari without any browser-detection branching. compressImage()
uses FileReader → Image → Canvas → toBlob for iOS 14 compat (createImageBitmap absent).

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

## Post-Build — Bug Fixes and Hardening (24 May 2026)
**Files:** api/analyze.js, api/transcribe.js, public/app.js
**Commits:** multiple fix: commits (see git log)

Key fixes applied before the hackathon demo window:

| Fix | Root Cause | File |
|---|---|---|
| Coordinates showing as `3823.756` in Trello | Make.com joining lat/lng with no separator | Make.com scenario |
| Counter counting down (49/50) | Displaying `remaining` instead of `count` | app.js |
| Discard during send corrupted state | No AbortController on in-flight fetch | app.js |
| Tab switch during recording reset all state | `visibilitychange` was unconditional reset | app.js |
| Readback auto-playing on iOS Safari | `speechSynthesis.speak()` outside user gesture | app.js |
| `[WORKER INPUT]` block invisible on Android | CSS specificity conflict with inline style | style.css |
| ImgBB error on no-photo submissions | Make.com ran ImgBB step when `image` was null | Make.com scenario |
| GPS null on short recordings | GPS still `pending` when confirm panel opened | app.js |
| analyze.js body parsing | Vercel auto-parsed body before raw read | api/analyze.js |
| transcribe.js body parsing | Body read pattern mismatch | api/transcribe.js |

---

## Documentation Overhaul (24 May 2026)
**Files:** ARCHITECTURE.md, DEMO.md, CLAUDE.md, SUMMING.md, README.md, BUILDLOG.md
**Why:** Pre-demo documentation pass — added D11 (language detection drives readback),
D12 (Phase A/B architecture split), D13 (judge personalisation via QR codes) to
ARCHITECTURE.md. DEMO.md updated with full judge QR code table and Mandarin scenario.
Service worker bumped to `sitespeak-v4`.

---

