# SiteSpeak AI — Product Requirements Document

**Version:** 2.0  
**Date:** 28 May 2026  
**Author:** Anthony Paraskevakis  
**Status:** Phase A live. Phase B requirements defined. Not yet scheduled.

---

## 1. Executive Summary

SiteSpeak AI turns a construction worker's voice note and optional photo into a structured, routed task card — in under 10 seconds, with no login, no app install, and no English required.

The core insight: every construction site management tool is designed for the project manager at a desk. SiteSpeak is the first tool designed for the worker with dirty gloves. The gap it closes is between a worker *noticing* a problem on-site and that problem *entering a system* where it can be acted on.

**Phase A** (shipped, live at `sitespeak-ai.vercel.app`): full end-to-end pipeline — voice in any language, optional photo, GPS, structured AI extraction, Trello routing.

**Phase B** (defined below): authenticated worker identity, manager dashboard, per-site webhook routing, Supabase data layer.

---

## 2. Problem Statement

### 2.1 The Gap

Greek construction sites — and construction sites broadly — run on verbal communication. A worker notices a problem: wrong pipe diameter, exposed cable, missing rebar. The current paths are:

1. **Tell someone verbally.** Forgotten by lunch. No record exists.
2. **Type it into a phone.** Dirty gloves, direct sunlight, Greek keyboard on an English phone. 3 minutes of friction to log a 5-second observation.
3. **Nothing.** Most common outcome. The problem waits until it becomes a larger problem.

The result: tasks fall through the cracks, materials don't get ordered, incidents go unlogged, and the PM discovers the problem at the worst possible moment.

### 2.2 Why Existing Tools Don't Solve It

| Tool | Who it's for | Why workers don't use it |
|---|---|---|
| Procore / Autodesk Build | PM at desk | €200+/user/month, requires full company onboarding, English-first |
| Fieldwire | Site supervisor | Same — form-based UI designed for a tablet in an office |
| Otter.ai / Fireflies | Knowledge workers | Transcription only — worker still re-enters the data manually |
| Apple/Google Dictation | General consumer | Transcription only, no extraction, no routing, single language |

None of these tools are designed for the moment of *capture* — standing on a construction site, hands occupied, time pressure, possible language barrier.

### 2.3 The Specific User Need

> "I need to report what I'm looking at right now, in the way I naturally communicate, without stopping to figure out a tool."

This requirement rules out: forms, text fields, login flows, English-only UI, and any tool that requires a clean, dry hand to operate.

---

## 3. Users

### 3.1 Primary User — Site Worker

**Profile:** Construction site worker. May be Greek, Bulgarian, Romanian, Albanian, Chinese — the workforce is multilingual. Likely on Android. Outdoor, often loud, often poor signal. Phone is personal. No company email. Hands are not clean.

