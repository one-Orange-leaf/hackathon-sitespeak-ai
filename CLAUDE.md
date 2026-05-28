# SiteSpeak AI — Project Claude Context

> This file is the project-level Claude Code context for SiteSpeak AI.
> It is read automatically by Claude Code at every session.
> All decisions recorded here were finalized during the pre-hackathon planning session.
> Do not deviate from any constraint in this file without triggering the
> Documentation Sync Protocol at the bottom.

---

## Project Identity

**Name:** SiteSpeak AI
**Purpose:** Mobile-first web app for construction site workers. Worker taps a
button, optionally photographs the problem, speaks a voice note on-site,
confirms via audio readback and visual display, then sends it to a serverless
backend. Claude AI extracts structured task data and routes it to a project
management webhook.
**Context:** 12-hour hackathon MVP. Optimize for demo clarity and reliability
over feature completeness.
**Deployment:** Vercel (static frontend + serverless functions). No build step.
**Primary users during demo:** Hackathon judges — possibly on any browser.
**Language:** English throughout all UI, states, and error messages.
**Output language:** Claude always returns task_title and summary in English regardless of worker input language.
**Worker input language:** any — Whisper auto-detects and transcribes. Readback plays in the worker's detected language.

---

## Folder Structure — Canonical, Do Not Deviate

```
sitespeak-ai/
├── public/
│   ├── index.html        # Markup only — no inline styles, no inline scripts
│   ├── style.css         # All visual design — designer's exclusive file
│   ├── app.js            # State machine, MediaRecorder, GPS, fetch, result card
│   ├── motion.js         # Animation helpers — optional layer, CDN lazy import
│   ├── sw.js             # Service worker — versioned cache, increment on every deploy
│   └── manifest.json     # PWA manifest — name, icons, standalone display
├── api/
│   ├── analyze.js        # Claude Haiku extraction + Make.com webhook routing
│   └── transcribe.js     # OpenAI Whisper transcription — receives raw audio binary
├── CLAUDE.md             # This file — read by Claude Code automatically
├── ARCHITECTURE.md       # Leave-behind document for judges and mentors
├── DEMO.md               # Demo script, talking points, failure recovery
├── PITCH.md              # Judge Q&A, competitive landscape, monetization
├── PLANNING.md           # Architecture decision log — do not modify
├── PLANNING_SUMMARY.md   # Build session summary — current state
├── PRD.md                # Product requirements — Block 5 complete
├── PROMPT.md             # Original scaffold prompt (Block 1)
├── HACKATHON_PROMPT_V3.md # Emergency rebuild prompt (Block 5 — use this one)
├── RUNBOOK.md            # Hackathon day operational playbook
├── SUMMING.md            # Session handoff — current state
├── TESTING.md            # Gate checklist and crush test
├── README.md             # Public project entry point
├── LICENSE
├── .gitignore
├── package.json
├── package-lock.json
└── vercel.json
```

**Ownership boundaries:**
- `style.css` → designer owns exclusively
- `motion.js` → animator/designer owns exclusively
- `app.js` + `api/analyze.js` + `api/transcribe.js` → developer owns
- `index.html` → shared, rarely needs editing after scaffold
- `DEMO.md` → whole team, expected to be modified on hackathon day

---

## Stack Decisions — Final

| Concern | Decision | Reason |
|---|---|---|
| Runtime | Node.js ESM (`"type": "module"`) | Clean async, Vercel 20 native |
| AI model | `claude-haiku-4-5` | Speed + cost for hackathon |
| Structured output | Anthropic tool use, forced `tool_choice` | Guaranteed JSON, no parsing risk |
| Input modality | Voice primary + photo optional | Multimodal — vision-first demo |
| Transcription | MediaRecorder → OpenAI Whisper (`whisper-1`) | All browsers; auto language detection |
| Speech accuracy | Whisper semantic (server-side) | Replaces browser Web Speech API entirely |
| Animation | CSS Layer 1 + Motion vanilla Layer 2 (CDN) | Zero build step, MIT licensed |
| Speech fallback | None — MediaRecorder supported on all modern browsers | Textarea fallback removed |
| Dependency count | 1 (`@anthropic-ai/sdk`) | Motion + Whisper via fetch, no npm |
| AI provider | Anthropic only for extraction — OpenAI for transcription only | Locked decision |

---

