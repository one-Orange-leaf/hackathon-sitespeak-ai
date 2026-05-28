# SiteSpeak AI — Testing & Validation
**Referenced by CLAUDE.md. Treat as an extension of it.**
**Every build step must pass the full gate before the next step begins.**

---

## Step Sequence

Build steps in mandatory order. Do not proceed to a step until the previous gate passes.

| Step | File(s) | Gate |
|---|---|---|
| 1 | `.gitignore`, `package.json`, `vercel.json` | Scaffold gate |
| 2 | `public/index.html` | HTML gate |
| 3 | `public/style.css` | CSS gate |
| 4 | `public/app.js` | Frontend gate |
| 5 | `api/transcribe.js` | Transcription gate |
| 6 | `api/analyze.js` | Analysis gate |
| 7 | `public/motion.js` | Animation gate |
| 8 | `public/sw.js`, `public/manifest.json` | PWA gate |
| — | All files deployed to Vercel preview URL | Integration gate (definition of done) |

**Step 7 (integration on Vercel preview URL) is the only definition of "done" for the MVP.**
Do not mark the build complete until the integration gate passes in full.

---

## Gate Checklists

### Scaffold Gate (Step 1)
- [ ] `package.json` has `"type": "module"` and exactly one dependency: `@anthropic-ai/sdk`
- [ ] `vercel.json` sets `maxDuration: 45` for `analyze.js` and `maxDuration: 30` for `transcribe.js`
- [ ] `vercel.json` sets runtime to `nodejs20.x` for both functions
- [ ] `.gitignore` contains `.env.local` as first entry
- [ ] `npm install` runs without errors
- [ ] No other files exist yet

---

### HTML Gate (Step 2)
- [ ] All 7 state panels exist: `#idle-panel`, `#recording-panel`, `#transcribing-panel`, `#confirm-panel`, `#sending-panel`, `#result-panel`, `#error-panel`
- [ ] All 9 result card DOM IDs exist: `#result-urgency-badge`, `#result-title`, `#result-category`, `#result-materials-row`, `#result-materials`, `#result-summary`, `#result-divider`, `#webhook-status`, `#result-trello-note`
- [ ] `#confirm-map` and `#confirm-map-unavailable` both exist
- [ ] `#confirm-identity-block` exists
- [ ] Both photo inputs exist: `#photo-input` (idle) and `#photo-input-confirm` (confirm panel)
- [ ] `#confirm-photo-add` and `#confirm-photo-preview` exist
- [ ] `#confirm-photo-none` exists
- [ ] `#readback-btn` exists in confirm panel
- [ ] `#restart-btn` and `#error-restart-btn` both exist
- [ ] No inline styles anywhere (except the gmaps-key injection `<script>`)
- [ ] No inline event handlers (no `onclick=`, `onchange=` in markup)
- [ ] Google Fonts `<link>` in `<head>` — one tag only
- [ ] `<meta name="gmaps-key">` present in `<head>`
- [ ] gmaps-key injection script present and correct

---

### CSS Gate (Step 3)
- [ ] All design tokens defined in `:root {}` as first block
- [ ] `--color-accent: #FFD600` (safety yellow, not orange)
- [ ] `body[data-state="idle"]` shows `#idle-panel`, hides all others
- [ ] `body[data-state="recording"]` shows `#recording-panel`, hides all others
- [ ] `body[data-state="transcribing"]` shows `#transcribing-panel`, hides all others
- [ ] `body[data-state="confirming"]` shows `#confirm-panel`, hides all others
- [ ] `body[data-state="sending"]` shows `#sending-panel`, hides all others
- [ ] `body[data-state="done"]` shows `#result-panel`, hides all others
- [ ] `body[data-state="error"]` shows `#error-panel`, hides all others
- [ ] `body.has-photo #confirm-photo-add` has `display: none`
- [ ] `body[data-identity="none"] #confirm-identity-block` has `display: none`
- [ ] Urgency classes exist: `.urgency-low`, `.urgency-medium`, `.urgency-high`, `.urgency-critical`
- [ ] `.urgency-critical` uses `pulse-record` keyframe
- [ ] No hardcoded colour values outside `:root` tokens
- [ ] App renders correctly on 375px wide viewport (iPhone SE)

---

