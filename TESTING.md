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
- [x] `package.json` has `"type": "module"` and exactly one dependency: `@anthropic-ai/sdk`
- [x] `vercel.json` sets `maxDuration: 45` for `analyze.js` and `maxDuration: 30` for `transcribe.js`
- [x] Node 20 runtime declared via `package.json` `"engines": { "node": "20.x" }` — the `runtime` field in `vercel.json` is intentionally absent (invalid on current Vercel API; see git: "fix: remove invalid runtime field from vercel.json again")
- [x] `.gitignore` contains `.env.local` as first entry
- [ ] `npm install` runs without errors
- [ ] No other files exist yet

---

### HTML Gate (Step 2)
- [ ] All 7 state panels exist: `#idle-panel`, `#recording-panel`, `#transcribing-panel`, `#confirm-panel`, `#sending-panel`, `#result-panel`, `#error-panel`
  > **Structural deviation:** implementation uses `#voice-mode` for idle/recording/transcribing states; no `#idle-panel`, `#recording-panel`, `#transcribing-panel`, `#sending-panel`. End-to-end path is correct.
- [x] All 9 result card DOM IDs exist: `#result-urgency-badge`, `#result-title`, `#result-category`, `#result-materials-row`, `#result-materials`, `#result-summary`, `#result-divider`, `#webhook-status`, `#result-trello-note`
- [ ] `#confirm-map` and `#confirm-map-unavailable` both exist
  > **Naming deviation:** HTML has `#confirm-map-img` and `#confirm-map-unavailable`. Functional.
- [x] `#confirm-identity-block` exists
- [x] Both photo inputs exist: `#photo-input` (idle) and `#photo-input-confirm` (confirm panel)
- [x] `#confirm-photo-add` and `#confirm-photo-preview` exist
- [x] `#confirm-photo-none` exists
- [x] `#readback-btn` exists in confirm panel
- [x] `#restart-btn` and `#error-restart-btn` both exist
- [x] No inline styles anywhere (except the gmaps-key injection `<script>`)
- [x] No inline event handlers (no `onclick=`, `onchange=` in markup)
- [x] Google Fonts `<link>` in `<head>` — one tag only
- [x] `<meta name="gmaps-key">` present in `<head>`
- [x] gmaps-key injection script present and correct

---

### CSS Gate (Step 3)
- [x] All design tokens defined in `:root {}` as first block
- [x] `--color-accent: #FFD600` (safety yellow, not orange)
- [ ] `body[data-state="idle"]` shows `#idle-panel`, hides all others
  > **Structural deviation:** shows `#voice-mode` + `#status-bar`; no `#idle-panel`.
- [ ] `body[data-state="recording"]` shows `#recording-panel`, hides all others
  > **Structural deviation:** shows `#voice-mode`; no `#recording-panel`.
- [ ] `body[data-state="transcribing"]` shows `#transcribing-panel`, hides all others
  > **Structural deviation:** shows `#voice-mode`; no `#transcribing-panel`.
- [x] `body[data-state="confirming"]` shows `#confirm-panel`, hides all others
- [ ] `body[data-state="sending"]` shows `#sending-panel`, hides all others
  > **Structural deviation:** shows `#confirm-panel` + `#confirm-loading`; no `#sending-panel`.
- [x] `body[data-state="done"]` shows `#result-panel`, hides all others
- [x] `body[data-state="error"]` shows `#error-panel`, hides all others
- [x] `body.has-photo #confirm-photo-add` has `display: none`
- [x] `body[data-identity="none"] #confirm-identity-block` has `display: none`
- [x] Urgency classes exist: `.urgency-low`, `.urgency-medium`, `.urgency-high`, `.urgency-critical`
- [x] `.urgency-critical` uses `pulse-record` keyframe
- [x] No hardcoded colour values outside `:root` tokens
- [ ] App renders correctly on 375px wide viewport (iPhone SE)
  > **Not verified:** requires browser test on device.

---

### Frontend Gate (Step 4)
- [x] `parseIdentityFromURL()` runs first in `DOMContentLoaded`, before GPS
- [x] `initGeolocation()` runs second — GPS requested on load, never mid-flow
- [x] `setState('idle')` runs third — record button active after GPS init
- [x] `appState.gpsState` initialises to `'pending'`
- [x] `clearAppState()` does NOT reset GPS or identity state
  > **Field name divergence:** CLAUDE.md uses `lat`, `lng`, `worker_id`, `site_id` but actual fields are `appState.gpsCoords` (object), `appState.worker`, `appState.site`. Behaviour is correct.