## Environment Variables

Required in `.env.local` (local) and Vercel Dashboard (production):

```
ANTHROPIC_API_KEY=...
MAKE_WEBHOOK_URL=...
OPENAI_API_KEY=...
```

Google Maps Static API key is **not** an environment variable. It goes in a
`<meta name="gmaps-key">` tag in `index.html` and is safe there because
the key is referrer-restricted in Google Cloud Console (see Maps section below).

Never commit `.env.local`. Never log key values. If `ANTHROPIC_API_KEY` or
`OPENAI_API_KEY` is missing at function startup, return HTTP 500 immediately
with a safe error message.

---

## .gitignore — Required, Must Exist Before First Commit

```
.env.local
.env.*.local
.env
.vercel/
node_modules/
.DS_Store
Thumbs.db
.vscode/
*.swp
*.swo
```

---

## Phase A / Phase B — Traceability Architecture

**Phase A (current build):** Full pipeline proven. GPS active. Worker identity
via URL params (`?site=X&worker=Y`) — active in Phase A. `worker_id` and
`site_id` populate from URL on load; null when params absent.

**Phase B (next build):** Per-site webhook routing, manager dashboard,
Supabase data layer. No structural refactor of Phase A code required.

**Rules this build follows to stay Phase B compatible:**

1. `analyze.js` accepts `worker_id` and `site_id` as flat top-level body fields.
   Both may be null. Never throw if absent.

2. `analyze.js` ALWAYS returns this full envelope:
```json
{
  "meta": {
    "worker_id": null,
    "site_id": null,
    "coordinates": null,
    "location_label": null,
    "maps_link": null,
    "submitted_at": "new Date().toISOString()"
  },
  "task": { "...tool use output..." },
  "transcript": "sanitised text sent to Claude",
  "detected_language": "en",
  "webhook_ok": true
}
```
`submitted_at` always populated server-side. `location_label` from Nominatim.
`maps_link` is `https://maps.google.com/?q=lat,lng` when GPS available, else null.
`transcript` and `detected_language` come from Whisper.

3. The Make.com webhook payload includes `worker_id`, `site_id`, `maps_link`,
   and `image` (base64). Trello card maps all fields now — no reconfiguration
   needed at Phase B launch.

4. `app.js` stores `response.meta` on every response even if not fully displayed.
   Phase B adds traceability rows without changing fetch/parse logic.

---

## Geolocation (GPS) — Active in Phase A

Request Geolocation on page load, silently, as part of app init.
Never request GPS mid-flow — it fires a blocking modal at the worst moment.

**Init sequence (order is mandatory):**
1. `parseIdentityFromURL()` — read `?worker=` and `?site=` params
2. `initGeolocation()` — request GPS, cache result, kick off Nominatim
3. `setState('idle')` — app ready, record button active

```js
appState.gpsState = 'pending'
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      appState.lat = pos.coords.latitude
      appState.lng = pos.coords.longitude
      appState.gpsState = 'resolved'
      reverseGeocode(appState.lat, appState.lng)
        .then(label => { appState.locationLabel = label })
        .catch(() => { appState.locationLabel = null })
    },
    () => {
      appState.gpsState = 'failed'
      appState.lat = null
      appState.lng = null
    },
    { timeout: 10000, maximumAge: 60000 }
  )
} else {
  appState.gpsState = 'failed'
}
```
`gpsState` is `'pending' | 'resolved' | 'failed'`. `enterConfirming()` waits up to 3s for it to leave `pending` before proceeding. `reverseGeocode()` calls Nominatim for an address label (`locationLabel`). GPS coordinates (`lat`/`lng`) are cached across submissions — `clearAppState()` does NOT reset them.

`maximumAge: 60000` — reuse cached GPS fix up to 1 minute old. Reduces
battery drain on mobile. GPS never blocks the UI. `null` coordinates are
valid — submission never blocked.

**iOS Safari:** Geolocation requires HTTPS. Vercel preview URLs are HTTPS.
`localhost` also qualifies. Never test GPS on plain `http://`.

---

## API Usage Cap — Mandatory, Never Remove

```js
const MAX_REQUESTS = 50
let requestCount = 0
let resetTime = Date.now() + 12 * 60 * 60 * 1000

if (Date.now() > resetTime) {
  requestCount = 0
  resetTime = Date.now() + 12 * 60 * 60 * 1000
}
requestCount++
if (requestCount > MAX_REQUESTS) {
  return new Response(JSON.stringify({ error: 'Demo limit reached.' }), { status: 429 })
}
```

