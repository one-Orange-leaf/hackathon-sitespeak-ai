# SiteSpeak AI — Hackathon Day Runbook
**Panathenea 2026 | 28–29 May**
**Keep this open on the support laptop. Do not close this tab.**

---

## Pre-Demo Preflight Checklist

Run this 10 minutes before the demo slot. One person reads, one person checks.

```
ENVIRONMENT
[ ] Production URL loads: https://sitespeak-ai.vercel.app
[ ] App reaches idle state (record button visible, no errors in console)
[ ] Usage counter low: curl https://sitespeak-ai.vercel.app/api/analyze
    → Expected: {"count":N,"max":50,"remaining":50-N}
[ ] Vercel dashboard shows last deploy as READY (not building/error)

API CONNECTIVITY
[ ] Trello board open and showing correct board (support laptop)
[ ] Make.com scenario is ON (not paused) — check Make.com dashboard
[ ] ImgBB free tier not exhausted — check imgbb.com dashboard if photos used

DEMO DEVICE
[ ] Demo phone on WiFi (not mobile data)
[ ] Chrome/Safari microphone permission pre-granted
[ ] GPS permission pre-granted (open app once to trigger)
[ ] Camera roll has test photo ready for Scenario C
[ ] Screen brightness max — direct sunlight visibility
[ ] Do Not Disturb ON
[ ] Battery > 50%

QR CODES
[ ] Personalised judge QR codes printed or on screen
[ ] Team QR codes available
[ ] Test scan one QR code — confirm identity appears in confirm panel

TEAM
[ ] Silent signal protocol agreed (see DEMO.md)
[ ] Support laptop open on Trello board
[ ] Support laptop browser tab open on Vercel dashboard
[ ] Tony has production URL open on personal phone as backup
```

---

## Failure Mode Tables

For each symptom: cause → fix → what to tell the judge.

---

### F1 — App won't load at all

| | |
|---|---|
| **Symptom** | White screen, spinner that never resolves, or network error |
| **Likely cause** | Venue WiFi blocking Vercel CDN, or last deploy failed |
| **Check first** | Vercel dashboard → Deployments — is latest deployment READY or ERROR? |
| **Fix A** | Switch phone to mobile data hotspot and reload |
| **Fix B** | Open `curl https://sitespeak-ai.vercel.app` in terminal — if 200, it's a browser issue |
| **Fix C** | Hard reload: hold reload button → "Empty caches and hard reload" |
| **Fix D** | Open DevTools → Application → Service Workers → click "Update on reload" → refresh |
| **Judge line** | "We're switching to a backup connection — venue WiFi has some latency." |

---

### F2 — Microphone permission denied / mic not working

| | |
|---|---|
| **Symptom** | RECORD tap does nothing, or browser shows permission denied |
| **iOS fix** | Settings → Safari → Microphone → Allow for sitespeak-ai.vercel.app |
| **Android fix** | Settings → Apps → Chrome → Permissions → Microphone → Allow |
| **If no time to fix** | Switch to Scenario C (photo-only) — no mic needed at all |
| **Judge line** | "Let me show you the photo-only path — works the same, no voice needed." |

---

### F3 — Recording starts but transcript comes back empty

| | |
|---|---|
| **Symptom** | Confirm panel shows empty transcript box |
| **Likely cause** | Audio blob too short (<0.5s), or Whisper returned no speech detected |
| **Fix** | Tap restart, record again — speak louder, 3+ seconds, hold phone closer to mouth |
| **Alternative** | Photo-only submission — empty transcript is valid if a photo is attached |
| **Judge line** | "Let me record that again — Whisper is very accurate but prefers a few seconds of speech." |

---

### F4 — Whisper returns 500 / transcription fails