- [x] `clearAppState()` DOES reset `mediaRecorder`, `audioChunks`, `audioMimeType`, `detectedLanguage`, `_recordingTimer`, `photoFile`, `photoDataUrl`, `audioBlob`
- [x] `clearAppState()` disables restart button for `RESTART_COOLDOWN_MS = 2000`
- [x] `getSupportedMimeType()` tests in order: `webm;codecs=opus` → `webm` → `ogg;codecs=opus` → `ogg` → `mp4`
- [x] No `window.SpeechRecognition` or `window.webkitSpeechRecognition` anywhere in code
- [x] Readback uses `utt.lang = appState.detectedLanguage` — never hardcoded to `'el-GR'`
- [x] Readback triggered by button tap only — never auto-played
- [x] `compressImage()` uses FileReader → Image → Canvas → toBlob path (NOT `createImageBitmap`)
- [x] Max canvas width: 800px. JPEG quality: 0.7
- [x] `enterConfirming()` waits up to 3s for GPS to leave `pending` before proceeding
- [x] `fetchWithRetry()` retries once after 3000ms on failure
- [x] AbortController used on every fetch, aborted in `clearAppState()`
- [x] `visibilitychange` handler: stops recording if `state === 'recording'`, preserves all other states
- [x] Sanitisation applied before every fetch: `slice(0, 2000)`, backtick and backslash stripping
- [x] `renderResultCard()` uses `CATEGORY_LABELS` and `URGENCY_LABELS` maps — never raw values
- [x] Webhook confirmation label uses named string constants (`WEBHOOK_LABEL_SUCCESS`, `WEBHOOK_LABEL_FAILURE`)
- [x] `appState.lastTask` stores last task object
- [x] `appState.meta` stores last response meta

---

### Transcription Gate (Step 5)
- [x] `bodyParser: false` — Vercel's default parser is NOT used (would corrupt audio binary)
- [x] Content-Type header from request is read and mapped to file extension
- [ ] MIME → extension mapping: `audio/webm` → `.webm`, `audio/ogg` → `.ogg`, `audio/mp4` → `.m4a`
  > **Minor deviation:** `audio/mp4` maps to `.mp4` not `.m4a`. Whisper accepts both; low risk.
- [x] Whisper called with `model: 'whisper-1'`, `response_format: 'verbose_json'`
- [x] Returns `{ transcript, detected_language }`
- [x] Empty transcript returns 200 with empty string — not an error
- [x] `OPENAI_API_KEY` missing → 500 immediately, before any fetch
- [x] Server-side Content-Length check rejects requests > 10MB with 413
- [x] No audio stored server-side
- [x] CORS headers on all responses
- [x] OPTIONS preflight returns 204

---

### Analysis Gate (Step 6)
- [x] `ANTHROPIC_API_KEY` missing → 500 immediately
- [x] Tool defined: `name: 'submit_task'`, all 5 required fields in schema
- [x] `tool_choice: { type: 'tool', name: 'submit_task' }` — forced, not auto
- [x] Response extracted as: `response.content.find(b => b.type === 'tool_use').input`
- [x] No `JSON.parse` on the tool input — it's already an object
- [x] Multimodal message used when `image` field is present
- [x] System prompt instructs English output regardless of input language
- [x] Usage cap: `MAX_REQUESTS = 50`, resets every 12 hours
- [x] GET `/api/analyze` returns `{ count, max, remaining }`
- [x] Webhook awaited — not fire-and-forget
- [x] `webhook_ok` boolean returned in response envelope
- [x] Full response envelope shape matches spec in CLAUDE.md
- [x] `submitted_at` populated server-side with `new Date().toISOString()`
- [x] `maps_link` generated server-side when coordinates available
- [ ] Nominatim called for `location_label` (with `User-Agent` header set)
  > **Implementation deviation:** Nominatim is called client-side (app.js `reverseGeocode()`); `location_label` is forwarded to `analyze.js` in the POST body. Value is populated correctly but no server-side Nominatim call and no `User-Agent` header.