Also expose GET `/api/analyze` returning:
```json
{ "count": N, "max": 50, "remaining": N }
```

Estimated cost at 50 requests with 60% vision: $0.05–0.07 total. Still negligible.

---

**Rate protection — client-side cooldown (Phase A):**
The aggregate cap protects cost. The cooldown protects UX and prevents a
single client burning all capacity before others can use the demo.

After a successful submission (`done` state), the restart button is disabled
for `RESTART_COOLDOWN_MS = 2000` before re-enabling. This prevents rapid
repeat submissions from a single device during a live demo.

```js
const RESTART_COOLDOWN_MS = 2000
// In clearAppState() — called from restart-btn and error-restart-btn handlers:
restartBtn.disabled = true
setTimeout(() => { restartBtn.disabled = false }, RESTART_COOLDOWN_MS)
```

The 50-request cap is a hard ceiling. The cooldown is a soft friction layer.
Both are in-memory and reset on function restart. No per-IP or distributed
rate limiting is implemented in Phase A — this is accepted for demo context.
Per-IP limiting is a Phase B / V1 concern if the URL becomes public.

---

## Input Sanitisation — Applied Before Every Claude Call

Applied in `app.js` before fetch — not in `analyze.js`. Applied to the
Whisper transcript before it is sent to the backend.

```js
const safeText = text.slice(0, 2000).trim()
const sanitised = safeText.replace(/`/g, "'").replace(/\\/g, ' ')
```

Empty sanitised text is valid when a photo is present (photo-only path).
Empty sanitised text with no photo → show error, do not submit.

---

## Transcription — MediaRecorder + OpenAI Whisper

Web Speech API is **not used**. All browsers use MediaRecorder.
Do not add any `window.SpeechRecognition` or `window.webkitSpeechRecognition` code.

**Recording flow:**
1. Worker taps record button → `startRecording()` requests mic via `getUserMedia`
2. `MediaRecorder` captures audio chunks into `appState.audioChunks`
3. Worker taps again (or 30-second auto-stop fires) → `stopRecording()`
4. `onstop` fires → `handleRecordingComplete()` builds blob, POSTs to `/api/transcribe`
5. `setState('transcribing')` shown while Whisper call is in flight
6. Whisper returns `{ transcript, detected_language }` → `enterConfirming()`

**MIME type handling — critical:**
`getSupportedMimeType()` tests in this order, returns first supported:
  `'audio/webm;codecs=opus'` → Chrome/Edge (ext: webm)
  `'audio/webm'`             → Chrome fallback (ext: webm)
  `'audio/ogg;codecs=opus'`  → Firefox (ext: ogg)
  `'audio/ogg'`              → Firefox fallback (ext: ogg)
  `'audio/mp4'`              → Safari (ext: mp4)

The MIME type is passed as `Content-Type` header to `/api/transcribe`.
`api/transcribe.js` reads it, maps to file extension, and sets the correct
filename in the Whisper multipart form — Whisper uses filename extension to
select the audio decoder. MIME type mismatch = transcription failure.

**Client-side guards:**
- 30-second auto-stop timer (`MAX_RECORDING_SECONDS = 30`)
- 5MB client-side blob size check before fetch
- 10MB server-side Content-Length check in `api/transcribe.js`

**appState fields for recording:**
```js
mediaRecorder: null,
audioChunks: [],
audioMimeType: '',
detectedLanguage: 'en',
_recordingTimer: null
```

**`clearAppState()` resets** all recording fields above.
**Does NOT reset:** `lat`, `lng`, `gpsState`, `locationLabel`, `worker_id`, `site_id`.

**Readback language:** `utt.lang = appState.detectedLanguage || 'en'`
Worker hears their own language in readback. Never hardcoded to 'el-GR'.

**`api/transcribe.js` — Whisper endpoint:**
- Receives raw audio binary body (not JSON)
- Forwards to `https://api.openai.com/v1/audio/transcriptions`
- Uses `response_format: 'verbose_json'` to get `language` alongside `text`
- Returns `{ transcript, detected_language }`
- Empty transcript returns 200 with empty string — not an error (photo-only path)
- `OPENAI_API_KEY` missing → 500 before any fetch
- No retry on transcription failure — surface error immediately