| | |
|---|---|
| **Symptom** | Error state after recording, console shows `/api/transcribe` returning 500 |
| **Check** | `curl -s https://sitespeak-ai.vercel.app/api/analyze` — if this 500s, env vars may be missing |
| **Fix A** | Vercel dashboard → Settings → Environment Variables → confirm `OPENAI_API_KEY` exists |
| **Fix B** | Redeploy: Vercel dashboard → Deployments → Redeploy latest |
| **Fallback** | Switch to Scenario C (photo-only — bypasses transcription entirely) |
| **Judge line** | "Our transcription endpoint is having a hiccup. Let me show you the photo path — same AI, no voice required." |

---

### F5 — Claude returns error or result card doesn't appear

| | |
|---|---|
| **Symptom** | Spinner keeps spinning, or error state after SEND |
| **Check first** | `curl https://sitespeak-ai.vercel.app/api/analyze` → check `count` vs `max` |
| **If count ≥ 50** | Demo cap hit — intentional. Show the counter as a feature. Reset requires function restart (redeploy). |
| **If count < 50** | Transient Claude API error — wait 10s and retry once |
| **Check** | Vercel dashboard → Functions → analyze.js → recent invocations → check for errors |
| **Fix** | Verify `ANTHROPIC_API_KEY` is set in Vercel env vars |
| **Judge line (cap hit)** | "We capped submissions at 50 for today to control costs — this is the safety valve. Under $0.07 for the whole day." |
| **Judge line (error)** | "Transient API timeout — let me retry." [retry once] |

---

### F6 — Make.com webhook fails (`⚠ Webhook delivery failed`)

| | |
|---|---|
| **Symptom** | Result card shows ⚠ Webhook delivery failed |
| **Check first** | Open Trello — the card may have arrived anyway (Make.com can deliver despite reporting failure) |
| **Check Make.com** | make.com dashboard → your scenario → Execution history → did it run? |
| **If scenario is paused** | Turn it on, tap SEND again from the result card's restart flow |
| **If ImgBB step errors** | Check Make.com scenario: the `image Exists` filter must be before the HTTP/ImgBB module |
| **Critical** | The AI result is fully visible on screen regardless — that's the important part |
| **Judge line** | "The AI extraction worked — you can see the structured result here. The Trello delivery had a connection hiccup; the card may still be there." [check Trello live] |

---

### F7 — GPS shows null / no map in confirm panel

| | |
|---|---|
| **Symptom** | Confirm panel shows "Location unavailable" — no map image |
| **Cause** | Indoor venue blocking GPS signal, or permission denied |
| **Impact** | None — submission works without GPS, coordinates are null in payload |
| **This is not a bug** | GPS failure is handled gracefully by design |
| **Judge line** | "GPS is cached on page load — indoor venues can block the signal. The task still submits with all other fields intact. In production, the GPS resolves within a few seconds of going outside." |

---

### F8 — Stale build / service worker serving old version

