# SiteSpeak AI

**Mobile-first voice capture for construction sites.**

A worker taps one button, speaks about the problem in any language, optionally photographs it, confirms with a map preview of their location, and sends. In under 10 seconds, a structured task card lands in Trello — categorised, prioritised, with materials listed, GPS coordinates, a Google Maps link, and the photo attached.

> Built at Panathenea Hackathon 2026 (28–29 May) by Anthony Paraskevakis, Pavlos Avgerinos, Maria Papakonstantinou, and Yiota Minou.

---

## The Problem

Construction sites run on verbal communication. A foreman notices a problem — missing rebar, a water leak, a faulty socket — and either tells someone verbally (forgotten by lunch) or tries to type it into a phone with dirty gloves in direct sunlight. Neither works. Tasks fall through the cracks, materials don't get ordered, incidents go unlogged.

**SiteSpeak closes the gap between noticing something on-site and that thing entering a system where it can be acted on.**

---

## Features

- **One-tap voice recording** — MediaRecorder, works in Chrome, Safari, and Firefox
- **Any language** — OpenAI Whisper auto-detects the worker's language server-side
- **English output** — Claude always outputs English for the PM, regardless of input language
- **Photo support** — optional photo compressed client-side before transmission
- **GPS + reverse geocoding** — coordinates cached on page load, never mid-flow
- **Guaranteed structured JSON** — Anthropic forced tool use; Claude cannot return free text
- **Live Trello integration** — via Make.com webhook, photo attached automatically
- **QR code identity** — workers scan a QR code, no login or app install required
- **PWA** — installable, offline-capable app shell
- **Zero dependencies** (beyond `@anthropic-ai/sdk`) — no bundler, no build step

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS, no framework, no build step |
| Backend | Vercel serverless, Node.js 20 ESM |
| Transcription | OpenAI Whisper (`whisper-1`, `verbose_json`) |
| AI extraction | Claude Haiku (`claude-haiku-4-5`), forced tool use |
| Photo compression | Browser Canvas API — client-side, no dependency |
| Webhook | Make.com → Trello + ImgBB |
| Animations | CSS + `@motionone/dom` (CDN, lazy import) |

---

## Prerequisites

- Node.js 20+
- A [Vercel](https://vercel.com) account (free hobby tier is fine)
- An [Anthropic](https://console.anthropic.com) API key
- An [OpenAI](https://platform.openai.com) API key (Whisper)
- A [Make.com](https://make.com) account with a custom webhook scenario → Trello

---

## Local Development

```bash
git clone https://github.com/one-orange-leaf/hackathon-sitespeak-ai.git
cd hackathon-sitespeak-ai
npm install
```

Create `.env.local` with your keys:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/...
```

Install the Vercel CLI and run locally:

```bash
npm install -g vercel
vercel dev
```

The app runs at `http://localhost:3000`. GPS requires HTTPS — use the Vercel preview URL for full GPS testing.

> **Note:** Add a Google Maps Static API key to `public/index.html` in the `<meta name="gmaps-key">` tag to enable the map preview in the confirm panel. The key must be referrer-restricted in Google Cloud Console. Without the key, coordinates are shown as text instead.

---

## Deployment

Push to `main` — Vercel auto-deploys.

Set the three environment variables in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | `api/analyze.js` — Claude extraction |
| `OPENAI_API_KEY` | `api/transcribe.js` — Whisper transcription |
| `MAKE_WEBHOOK_URL` | `api/analyze.js` — Trello routing via Make.com |

**Every deploy:** increment the service worker version string in `public/sw.js` (`const CACHE = 'sitespeak-vN'`) — without this, phones serve the old cached build even after a fix is pushed live.

---

## Worker Identity via QR Codes

Workers are identified by URL parameters set in a printed QR code — no login, no app install:

```
https://sitespeak-ai.vercel.app/?site=Ellinikon&worker=Lars+Rasmussen
```

The PM prints one QR code per worker or per site zone. Identity persists for the session. Anonymous use (no params) is valid — `worker_id` and `site_id` are null in the payload.

---

## API Endpoints

### `POST /api/transcribe`

Receives raw audio binary. Returns:

```json
{ "transcript": "...", "detected_language": "el" }
```

### `POST /api/analyze`

Receives JSON with `transcript`, optional `photoBase64`, GPS coords, and identity params. Returns:

```json
{
  "meta": {
    "worker_id": "Lars Rasmussen",
    "site_id": "Ellinikon",
    "coordinates": { "lat": 37.9842, "lng": 23.7275 },
    "location_label": "Kifisia, Attica, Greece",
    "maps_link": "https://maps.google.com/?q=37.9842,23.7275",
    "submitted_at": "2026-05-28T10:00:00.000Z"
  },
  "task": {
    "task_title": "Wrong pipe diameter - Floor 3",
    "category": "plumbing",
    "urgency": "high",
    "materials_requested": ["20mm pipes"],
    "summary": "The pipes on floor 3, room 12 are the wrong diameter..."
  },
  "transcript": "sanitised transcript sent to Claude",
  "detected_language": "el",
  "webhook_ok": true
}
```

### `GET /api/analyze`

Returns the current usage counter:

```json
{ "count": 12, "max": 50, "remaining": 38 }
```

---

## Cost Model

| Item | Per request | 50 requests |
|---|---|---|
| Claude Haiku input | ~$0.0001 | $0.005 |
| Claude Haiku output | ~$0.0002 | $0.009 |
| Whisper (30s audio) | ~$0.003 | $0.15 |
| Vision (when photo) | ~$0.001 | $0.05 |
| **Total ceiling** | **~$0.005** | **~$0.21** |

Make.com, ImgBB: free tier.
Google Maps Static: $2 per 1000 requests.
Vercel: free hobby tier.

**Total demo day cost at 50 requests: under €0.35.**

---

## Project Structure

```
sitespeak-ai/
├── public/
│   ├── index.html        # App shell — markup only, no inline scripts or styles
│   ├── style.css         # All visual design; state visibility via body[data-state]
│   ├── app.js            # State machine, MediaRecorder, GPS, fetch, result card
│   ├── motion.js         # Optional animation layer — CDN lazy import, no-op fallback
│   ├── sw.js             # Service worker — versioned cache
│   └── manifest.json     # PWA manifest
├── api/
│   ├── transcribe.js     # OpenAI Whisper endpoint
│   └── analyze.js        # Claude extraction + Make.com webhook routing
├── vercel.json           # Serverless function config (timeouts, runtime)
└── package.json          # Single npm dependency: @anthropic-ai/sdk
```

---

## Documentation

| File | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full pipeline, every technology decision, bugs fixed, security model, cost breakdown, roadmap |
| [DEMO.md](DEMO.md) | Demo script, judge QR codes, failure recovery, anticipated Q&A |
| [RUNBOOK.md](RUNBOOK.md) | Hackathon day operational playbook — preflight checklist, failure mode tables, emergency redeploy |
| [TESTING.md](TESTING.md) | Gate checklist and integration test matrix |
| [SUMMING.md](SUMMING.md) | Current build state and active blockers |

---

## License

See [LICENSE](LICENSE).