**Speech synthesis readback** (opt-in, not auto-play):
- `🔊` button in confirm panel triggers readback on tap
- iOS Safari requires readback inside a user gesture handler — button tap satisfies this
- `speechSynthesis` unavailable → button silently does nothing

---

## Photo / Vision Input

Photo is optional. Voice is primary.

**Capture:**
```html
<input type="file" id="photo-input" accept="image/*">
```
No `capture` attribute — worker chooses camera or gallery on tap.
Desktop opens a file picker. This is intentional.

**Client-side compression (mandatory before transmission):**
Canvas API, max 800px width, JPEG quality 0.7. No library — native Canvas only.
Uncompressed phone photos hit 6,000+ tokens. Compressed: ~1,600 tokens.

```js
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image load failed'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 800 / img.width)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
          'image/jpeg',
          0.7
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
```
Note: `createImageBitmap` was replaced with `FileReader` + `new Image()` for broader browser compatibility (Safari compat issue).

**Multimodal message to Claude (when image present):**
```js
{ role: 'user', content: [
  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 }},
  { type: 'text', text: transcriptText } // may be empty string — photo-only is valid
]}
```

**Photo-only path:** transcriptText may be empty string. System prompt handles it.

---

## Photo Input — All Browsers

All browsers use the same photo path. There is no textarea fallback path.

Photo is optional on the voice path. Recording with no photo is valid.
Photo-only (no voice, no transcript) is valid if image is attached.
No photo + no transcript → block, show error "Please record a voice note or add a photo."

Photo add is available at two points:
1. Idle screen — `#photo-input` (before recording)
2. Confirm panel — `#photo-input-confirm` (after recording, before send)

Both inputs call `handlePhotoChange()`. Both update the same `appState.photoBlob`
and `appState.photoBase64`. `body.has-photo` class controls confirm panel photo
add affordance visibility.

---

## Error Handling

**Auto-retry:** retry once after 3000ms on fetch failure or non-200 response.
If retry fails: show "Δεν ήταν δυνατή η σύνδεση. Δοκιμάστε ξανά." → reset to idle.

```js
async function fetchWithRetry(url, options, retries = 1, delayMs = 3000) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delayMs))
      return fetchWithRetry(url, options, retries - 1, delayMs)
    }
    throw err
  }
}
```

**Loading timeout:** after 4 seconds in `sending` state, display
"Still processing..." below spinner. Clear on state change.

---

## Webhook — Awaited, Status Returned to Client

**Decision reversed from original fire-and-forget.**
`analyze.js` now awaits the Make.com webhook and returns status to the client.

```js
let webhook_ok = false
if (process.env.MAKE_WEBHOOK_URL) {
  try {
    const wh = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload)
    })
    webhook_ok = wh.ok
  } catch (err) {
    console.error('[webhook]', err.message)
    webhook_ok = false
  }
} else {
  console.warn('[webhook] MAKE_WEBHOOK_URL not set — skipping')
}
```

Client displays:
- `WEBHOOK_LABEL_SUCCESS = '✓ Sent to Trello'` when `webhook_ok: true`
- `WEBHOOK_LABEL_FAILURE = '⚠ Webhook delivery failed'` when `webhook_ok: false`

**Abstraction rule:** The webhook URL (`MAKE_WEBHOOK_URL`) and the UI
confirmation label string are the ONLY two things that change when swapping
integration targets (Trello → Google Sheets → any other). No structural
changes to `app.js` required. Confirmation label must be a named string
constant, not inline text.

---

## Structured Output Schema — Claude Tool Use

Tool name: `submit_task`. Force with `tool_choice: { type: 'tool', name: 'submit_task' }`.

```json
{
  "name": "submit_task",
  "description": "Submit the structured task extracted from the worker's voice note.",
  "input_schema": {
    "type": "object",
    "properties": {
      "task_title": {
        "type": "string",
        "description": "Short task title in English, max 60 characters"
      },
      "category": {
        "type": "string",
        "enum": ["electrical", "plumbing", "structural", "materials",
                 "safety", "inspection", "other"]
      },
      "materials_requested": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Materials or tools mentioned. Empty array if none."
      },
      "urgency": {
        "type": "string",
        "enum": ["low", "medium", "high", "critical"]
      },
      "summary": {
        "type": "string",
        "description": "2-3 sentence summary in English"
      }
    },
    "required": ["task_title", "category", "materials_requested", "urgency", "summary"]
  }
}
```