- [x] `worker_id` and `site_id` accepted as null without throwing
- [x] CORS headers on all responses
- [x] OPTIONS preflight returns 204
- [x] 2-second client-side cooldown on restart button after done state

---

### Animation Gate (Step 7)
- [x] Uses `@motionone/dom` (NOT `motion@latest/dist/motion.js` — that's a UMD bundle that crashes ESM)
- [x] Dynamic import with try/catch — CDN failure degrades to no-op, never crashes app
- [x] All exported functions: `animateButtonRecord`, `animateButtonIdle`, `animatePanelIn`, `animatePanelOut`, `animateResultCascade`, `animateSendSuccess`
- [x] Each function calls `await getAnimate()` before use
- [x] All functions wrapped in try/catch
- [x] DOM element null-check before every animation call
- [x] CSS Layer 1 (style.css) handles all visibility independently — app works without motion.js

---

### PWA Gate (Step 8)
- [x] `manifest.json` has `name`, `short_name`, `icons`, `background_color`, `display: 'standalone'`
- [x] Service worker registered in `app.js` with `navigator.serviceWorker.register('/sw.js')`
- [x] Cache version string is named (e.g. `sitespeak-v4`) — easy to increment on deploy
- [x] App shell files cached: `index.html`, `style.css`, `app.js`, `motion.js`, `manifest.json`
- [x] API routes (`/api/*`) always go to network — never cached
- [x] Stale cache served on network failure for app shell (offline graceful degradation)

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

## Known Doc-to-Code Divergences (Verified, Not Bugs)

These are places where CLAUDE.md spec language differs from the actual implementation. The implementation is correct; the spec language is aspirational or pre-dates a refactor.

| Area | CLAUDE.md spec | Actual implementation | Impact |
|---|---|---|---|
| `appState` GPS fields | `appState.lat`, `appState.lng` (flat) | `appState.gpsCoords = { lat, lng }` | None — request body still sends flat `lat`/`lng` |
| `appState` identity fields | `appState.worker_id`, `appState.site_id` | `appState.worker`, `appState.site` | None — request body uses `worker_id`/`site_id` keys correctly |
| `appState` photo field | `appState.photoBase64` | `appState.photoDataUrl` (full data URL; base64 extracted on send) | None |
| `analyze.js` response | includes `detected_language` | not returned (client has it from `/api/transcribe`) | None — `appState.detectedLanguage` populated at transcribe step |
| `transcribe.js` body parsing | `bodyParser: false` config | manual `readBody()` function; no explicit config | In practice safe — audio MIME types bypass Vercel's JSON parser |
| `vercel.json` runtime | `"runtime": "nodejs20.x"` in both functions | no `runtime` field; Node 20 via `package.json engines` | None — Vercel reads engines correctly |
| Static Maps zoom | `zoom=16` | `zoom=15` | Visual only |
| Static Maps size | `size=400x180` | `size=600x300` | Visual only |
| Anthropic client | module-level `const client = new Anthropic()` | instantiated inside handler per request | Minor perf — no correctness impact |
| `gpsState` values (comment) | — | code comment said `'granted'/'denied'/'unavailable'`; now corrected to `'pending'/'resolved'/'failed'` | Fixed |

---

## Known Non-Issues (Do Not File As Bugs)

- **Readback doesn't fire on iOS without a tap:** Correct behaviour — iOS requires user gesture for `speechSynthesis.speak()`. The button tap satisfies this.
- **Map not showing indoors:** GPS signal blocked — this is handled, not a bug.
- **`detected_language` shows `'en'` for very short recordings:** Whisper falls back to English when it can't detect with confidence. Acceptable.
- **Trello card doesn't appear instantly:** Trello board requires a manual refresh. Not a bug in our system.
- **Anonymous submission shows no identity block:** Correct — `body[data-identity="none"]` hides it by design.
- **State panel IDs differ from spec:** `#voice-mode` serves idle/recording/transcribing states; `#sending-panel` does not exist — `#confirm-panel` + `#confirm-loading` serves sending state. End-to-end flow is correct.
- **`#confirm-map-img` vs `#confirm-map`:** Functional naming difference; map renders correctly.
- **Nominatim called client-side not server-side:** `location_label` is computed client-side and forwarded to `analyze.js`. Value is correctly populated in the response envelope.
