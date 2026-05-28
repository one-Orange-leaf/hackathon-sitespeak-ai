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