Extract result: `response.content.find(b => b.type === 'tool_use').input`
This IS the structured payload — no `JSON.parse` needed.

---

## System Prompt — Exact Text

```
You are an assistant for construction site management.
A worker has recorded a voice note or photographed a problem on-site.
Extract structured task information using the submit_task tool.
Always respond in English regardless of the worker's input language.
task_title and summary must be in English — translate if necessary.
If no voice transcript is provided, infer all fields from the image.
If the image is ambiguous, set urgency to medium and note uncertainty in summary.
When both an image and text description are provided, treat them as complementary
sources of equal weight. Do not let a vague text description override clear
visual evidence in the image.
Be concise and practical. Assume construction context for ambiguous terms.
```

---

## Full Response Envelope — `analyze.js` Returns This Shape

```json
{
  "meta": {
    "worker_id": "Giorgos",
    "site_id": "Kifisia",
    "coordinates": { "lat": 37.9842, "lng": 23.7275 },
    "location_label": "Kifisia, Attica, Greece",
    "maps_link": "https://maps.google.com/?q=37.9842,23.7275",
    "submitted_at": "ISO8601 — always populated server-side"
  },
  "task": {
    "task_title": "Wrong pipe diameter - Floor 3",
    "category": "electrical",
    "materials_requested": ["20mm pipes"],
    "urgency": "high",
    "summary": "The pipes on floor 3, room 12 are the wrong diameter..."
  },
  "transcript": "sanitised text that was sent to Claude",
  "detected_language": "en",
  "webhook_ok": true
}
```

`worker_id` and `site_id` are null when URL params are absent.
`maps_link` is null when GPS is unavailable.
`transcript` is the sanitised text from Whisper, stored for audit purposes.

---

## Backend — Vercel Node.js Runtime

```json
{
  "functions": {
    "api/analyze.js": {
      "maxDuration": 45,
      "runtime": "nodejs20.x"
    },
    "api/transcribe.js": {
      "maxDuration": 30,
      "runtime": "nodejs20.x"
    }
  }
}
```

`analyze.js` at 45s: Whisper (via transcribe.js) + Claude sequential = ~10-15s typical.
`transcribe.js` at 30s: Whisper alone for long recordings.

---

## CORS Headers — Every Response

```js
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
// OPTIONS preflight → return 204 immediately
```

---

## Frontend State Machine — Seven States

```
idle → recording → transcribing → confirming → sending → done
                                                         → error → idle
         ↓ (discard)
         idle
```

State set exclusively via: `document.body.dataset.state = name`
CSS attribute selectors drive all show/hide logic. JS never touches classList
for visibility. Designer never needs to touch JavaScript.

**State descriptions:**
- `idle` — record button active, photo input available
- `recording` — MediaRecorder active, stop-on-tap, 30s auto-stop
- `transcribing` — audio blob sent to Whisper, record button disabled
- `confirming` — transcript + photo preview + map + identity shown
- `sending` — fetch to `/api/analyze` in flight
- `done` — result card shown
- `error` — error panel shown, try-again button active

There is no `no-speech` state. All browsers use MediaRecorder.

---

## Recording Rules

```js
// Do NOT use:
window.SpeechRecognition
window.webkitSpeechRecognition
window.SpeechGrammarList
```

- All browsers use `MediaRecorder` — no browser detection for input mode.
- `getSupportedMimeType()` determines codec; result stored in `appState.audioMimeType`.
- `recognition.lang` does not exist — Whisper auto-detects language server-side.
- `appState.detectedLanguage` populated from Whisper `verbose_json` response.
- Speech synthesis readback: `lang: appState.detectedLanguage` — never hardcoded.
- Readback triggered by `🔊` button tap only — never auto-played.
- iOS Safari: `speechSynthesis.speak()` inside button tap handler satisfies user gesture requirement.
- `visibilitychange` handler: if `state === 'recording'` → `stopRecording()` (onstop fires naturally).
  All other states preserved on tab switch.