**What they need:**
- Zero onboarding — scan a QR code, done
- Input in their own language
- Confirmation that the report was sent (they won't check Trello)
- A working tool at 5-bar signal, 4G, bad WiFi, and indoors

**What they will not do:**
- Create an account
- Install a native app
- Learn a new UI
- Type a report

### 3.2 Secondary User — Site Manager / Foreman

**Profile:** Greek project manager, likely at a desk or in a site office. Uses Trello or equivalent. May manage multiple sites simultaneously. Reads English. Makes purchasing and scheduling decisions based on worker input.

**What they need:**
- Structured, actionable task cards — not a wall of text
- English output they can act on immediately
- GPS coordinates and a Google Maps link
- Photo evidence of the problem
- Category and urgency classification to triage their queue
- Materials list to forward to procurement
- Worker identity tied to each report

**What they will not do:**
- Read Greek voice transcripts
- Manually categorise and re-enter task data
- Trust unstructured reports for procurement decisions

### 3.3 Non-Users (Out of Scope)

- Workers without any smartphone
- Sites where the PM does not use any project management tool
- Regulatory compliance / HSE incident reporting (Phase B+ concern)

---

## 4. Goals and Success Metrics

### 4.1 Phase A Goals (Hackathon MVP)

| Goal | Metric | Target |
|---|---|---|
| End-to-end pipeline proven | Voice → Trello card in <10s | ✅ Achieved |
| Works on all modern browsers | Chrome + Safari + Firefox | ✅ Achieved |
| Multi-language voice input | Greek, Mandarin, English tested | ✅ Achieved |
| Photo capture and routing | Photo attached to Trello card | ✅ Achieved |
| GPS coordinates in payload | lat/lng in Trello card | ✅ Achieved |
| Demo budget under €0.50 | Total API cost for 50 runs | ✅ ~€0.35 |

### 4.2 Phase B Goals

| Goal | Metric | Target |
|---|---|---|
| Authenticated worker identity | PIN login replaces URL params | Worker cannot spoof identity |
| Historical data queryable | Manager sees submission history | Any time range, any site |
| Submission volume | Active construction sites onboarded | 3 pilot sites in Q3 |
| Retention | Sites active after 30 days | >60% |
| Task capture rate | Worker reports per site per week | Measurable baseline established |

### 4.3 Business Goal

**Primary:** €49–99/month per active construction site, flat fee, not per user.

One PM managing 10 sites: €500–1000/month. Viable at low customer count.

**Moat:** Each company's logged submission history becomes training signal. Category patterns, site-specific material names, crew roles — this data is valuable and it accumulates passively.

---

## 5. Functional Requirements

### 5.1 Worker Flow (Phase A — live)

#### FR-01 — Identity Resolution from URL
- On page load, parse `?worker=` and `?site=` URL parameters
- Store as `worker_id` and `site_id` in app state
- These values persist for the session — not reset between submissions
- Anonymous use (no params) is valid — identity fields are null in payload
- `body[data-identity="none"]` hides the identity block in the confirm panel via CSS

#### FR-02 — GPS Acquisition
- Request geolocation on page load, silently, as part of app initialisation
- Never request GPS mid-flow — it fires a blocking modal at the worst moment
- Cache coordinates for the session: `maximumAge: 60000` (reuse cached fix up to 1 minute)
- `gpsState` transitions: `pending → resolved | failed`
- `enterConfirming()` waits up to 3 seconds for GPS to leave `pending` before proceeding
- Null coordinates never block submission

#### FR-03 — Voice Recording
- User taps the RECORD button to start, taps again to stop
- Auto-stop at 30 seconds
- Uses `MediaRecorder` with negotiated MIME type (webm → ogg → mp4, in order)
- Audio blob POSTed as raw binary to `/api/transcribe`
- Web Speech API is **not used** — not required, not supported across all target browsers
- `visibilitychange` handler stops recording if user switches app (recording stops cleanly, state preserved)

#### FR-04 — Transcription
- `/api/transcribe` receives raw audio binary
- Forwards to OpenAI Whisper (`whisper-1`, `verbose_json`)
- Returns `{ transcript, detected_language }`
- Empty transcript (very short recording or silence) returns 200 with empty string — valid for photo-only path
- MIME type from `Content-Type` header determines the filename extension sent to Whisper
- Whisper uses filename extension to select the audio decoder — mismatch = transcription failure

#### FR-05 — Photo Capture
- Optional photo via `<input type="file" accept="image/*">` — no `capture` attribute
- Worker chooses camera or gallery; desktop opens a file picker
- Photo available at two points: idle screen (before recording) and confirm panel (after recording, before send)
- Both inputs call the same `handlePhotoChange()` handler
- Client-side compression mandatory before transmission: max 800px width, JPEG quality 0.7, Canvas API
- `FileReader → new Image() → Canvas → toBlob` path (not `createImageBitmap` — absent on iOS 14)
- Client-side size check: reject blobs > 5MB with error

#### FR-06 — Confirm Panel
- Shows transcribed text, detected language label, GPS map (or unavailable message), worker/site identity
- 🔊 readback button triggers `speechSynthesis.speak()` with `lang: appState.detectedLanguage`
- Readback is opt-in (button tap) — never auto-played; iOS Safari requires user gesture for `speechSynthesis`
- Worker can add a photo at this stage if they didn't at idle
- Worker can discard and restart — in-flight fetches are aborted via `AbortController`

#### FR-07 — Submission and AI Extraction
- `POST /api/analyze` with: transcript, optional photoBase64, GPS coordinates, worker identity
- Input sanitisation applied client-side before every fetch: `slice(0, 2000)`, strip backticks and backslashes
- Empty transcript with no photo → block, show error "Please record a voice note or add a photo."
- Claude Haiku with forced tool use (`tool_choice: { type: 'tool', name: 'submit_task' }`)
- Guaranteed structured JSON: `{ task_title, category, urgency, materials_requested, summary }`
- `task_title` and `summary` always in English regardless of worker's input language
- Category enum: `electrical | plumbing | structural | materials | safety | inspection | other`
- Urgency enum: `low | medium | high | critical`

#### FR-08 — Webhook Routing
- Make.com webhook awaited (not fire-and-forget)
- `webhook_ok: true | false` returned to client and displayed on result card
- Webhook payload includes full task, meta envelope, raw transcript, and base64 image (or null)
- If `MAKE_WEBHOOK_URL` not set: webhook skipped, `webhook_ok: false`, AI extraction still completes
- Trello card fields: title, description (summary + meta block), urgency label colour, GPS link, photo attachment

#### FR-09 — Result Card
- Displays: task title (English), urgency badge with colour coding, category label, materials pills, summary, webhook status
- Urgency badge CSS classes: `urgency-low`, `urgency-medium`, `urgency-high`, `urgency-critical`
- `urgency-critical` uses a blinking animation
- `webhook-status` element is `aria-live` for accessibility
- Restart button disabled for 2 seconds after successful submission (cooldown protects against rapid re-submission during demo)

#### FR-10 — Error Handling
- Auto-retry: one retry after 3 seconds on fetch failure or non-200 response
- If retry fails: show error panel, reset to idle
- Loading timeout: after 4 seconds in `sending` state, display "Still processing..." below spinner
- All caught errors log a meaningful message — no silent error swallowing

#### FR-11 — Usage Cap
- 50-request aggregate cap per 12-hour window in `api/analyze.js`
- In-memory counter resets on function cold start or on any redeploy
- `GET /api/analyze` returns `{ count, max, remaining }` — public, no auth required
- Exceeding cap: HTTP 429 with `{ error: 'Demo limit reached.' }`

### 5.2 Manager Experience (Phase A — via Trello)

The Phase A manager experience is entirely mediated by Make.com → Trello. The PM sees:

- Task title in English
- Category as a Trello label colour
- Urgency level
- Summary paragraph
- Worker name and site
- Submission timestamp
- GPS coordinates as a Google Maps link
- Photo attachment (when present)

No SiteSpeak-specific UI for the manager exists in Phase A. This is intentional — the PM's tool is Trello.

### 5.3 Phase B Requirements (Not Yet Built)

#### FR-B01 — Worker PIN Authentication
- Replace URL param identity with a 4-digit PIN
- Worker enters PIN on first use per session
- Server-side PIN → identity lookup (Supabase)
- Identity cannot be spoofed via URL manipulation
- PIN assignment by PM — same friction as printing a QR code

#### FR-B02 — Submission History
- Every submission persisted to Supabase: full response envelope + timestamp
- PM can query by site, date range, category, urgency, worker
- Export to CSV

#### FR-B03 — Manager Dashboard
- Web UI (separate from the worker app)
- Task queue view: filterable by site, category, urgency, date
- Per-site analytics: submission volume over time, category distribution, urgency breakdown
- No custom build required for standard Trello integrations — dashboard supplements, not replaces

#### FR-B04 — Per-Site Webhook Routing
- Each site has a configured webhook destination (Trello board, Slack channel, email, etc.)
- `site_id` determines routing — no Make.com reconfiguration per customer
- Fallback: default webhook if site has no specific routing

#### FR-B05 — HSE Safety Alert Channel
- If `category === 'safety'` and `urgency === 'critical'`: trigger separate alert channel
- No AI schema change required — these fields already exist
- Separate Make.com scenario (or direct Supabase function) routes to dedicated Slack channel or SMS

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Notes |
|---|---|---|
| Transcription latency | < 8s for 30s recording | Whisper typical on warm container |
| Claude extraction latency | < 5s | Haiku is the fastest Claude model |
| End-to-end (tap SEND → result card) | < 15s | Acceptable for field conditions |
| App shell load (cached) | < 1s | Service worker cache |
| App shell load (cold, 4G) | < 3s | Vercel CDN + minimal payload |

### 6.2 Reliability

- Auto-retry on fetch failure (one retry, 3s delay)
- AbortController on every in-flight fetch — discard is always clean
- GPS failure is graceful — submission never blocked by missing coordinates
- Webhook failure is graceful — AI result still shown, `webhook_ok: false` displayed
- Service worker provides offline error handling for API routes (503 JSON response)

### 6.3 Compatibility

| Browser | Platform | Status |
|---|---|---|
| Chrome 120+ | Android | ✅ Verified |
| Safari 17+ | iOS | ✅ Verified (readback fix applied) |
| Firefox 120+ | Android | ⚠ Bugs fixed, not formally gated |
| Samsung Internet | Android | Not tested — MediaRecorder should work |
| Chrome 120+ | Desktop | ✅ Verified |

HTTPS required for: Geolocation API, MediaRecorder on some browsers. Vercel preview URLs qualify. `localhost` qualifies. Plain `http://` does not.

### 6.4 Security

- API keys server-side only — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `MAKE_WEBHOOK_URL` never in client code or API responses
- Google Maps key in HTML source is acceptable — referrer-restricted in Google Cloud Console to `sitespeak-ai.vercel.app/*` and `localhost`
- Input sanitisation on all text before Claude: 2000-character cap, strip backticks and backslashes (prompt injection surface reduction)
- Audio sent to OpenAI Whisper for transcription only — not stored server-side, not logged
- CORS headers on all API responses
- `.env.local` in `.gitignore` — keys never enter the repository

### 6.5 Cost

- Total demo day cost (50 submissions including photos): under €0.35
- Per-request cost: ~€0.005 voice-only, ~€0.01 with photo
- Make.com: free tier (1000 ops/month)
- ImgBB: free tier
- Vercel: free hobby tier
- Google Maps Static: $2 per 1000 requests

At commercial scale (Phase B):
- Claude Haiku pricing does not meaningfully change the unit economics per site
- Supabase free tier handles low pilot volume; first paid tier at $25/month
- Make.com: first paid tier at $9/month per active scenario

---

## 7. Technical Constraints

These are locked decisions — not open for revision without triggering a documentation sync.

| Constraint | Decision | Reason |
|---|---|---|
| No build step | Vanilla JS, no bundler | Hackathon speed; zero dependency conflicts on demo day |
| AI provider for extraction | Anthropic only | Forced tool use = guaranteed JSON; no `JSON.parse` risk |
| AI provider for transcription | OpenAI only | Whisper is the only production-grade server-side option |
| No Web Speech API | MediaRecorder only | Firefox/DuckDuckGo/Samsung Internet don't support Web Speech |
| No React/Vue | Vanilla JS | No build step; single-screen app gains nothing from a framework |
| State machine via `body[data-state]` | CSS attribute selectors | Designer owns style.css independently; JS never touches visibility |
| Image compression | Canvas API, max 800px, JPEG 0.7 | Uncompressed phone photo = 6000+ tokens ≈ $0.50; compressed = ~1600 tokens ≈ $0.013 |
| `FileReader` image path | Not `createImageBitmap` | `createImageBitmap` absent on iOS 14 |
| Single npm dependency | `@anthropic-ai/sdk` only | Zero build complexity; all other APIs called via native `fetch` |

---

## 8. Data Model

### 8.1 Response Envelope (Phase A)

Every `/api/analyze` response returns this shape:

```json
{
  "meta": {
    "worker_id": "string | null",
    "site_id": "string | null",
    "submitted_at": "ISO8601",
    "coordinates": { "lat": number, "lng": number } | null,
    "location_label": "string | null",
    "maps_link": "string | null",
    "requests_used": number,
    "requests_max": 50
  },
  "task": {
    "task_title": "string (English, max 60 chars)",
    "category": "electrical | plumbing | structural | materials | safety | inspection | other",
    "urgency": "low | medium | high | critical",
    "materials_requested": ["string"],
    "summary": "string (English, 2-3 sentences)"
  },
  "transcript": "string (sanitised, original language)",
  "webhook_ok": boolean
}
```

`submitted_at` is always populated server-side. `location_label` is computed client-side (Nominatim) and forwarded in the request body. `transcript` comes from Whisper. `detected_language` is returned by `/api/transcribe` — the client stores it in `appState.detectedLanguage` before calling `/api/analyze` and does not need it echoed back.

### 8.2 Make.com Webhook Payload

```json
{
  "meta": { "...same as above..." },
  "task": { "...same as above..." },
  "transcript": "string",
  "image": "base64 JPEG string | null"
}
```

`image` is `null` (not absent, not empty string) when no photo was submitted. The Make.com `image Exists` filter gates the ImgBB upload step on this field.

### 8.3 Phase B — Supabase Schema (Planned)

```sql
submissions (
  id           uuid primary key default gen_random_uuid(),
  worker_id    text,
  site_id      text,
  submitted_at timestamptz not null,
  lat          double precision,
  lng          double precision,
  location_label text,
  task_title   text not null,
  category     text not null,
  urgency      text not null,
  summary      text,
  materials    text[],
  transcript   text,
  detected_language text,
  webhook_ok   boolean,
  raw_envelope jsonb
)
```

---

## 9. Edge Cases and Decisions

### 9.1 Photo-Only Path
Empty transcript with a photo present is valid. Claude infers all fields from the image. System prompt: "If no voice transcript is provided, infer all fields from the image."

### 9.2 Voice-Only Path
No photo required. `image` is null in the webhook payload. The Make.com `image Exists` filter prevents the ImgBB step from running.

### 9.3 Anonymous Submission
No URL params → `worker_id` and `site_id` are null. `body[data-identity="none"]` hides the identity block in the confirm panel. Submission proceeds normally. Trello card has empty worker/site fields.

### 9.4 GPS Unavailable
Indoor venues, denied permissions, iOS HTTPS requirement. `gpsState = 'failed'`, `coordinates` is null in meta, `maps_link` is null. Submission never blocked. Confirm panel shows "Location unavailable."

### 9.5 Very Short Recording
Whisper returns an empty or near-empty transcript. This is treated as a photo-only path if a photo is attached. If no photo is attached, the confirm panel shows the empty transcript and the worker can still submit — the send button checks `(sanitisedText.length === 0 && !photoBase64)` and blocks with an error.

### 9.6 Language Detection Confidence
Whisper may return `"en"` for very short recordings when it cannot determine the language with confidence. This is accepted behaviour — readback defaults to English, which is functional if not ideal.

### 9.7 Webhook Failure
AI extraction result is still displayed correctly on the result card. `webhook_ok: false` is shown. The failure is informational — the worker's report is not lost from the AI result, only from Trello delivery. Worker can be instructed to tap SEND again if needed.

---

## 10. Out of Scope

**Phase A:**
- Per-IP rate limiting (in-memory aggregate cap only)
- Native Trello API (Make.com intermediary)
- Manager dashboard or any PM-facing UI
- Worker authentication (URL param identity only)
- Offline submission queuing
- Localized UI (English UI only; voice input is any language)
- Push notifications
- Analytics or reporting

**Phase B:**
- Direct Supabase integration (replaces Make.com for data persistence)
- Offline queuing via Service Worker Background Sync
- UI localization (Bulgarian, Albanian, Romanian)
- Per-IP rate limiting using Vercel KV
- White-label / multi-tenant routing

---

## 11. Roadmap

### Phase A — Complete ✅
Full pipeline: voice capture → Whisper → Claude → Make.com → Trello. GPS + photo. QR code identity. PWA. Deployed on Vercel.

### Phase B — Q3 2026
Worker PIN authentication. Supabase data layer. Manager dashboard (read-only, filterable). Per-site webhook routing. HSE safety alert channel.

**Entry criteria for Phase B:**
- 3 pilot sites willing to run Phase A for 2 weeks and provide feedback
- Make.com operational limits approached (> 500 submissions/month across sites)
- At least one PM has asked for historical data access

### V1 — Q4 2026
Direct Supabase integration replacing Make.com. Per-IP rate limiting. Offline queuing. Paid tier launched at €49/month per site.

### V2 — 2027
UI localization (Bulgarian, Albanian, Romanian). Mobile app wrapper (Capacitor or PWA install push). Enterprise multi-tenant with SSO.

---

## 11. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | Should Phase B PINs be 4-digit (fast to enter) or 6-digit (harder to guess)? | Product | Medium |
| 2 | What is the acceptable latency ceiling on mobile data (not WiFi) before workers abandon the submission? | Research | High |
| 3 | Does Make.com need to be replaced before commercial launch, or can it scale to early pilot volume? | Engineering | Medium |
| 4 | Should `detected_language` drive the UI language (labels, button text) or just the readback voice? | Product | Low |
| 5 | Is the 50-request in-memory cap sufficient for early pilot sites, or does Phase B need persistent rate limiting immediately? | Engineering | High |
| 6 | For the manager dashboard: Trello replacement or supplement? | Product | High |