### Frontend Gate (Step 4)
- [ ] `parseIdentityFromURL()` runs first in `DOMContentLoaded`, before GPS
- [ ] `initGeolocation()` runs second — GPS requested on load, never mid-flow
- [ ] `setState('idle')` runs third — record button active after GPS init
- [ ] `appState.gpsState` initialises to `'pending'`
- [ ] `clearAppState()` does NOT reset `lat`, `lng`, `gpsState`, `locationLabel`, `worker_id`, `site_id`
- [ ] `clearAppState()` DOES reset `mediaRecorder`, `audioChunks`, `audioMimeType`, `detectedLanguage`, `_recordingTimer`
- [ ] `clearAppState()` disables restart button for `RESTART_COOLDOWN_MS = 2000`
- [ ] `getSupportedMimeType()` tests in order: `webm;codecs=opus` → `webm` → `ogg;codecs=opus` → `ogg` → `mp4`
- [ ] No `window.SpeechRecognition` or `window.webkitSpeechRecognition` anywhere in code
- [ ] Readback uses `utt.lang = appState.detectedLanguage` — never hardcoded to `'el-GR'`
- [ ] Readback triggered by button tap only — never auto-played
- [ ] `compressImage()` uses FileReader → Image → Canvas → toBlob path (NOT `createImageBitmap`)
- [ ] Max canvas width: 800px. JPEG quality: 0.7
- [ ] `enterConfirming()` waits up to 3s for GPS to leave `pending` before proceeding
- [ ] `fetchWithRetry()` retries once after 3000ms on failure
- [ ] AbortController used on every fetch, aborted in `clearAppState()`
- [ ] `visibilitychange` handler: stops recording if `state === 'recording'`, preserves all other states
- [ ] Sanitisation applied before every fetch: `slice(0, 2000)`, backtick and backslash stripping
- [ ] `renderResultCard()` uses `CATEGORY_LABELS` and `URGENCY_LABELS` maps — never raw values
- [ ] Webhook confirmation label uses named string constants (`WEBHOOK_LABEL_SUCCESS`, `WEBHOOK_LABEL_FAILURE`)
- [ ] `appState.lastTask` stores last task object
- [ ] `appState.meta` stores last response meta

---

### Transcription Gate (Step 5)
- [ ] `bodyParser: false` — Vercel's default parser is NOT used (would corrupt audio binary)
- [ ] Content-Type header from request is read and mapped to file extension
- [ ] MIME → extension mapping: `audio/webm` → `.webm`, `audio/ogg` → `.ogg`, `audio/mp4` → `.m4a`
- [ ] Whisper called with `model: 'whisper-1'`, `response_format: 'verbose_json'`
- [ ] Returns `{ transcript, detected_language }`
- [ ] Empty transcript returns 200 with empty string — not an error
- [ ] `OPENAI_API_KEY` missing → 500 immediately, before any fetch
- [ ] Server-side Content-Length check rejects requests > 10MB with 413
- [ ] No audio stored server-side
- [ ] CORS headers on all responses
- [ ] OPTIONS preflight returns 204

---

### Analysis Gate (Step 6)
- [ ] `ANTHROPIC_API_KEY` missing → 500 immediately
- [ ] Tool defined: `name: 'submit_task'`, all 5 required fields in schema
- [ ] `tool_choice: { type: 'tool', name: 'submit_task' }` — forced, not auto
- [ ] Response extracted as: `response.content.find(b => b.type === 'tool_use').input`
- [ ] No `JSON.parse` on the tool input — it's already an object
- [ ] Multimodal message used when `image` field is present
- [ ] System prompt instructs English output regardless of input language
- [ ] Usage cap: `MAX_REQUESTS = 50`, resets every 12 hours
- [ ] GET `/api/analyze` returns `{ count, max, remaining }`
- [ ] Webhook awaited — not fire-and-forget
- [ ] `webhook_ok` boolean returned in response envelope
- [ ] Full response envelope shape matches spec in CLAUDE.md
- [ ] `submitted_at` populated server-side with `new Date().toISOString()`
- [ ] `maps_link` generated server-side when coordinates available
- [ ] Nominatim called for `location_label` (with `User-Agent` header set)
- [ ] `worker_id` and `site_id` accepted as null without throwing
- [ ] CORS headers on all responses
- [ ] OPTIONS preflight returns 204
- [ ] 2-second client-side cooldown on restart button after done state

---