```

---

## CSS Architecture Rules

1. All design tokens in `:root {}` — first block in file. No hardcoded values outside.
2. State-based visibility via `body[data-state="X"]` selectors only.
3. Animation keyframes in `style.css` (Layer 1). Motion calls in `motion.js` (Layer 2).
4. Google Fonts loaded in `index.html` `<head>` — one `<link>` tag only.

**Design tokens:**
```css
:root {
  --color-bg:            #111111;
  --color-surface:       #1c1c1c;
  --color-surface-alt:   #252525;
  --color-accent:        #FFD600;
  --color-accent-dim:    rgba(255, 214, 0, 0.12);
  --color-text:          #E8E8E8;
  --color-text-muted:    #777777;
  --color-active:        #00FF41;
  --color-error:         #FF4444;
  --color-border:        #2e2e2e;
  --color-border-accent: #FFD600;
  --font-display:        'Barlow Condensed', sans-serif;
  --font-mono:           'Courier New', Courier, monospace;
  --space-xs:            4px;
  --space-sm:            8px;
  --space-md:            16px;
  --space-lg:            24px;
  --space-xl:            40px;
  --btn-record-size:     160px;
  --color-urgency-high:        #FF8C00;
  --color-urgency-high-bg:     rgba(255, 140, 0, 0.15);
  --color-urgency-critical:    #FF4444;
  --color-urgency-critical-bg: rgba(255, 68, 68, 0.15);
  --color-urgency-medium-bg:   rgba(255, 214, 0, 0.12);
  --color-urgency-low:         #555555;
  --color-urgency-low-bg:      #2a2a2a;
  --radius:              3px;
  --radius-sm:           2px;
  --border-width:        2px;
  --transition-fast:     100ms ease;
  --transition-base:     220ms ease;
  --transition-slow:     380ms ease;
}
```

**Aesthetic direction (industrial/utilitarian — hackathon default):**
- Record button: square-ish, thick solid border, inset bevel via box-shadow. NOT a pill or circle.
- Recording pulse: sharp mechanical opacity flicker via `steps(1)`. NOT a soft scale/glow.
- Panel labels: `[TRANSCRIPT]` `[GPS]` `[STATUS]` `[AI ANALYSIS]` `[ERROR]` — monospace, uppercase, muted.
- Background: subtle scanline via `body::before` pseudo-element — not solid fill.
- Designer may override all of the above freely by editing token values in `:root`.

---

## Result Card — DOM IDs and Rendering Contract

`#result-card` is the structured output panel populated by `renderResultCard(task)` in `app.js`.
Never render `task` as raw JSON. `appState.lastTask` stores the last task object for Phase B.

**DOM IDs (all 9 required — must exist in index.html):**
```
#result-urgency-badge   — urgency level text + CSS class (urgency-low/medium/high/critical)
#result-title           — task_title (English)
#result-category        — English label via CATEGORY_LABELS map
#result-materials-row   — wrapper div; display:none when materials_requested is empty
#result-materials       — material pills rendered as <span class="material-pill">
#result-summary         — summary (English)
#result-divider         — visual separator
#webhook-status         — "✓ Sent to Trello" / "⚠ Webhook delivery failed" (aria-live)
#result-trello-note     — static note: "Sent to Trello in English"
```

**Label maps (app.js constants):**
```js
const CATEGORY_LABELS = {
  electrical: 'Electrical', plumbing: 'Plumbing', structural: 'Structural',
  materials: 'Materials', safety: 'Safety', inspection: 'Inspection', other: 'Other'
}
const URGENCY_LABELS = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' }
```

**Urgency badge CSS classes:** `urgency-low`, `urgency-medium`, `urgency-high`, `urgency-critical`.
`urgency-critical` reuses the `pulse-record` keyframe for a blinking effect.

---

## Confirm Panel — Photo Add Affordance

`#confirm-photo-add` is a second photo input inside `#confirm-panel`, visible when no photo
has been attached yet. Controlled exclusively via `body.has-photo` class.

```css
body.has-photo #confirm-photo-add { display: none; }
```

`body.has-photo` is added by `handlePhotoChange()` (called from both `#photo-input` and
`#photo-input-confirm`). It is removed in `clearAppState()`. When a photo is added via
`#photo-input-confirm`, the listener additionally syncs `#confirm-photo-preview` src,
hides `#confirm-photo-none`, and adds `body.has-photo` — because `handlePhotoChange` only
updates the idle panel elements (`photo-status`, `photo-status-text`).