| | |
|---|---|
| **Symptom** | App behaviour doesn't match latest deploy, or old UI appears |
| **Fix A** | DevTools → Application → Service Workers → "Update on reload" → refresh |
| **Fix B** | Chrome: Settings → Clear browsing data → Cached images and files → reload |
| **Fix C** | Incognito window — bypasses service worker cache entirely |
| **Root cause** | Service worker version string was not incremented on last deploy |
| **Judge line** | [none needed — fix silently, don't mention it] |

---

### F9 — Trello board not updating / card not appearing

| | |
|---|---|
| **Symptom** | Result card shows ✓ Sent to Trello but board doesn't update |
| **Fix** | Hard refresh Trello (F5) — real-time updates are not guaranteed |
| **Check** | Make.com execution log — confirm the scenario ran and Trello module succeeded |
| **Fallback** | Switch to showing the result card — it has all the same information as the Trello card |
| **Judge line** | "Trello sometimes needs a refresh to show new cards. [refresh] — there it is." |

---

### F10 — QR code scans to wrong URL or identity is null

| | |
|---|---|
| **Symptom** | Confirm panel shows no worker name / site, or identity block hidden |
| **Cause** | QR code encoded wrong URL params, or `?worker=` / `?site=` params missing |
| **Impact** | None — anonymous submission is valid, payload just has null identity fields |
| **Fix** | Manually type URL with params: `https://sitespeak-ai.vercel.app/?site=Ellinikon&worker=Lars+Rasmussen` |
| **Judge line** | "Identity comes from the QR code. Let me type the URL directly — same result." |

---

### F11 — Demo phone battery dies / phone fails

| | |
|---|---|
| **Symptom** | Demo phone unresponsive |
| **Backup** | Tony's personal phone with URL open (pre-prepared) |
| **Backup 2** | Support laptop — open the URL in Chrome, demo from laptop |
| **Judge line** | "Let me switch to our backup device." |

---

### F12 — Vercel function timeout (504)

| | |
|---|---|
| **Symptom** | Spinner runs for 45+ seconds, then error state appears |
| **Cause** | Cold start: first request after inactivity warms the serverless function; Whisper + Claude together can exceed 45s on a cold container |
| **Fix** | Retry once — warm container handles it in 10–15s |
| **Prevention** | Send one test submission 5 minutes before the demo to warm the functions |
| **Judge line** | "First request sometimes wakes a cold server — let me retry." [retry once — should succeed] |

---

## Emergency Redeploy Procedure

Use only if the production build is broken and a fix is needed mid-hackathon.

**Time estimate: 8–12 minutes**

```bash
# 1. Make the fix in your editor

# 2. Increment service worker version string — DO THIS BEFORE git add
# In public/sw.js, increment: const CACHE = 'sitespeak-vN'  (currently sitespeak-v4)
# (increment on every deploy — without this, phones serve the old cached build)

# 3. Commit and push
git add -A
git commit -m "fix: [description]"
git push

# 4. Vercel auto-deploys from main branch — watch dashboard
# Go to: vercel.com → sitespeak-ai → Deployments → watch for new build

# 5. Wait for READY status in Vercel dashboard (usually 45–90 seconds)

# 6. Hard reload on demo phone (clear cache), confirm fix
```

**Critical note:** `vercel link` must connect to the existing `sitespeak-ai` project — not create a new one. A new project gets a new domain and all printed QR codes stop working.

**If repo is lost entirely:** Use `HACKATHON_PROMPT_V3.md` — paste into Claude Code to regenerate all 10 source files from scratch, including Make.com rebuild steps and deployment checklist.

---

## Environment Variables Reference

All three must be set in Vercel dashboard → Settings → Environment Variables.

| Variable | Used by | What happens if missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/analyze.js` | Returns HTTP 500 immediately on every analyze call |
| `OPENAI_API_KEY` | `api/transcribe.js` | Returns HTTP 500 immediately on every transcribe call |
| `MAKE_WEBHOOK_URL` | `api/analyze.js` | Webhook skipped, `webhook_ok: false` returned — AI extraction still works |

To verify all three are set without exposing values:
```bash
curl -s https://sitespeak-ai.vercel.app/api/analyze | jq .
# Should return: {"count":N,"max":50,"remaining":N}
# A 500 here usually means ANTHROPIC_API_KEY is missing
```

---

## Usage Counter

```bash
# Check current count
curl https://sitespeak-ai.vercel.app/api/analyze

# Response shape
{"count":12,"max":50,"remaining":38}
```

The counter is in-memory and resets on function cold start. Cold starts happen naturally after a few hours of inactivity, or immediately on any redeploy. If you need to reset it mid-demo without waiting: push a trivial empty commit — the function restarts within 60 seconds.

```bash
git commit --allow-empty -m "chore: reset counter" && git push
```

**Cost ceiling:** 50 requests × ~$0.005/request = ~$0.25 total, plus ~$0.10 for Google Maps Static API. Under $0.35 for the full demo day.

---

## Contacts & Credentials Location

Kept offline — do not put in this file. Tony holds all API keys.

**If Tony is unavailable:**
- Vercel dashboard login: `one-orange-leaf` account
- GitHub repo: `one-Orange-leaf/hackathon-sitespeak-ai`
- Make.com scenario: [scenario name in Make.com dashboard]
- Trello board: [board URL pinned in team chat]
