# SiteSpeak AI — Session Handoff
> READ THIS FIRST at the start of every Claude Code session.
> UPDATE THIS LAST before ending any Claude Code session.
> Keep it under 60 lines. Delete resolved blockers immediately.
> Source of truth for "where are we right now."

---

## Current Build Step
**Step:** All build blocks complete. Production live.
**Status:** Hackathon day active — 28 May 2026. Demo window open.

---

## Last Completed Action
Pre-demo preflight — 28 May 2026:
- RUNBOOK.md preflight executed: both endpoints curl-confirmed, webhook_ok: true
- Make.com active, counter confirmed low
- All 8 QR cards physically in hand, Lars QR identity flow verified
- Damage photo in camera roll
- Trello board on second screen

Prior session (24 May 2026) — full documentation overhaul:
- CLAUDE.md, ARCHITECTURE.md (D11/D12/D13 added), DEMO.md, PITCH.md, PRD.md v2.0
- HACKATHON_PROMPT_V3.md, PLANNING_SUMMARY.md, README.md all updated
- Coordinates format fixed in Make.com (lat, lng separated correctly)
- Result card redesigned — [WORKER INPUT] block confirmed on all platforms
- Counter corrected to count up (1/50)
- Service worker at sitespeak-v3, cache clean

---

## Active Blockers
None.

---

## Environment State
| Item | Status | Notes |
|---|---|---|
| ANTHROPIC_API_KEY | ✅ Set | Production + Preview |
| OPENAI_API_KEY | ✅ Set | Production + Preview |
| MAKE_WEBHOOK_URL | ✅ Set | Production + Preview |
| GOOGLE_MAPS_KEY | ✅ In HTML | Referrer-restricted to sitespeak-ai.vercel.app/* + localhost |
| MAX_REQUESTS | ✅ 50 | Counter low after preflight reset |
| Service Worker | ✅ sitespeak-v4 | Cache clean on Android Chrome |
| Branch | main | All changes deployed |
| Production URL | ✅ Live | https://sitespeak-ai.vercel.app/ |
| Make.com | ✅ Active | Webhook → Trello → ImgBB filter → Trello Attachment |

---

## Gate Results
| Scenario | Result |
|---|---|
| End-to-end Greek voice + photo | ✅ PASS — Trello card + photo attached |
| Mandarin voice → English output | ✅ PASS |
| Photo-only path | ✅ PASS |
| QR code identity — all 8 | ✅ PASS — Chrome Android |
| [WORKER INPUT] block | ✅ PASS — all platforms |
| Coordinates format | ✅ PASS — lat, lng separated |
| Counter direction | ✅ PASS — counts up 1/50 |
| GPS + Maps in confirm panel | ✅ PASS |
| Make.com ImgBB filter | ✅ PASS — no error on no-photo submissions |
| Firefox path | ⚠ UNVERIFIED — bug fixes applied (tab switch, MediaRecorder), no formal gate entry |
| iOS Safari | ⚠ UNVERIFIED — readback auto-play fix applied, no formal gate on production URL |

---

## Known Debt
- Firefox and iOS Safari: underlying bugs fixed (see ARCHITECTURE.md bug log), formal gate entries never added to TESTING.md
- BUILDLOG.md ends at Step 8 — 24 May documentation overhaul not captured there
- CLAUDE.md pre-hackathon checklist contains historical pending items (cosmetic, do not act on)
- Per-IP rate limiting deferred to V1
- Native Trello API integration (replace Make.com) deferred to V1

---

## Resource Contingency (active today)
Quota low → `ANTHROPIC_API_KEY=sk-ant-... claude` (API key mode, bypasses Pro quota)
Repo recovery → `git clone` → `npm install` → `.env.local` → `vercel link` (EXISTING project, not new) → `vercel --prod`
**Critical:** `vercel link` must connect to existing `sitespeak-ai` project — new project = new domain = all 8 QR codes dead.