---

## Google Maps — Static Embed in Confirm Panel

Static Maps API, not the Maps JavaScript API. No SDK. One `<img>` tag.

**Key injection pattern:**
```html
<!-- index.html <head> — only inline script permitted -->
<meta name="gmaps-key" content="YOUR_KEY_HERE">
<script>document.documentElement.dataset.gmapsKey =
  document.querySelector('meta[name="gmaps-key"]')?.content || ''</script>
```

Key in HTML source is acceptable because it is referrer-restricted in Google
Cloud Console to `sitespeak-ai.vercel.app/*` and `localhost`. This is the
standard Google Static Maps pattern.

**`renderConfirmMap()` — three states, no exceptions:**

| GPS state | API key | Result |
|---|---|---|
| Available | Present | `<img>` src set to Static Maps URL, image shown |
| Available | Absent | Coordinates text shown (`lat.toFixed(4), lng.toFixed(4)`), no image |
| Unavailable | Either | `#confirm-map-unavailable` message shown, image hidden |

Static Maps URL pattern:
```
https://maps.googleapis.com/maps/api/staticmap
  ?center={lat},{lng}&zoom=16&size=400x180
  &markers=color:red|{lat},{lng}&key={apiKey}
```

**Google Cloud Console setup (mandatory before deploy):**
- Static Maps API only — no other APIs enabled on this key
- HTTP referrers restricted to production domain + localhost
- Billing alert at $150

**`maps_link`** is generated server-side in `analyze.js`:
```js
const maps_link = (lat != null && lng != null)
  ? `https://maps.google.com/?q=${lat},${lng}`
  : null
```
Included in meta envelope and webhook payload. Trello card description includes it.

`motion@latest/dist/motion.js` is a UMD bundle — it cannot be statically imported
as an ES module. Doing so crashes the entire module graph and silently breaks the app
(record button dead, no-speech state never sets). Use `@motionone/dom` instead, which
ships a proper ES module build. The import is dynamic so a CDN failure degrades to
no-op animations rather than taking down the app.

```js
// @motionone/dom — stable vanilla ES module build
let _animate = null

async function getAnimate() {
  if (_animate !== null) return _animate
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@motionone/dom@latest/dist/index.es.js')
    _animate = mod.animate
  } catch (_) {
    _animate = () => {}  // no-op fallback — CSS Layer 1 handles all visibility
  }
  return _animate
}

export async function animateButtonRecord(el) { ... }
export async function animateButtonIdle(el) { ... }
export async function animatePanelIn(selector) { ... }
export async function animatePanelOut(selector) { ... }
export async function animateResultCascade(el) { ... }
// Container elements (el.children.length > 0, e.g. #result-card): fade opacity [0→1].
// Text-only elements (e.g. <p>): char-by-char cascade via <span> injection, then restores textContent.
export async function animateSendSuccess() { ... }
```

Each exported function calls `const animate = await getAnimate()` before use.
All functions wrapped in try/catch. CSS Layer 1 handles fallback if Motion fails.

---

## Make.com Webhook Payload Shape

```json
{
  "meta": {
    "worker_id": "Giorgos",
    "site_id": "Kifisia",
    "coordinates": { "lat": 37.9842, "lng": 23.7275 },
    "location_label": "Kifisia, Attica, Greece",
    "maps_link": "https://maps.google.com/?q=37.9842,23.7275",
    "submitted_at": "ISO string"
  },
  "task": {
    "task_title": "Wrong pipe diameter - Floor 3",
    "category": "electrical",
    "materials_requested": ["20mm pipes"],
    "urgency": "high",
    "summary": "The pipes on floor 3, room 12 are the wrong diameter..."
  },
  "raw_transcript": "string",
  "image": "base64 JPEG string or null"
}
```

`image` is a base64-encoded JPEG string when a photo was attached. Make.com
"Create an Attachment" module receives it and attaches to the Trello card.
It is `null` (not absent, not empty string) when no photo was taken.

**Trello card field mapping:**
- Card title → `task.task_title` (English)
- Description → `task.summary` + formatted meta block
- Worker → `meta.worker_id`
- Site → `meta.site_id`
- Location → `meta.maps_link`
- Submitted → `meta.submitted_at`
- Label colour → map `task.urgency` to Trello label colours
- Attachment → `image` field via "Create an Attachment" module

---

## Worker Identity — URL Params

Workers are identified by URL params set in a QR code, not by login.

```
https://sitespeak-ai.vercel.app/?site=Kifisia&worker=Giorgos
```

**`parseIdentityFromURL()`** — called first in `DOMContentLoaded`:
```js
function parseIdentityFromURL() {
  const params = new URLSearchParams(window.location.search)
  appState.worker_id = params.get('worker') || null
  appState.site_id = params.get('site') || null
  if (!appState.worker_id && !appState.site_id) {
    document.body.dataset.identity = 'none'
  } else {
    delete document.body.dataset.identity
  }
}
```

`body[data-identity="none"]` hides `#confirm-identity-block` via CSS.
Anonymous use (no URL params) is valid — identity fields are null in payload.