### Animation Gate (Step 7)
- [ ] Uses `@motionone/dom` (NOT `motion@latest/dist/motion.js` — that's a UMD bundle that crashes ESM)
- [ ] Dynamic import with try/catch — CDN failure degrades to no-op, never crashes app
- [ ] All exported functions: `animateButtonRecord`, `animateButtonIdle`, `animatePanelIn`, `animatePanelOut`, `animateResultCascade`, `animateSendSuccess`
- [ ] Each function calls `await getAnimate()` before use
- [ ] All functions wrapped in try/catch
- [ ] DOM element null-check before every animation call
- [ ] CSS Layer 1 (style.css) handles all visibility independently — app works without motion.js

---

### PWA Gate (Step 8)
- [ ] `manifest.json` has `name`, `short_name`, `icons`, `background_color`, `display: 'standalone'`
- [ ] Service worker registered in `app.js` with `navigator.serviceWorker.register('/sw.js')`
- [ ] Cache version string is named (e.g. `sitespeak-v3`) — easy to increment on deploy
- [ ] App shell files cached: `index.html`, `style.css`, `app.js`, `motion.js`, `manifest.json`
- [ ] API routes (`/api/*`) always go to network — never cached
- [ ] Stale cache served on network failure for app shell (offline graceful degradation)

---

## Integration Gate (Definition of Done)

Run on the Vercel preview URL, not localhost. Use a real mobile device.

### Happy Path — Greek Voice
1. Scan a judge QR code on mobile device
2. Confirm identity appears in confirm panel
3. Tap RECORD, speak in Greek for 5+ seconds, tap to stop
4. Confirm panel appears with Greek transcript
5. Tap 🔊 — readback plays in Greek
6. Map image appears (if GPS available)
7. Tap SEND
8. Result card appears with English title, category, urgency, materials, summary
9. `webhook_ok: true` shown (✓ Sent to Trello)
10. Open Trello — card exists with correct title, description, GPS link

### Happy Path — Photo Only
1. Open app with no QR params (anonymous)
2. Tap photo icon, attach a photo
3. Skip recording entirely
4. Tap SEND
5. Result card appears — all fields populated from image
6. Trello card has photo attachment

### Happy Path — Mandarin Voice
1. Record voice note in Mandarin
2. Transcript appears in Chinese characters
3. Readback button plays in Mandarin
4. Result card shows English title and summary
5. `[WORKER INPUT]` block shows original Mandarin

### Edge Cases
- [ ] Submit with no GPS — app does not block, coordinates null in payload
- [ ] Submit with no identity (no URL params) — app does not block, identity block hidden
- [ ] Rapid tap of SEND twice — second tap blocked by AbortController / in-flight check
- [ ] Tap restart during in-flight send — fetch aborted, state resets cleanly
- [ ] Switch tabs during recording — recording stops, state preserved
- [ ] Counter at 50 — returns 429 with `{ error: 'Demo limit reached.' }`
- [ ] Photo > 5MB — client-side size check blocks upload with error
- [ ] Very short recording (<0.5s) — empty transcript returned, no error (photo-only path activated)

---

## Crush Test

Run before the demo slot. These are the failure modes most likely to appear under pressure.

| Test | How to run | Pass condition |
|---|---|---|
| Fast restart | Complete a submission, immediately tap restart during 2s cooldown | Restart button remains disabled during cooldown |
| Tab switch during record | Start recording, switch to another app, return | Recording stopped cleanly, app returns to idle |
| Offline GPS | Enable airplane mode after app loads | GPS null, confirm panel shows unavailable, submission works |
| Webhook URL missing | Temporarily remove `MAKE_WEBHOOK_URL` from Vercel env, redeploy | AI result displays, `webhook_ok: false` shown, no crash. **Immediately restore `MAKE_WEBHOOK_URL` and redeploy — confirm ✓ Sent to Trello on the next submission before marking passed.** |
| Large photo | Attach a 10MB photo | Client-side rejects it, shows error message |
| Repeat submissions | Submit 5 times rapidly with 2s gaps | All 5 cards appear in Trello, counter increments correctly |
| Old service worker | Deploy a change without incrementing cache version | Old app served — confirms why version increment is mandatory |

---

## Known Non-Issues (Do Not File As Bugs)

- **Readback doesn't fire on iOS without a tap:** Correct behaviour — iOS requires user gesture for `speechSynthesis.speak()`. The button tap satisfies this.
- **Map not showing indoors:** GPS signal blocked — this is handled, not a bug.
- **`detected_language` shows `'en'` for very short recordings:** Whisper falls back to English when it can't detect with confidence. Acceptable.
- **Trello card doesn't appear instantly:** Trello board requires a manual refresh. Not a bug in our system.
- **Anonymous submission shows no identity block:** Correct — `body[data-identity="none"]` hides it by design.