`worker_id` and `site_id` are **not reset** by `clearAppState()` — they
persist for the session (QR code was scanned once, identity stays).

Sent to backend as flat top-level fields in the request body:
```js
{ text, lat, lng, timestamp, image, locationLabel, worker_id, site_id }
```

---

## What NOT To Do

- Do not use `window.SpeechRecognition`, `window.webkitSpeechRecognition`, or `SpeechGrammarList` — Web Speech API is not used.
- Do not add a textarea fallback path — MediaRecorder works on all modern browsers.
- Do not set `recognition.lang` — it does not exist in this codebase.
- Do not hardcode readback language to `'el-GR'` — use `appState.detectedLanguage`.
- Do not add new npm dependencies without checking PLANNING.md rationale.
- Do not inline styles or scripts in `index.html` — one exception: the gmaps-key injection script.
- Do not use `system-ui`, `Inter`, `Roboto`, or `Arial` as fonts.
- Do not use orange (`#f97316`) as accent — accent is safety yellow (`#FFD600`).
- Do not use `JSON.parse` on Claude tool_use response — `.input` is already an object.
- Do not use Gemini or any Google AI SDK — AI provider is Anthropic for extraction, OpenAI for transcription only.
- Do not create a React or Vue app — vanilla JS, no build step.
- Do not fire-and-forget the webhook — it must be awaited and status returned.
- Do not request GPS mid-flow — cache it on page load only.
- Do not remove the usage cap logic.
- Do not hardcode the webhook confirmation label — use named string constants.
- Do not put `task_title_el` or `summary_el` in the tool schema — those fields were removed.
- Do not add code to an existing file without first reading its exports and direct callers. If the existing structure is unclear, ask. Never assume a utility or function does not already exist.
- Do not report a task complete when a sub-step produced an unverified or skipped result. Silent success is worse than explicit failure — state what was skipped, uncertain, or unverified.
- Do not average two conflicting patterns that already exist in the codebase. Pick one (prefer the newer or more tested), state which and why, and mark the other for cleanup.
- Do not modify a file you are uncertain about without stating the uncertainty explicitly first and waiting for confirmation.

---

## Testing & Validation

After completing any step, run the full gate in **TESTING.md** before proceeding.
The step sequence, gate checklist, and crush test matrix all live there.

**Step 7 — end-to-end integration on the Vercel preview URL — is the only
definition of "done" for the MVP.** Do not mark the build complete until
Step 7 passes in full.

---

## Root Cause Rule

1. Fix the root cause only — not the symptom.
2. State the root cause before writing the fix.
3. Re-run the full gate for the affected file after fixing.
4. If the fix changes documented behavior → trigger Documentation Sync Protocol.

Never swallow errors silently. Every caught error must log a meaningful message.

---

## Documentation Sync Protocol

When any decision, constraint, schema, or rule changes during execution:

1. Pause and notify with:
```
⚠️ DOCS OUT OF SYNC
Changed: <what changed, one line>
Affects: <which docs need updating>
Action: Re-upload updated file(s) to the Claude project after this session.
```

2. At session end, print:
```
📋 SESSION DOC CHANGES — RE-UPLOAD THESE FILES:
- [ ] CLAUDE.md   (reason: ...)
- [ ] PLANNING.md (reason: ...)
- [ ] PROMPT.md   (reason: ...)
Nothing to re-upload if list is empty.
```

Files to keep in sync: `CLAUDE.md`, `PLANNING.md`, `PROMPT.md`, `DEMO.md`, `PITCH.md`, `TESTING.md`.