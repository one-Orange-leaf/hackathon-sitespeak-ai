# api/analyze.js — Review Draft

> Review-only file. Not staged. Discard or rename to `api/analyze.js` when approved.

---

## Resolved Decisions

| # | Topic | Decision | Rationale |
|---|---|---|---|
| 1 | Category enum | ✅ Use `inspection` (not `equipment`) | Matches `app.js CATEGORY_LABELS` — no frontend change needed |
| 2 | Sanitise location | ✅ Keep in `analyze.js` (defence-in-depth) | `app.js` strips backticks/backslashes; `analyze.js` strips `<>` as server-side guard |
| 3 | System prompt | ✅ Use full CLAUDE.md canonical version | Photo-only inference, ambiguity handling, and equal-weight image+text rules needed for demo |
| 4 | `maps_link` format | ✅ `https://maps.google.com/?q=` | CLAUDE.md version — Make.com/Trello already mapped to this format |
| 5 | Coords guard | ✅ `lat != null && lng != null` | Truthiness check fails for `lat = 0` (valid equatorial coordinate) |
| 6 | Model ID | ⚠️ `claude-haiku-4-5` | Verify this alias resolves correctly on Vercel before go-live |
| 7 | `location_label` | ✅ Include as `null` | CLAUDE.md meta envelope requires the field; Phase B populates it via Nominatim |

---

## Code

```js
import Anthropic from '@anthropic-ai/sdk'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const MAX_REQUESTS = 50
let requestCount = 0
let resetTime = Date.now() + 12 * 60 * 60 * 1000

const client = new Anthropic()

const SYSTEM_PROMPT =
  'You are an assistant for construction site management.\n' +
  'A worker has recorded a voice note or photographed a problem on-site.\n' +
  'Extract structured task information using the submit_task tool.\n' +
  "Always respond in English regardless of the worker's input language.\n" +
  'task_title and summary must be in English — translate if necessary.\n' +
  'If no voice transcript is provided, infer all fields from the image.\n' +
  'If the image is ambiguous, set urgency to medium and note uncertainty in summary.\n' +
  'When both an image and text description are provided, treat them as complementary\n' +
  'sources of equal weight. Do not let a vague text description override clear\n' +
  'visual evidence in the image.\n' +
  'Be concise and practical. Assume construction context for ambiguous terms.'

const CATEGORY_ENUM = ['electrical', 'plumbing', 'structural', 'materials', 'safety', 'inspection', 'other']

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sanitise(str) {
  return str?.trim().slice(0, 2000).replace(/[<>]/g, '') ?? ''
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (Date.now() > resetTime) {
    requestCount = 0
    resetTime = Date.now() + 12 * 60 * 60 * 1000
  }

  if (req.method === 'GET') {
    res.status(200).json({ count: requestCount, max: MAX_REQUESTS, remaining: MAX_REQUESTS - requestCount })
    return
  }

  if (requestCount >= MAX_REQUESTS) {
    res.status(429).json({ error: 'Demo limit reached.' })
    return
  }
  requestCount++

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
    return
  }

  try {
    const { transcript, photoBase64, mimeType, worker, site, lat, lng } = req.body

    const sanitisedTranscript = sanitise(transcript)

    const content = []
    if (photoBase64) {
      content.push({
        type: 'image',
        source: {
          type:       'base64',
          media_type: mimeType || 'image/jpeg',
          data:       photoBase64,
        },
      })
    }
    content.push({ type: 'text', text: sanitisedTranscript })

    const response = await client.messages.create({
      model:       'claude-haiku-4-5',
      max_tokens:  1024,
      system:      SYSTEM_PROMPT,
      tool_choice: { type: 'tool', name: 'submit_task' },
      tools: [
        {
          name:        'submit_task',
          description: "Submit the structured task extracted from the worker's voice note.",
          input_schema: {
            type: 'object',
            properties: {
              task_title:          { type: 'string', description: 'Short task title in English, max 60 characters' },
              category:            { type: 'string', enum: CATEGORY_ENUM },
              urgency:             { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              summary:             { type: 'string', description: '2-3 sentence summary in English' },
              materials_requested: { type: 'array', items: { type: 'string' }, description: 'Materials or tools mentioned. Empty array if none.' },
            },
            required: ['task_title', 'category', 'urgency', 'summary', 'materials_requested'],
          },
        },
      ],
      messages: [{ role: 'user', content }],
    })

    const analysis = response.content.find(b => b.type === 'tool_use').input

    const hasCoords = lat != null && lng != null
    const meta = {
      worker_id:      worker || null,
      site_id:        site   || null,
      submitted_at:   new Date().toISOString(),
      coordinates:    hasCoords ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
      location_label: null,
      maps_link:      hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : null,
      requests_used:  requestCount,
      requests_max:   MAX_REQUESTS,
    }

    const webhookPayload = {
      task:       analysis,
      meta,
      transcript: sanitisedTranscript,
      image:      photoBase64 || null,
    }

    let webhook_ok = false
    if (process.env.MAKE_WEBHOOK_URL) {
      try {
        const wh = await fetch(process.env.MAKE_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(webhookPayload),
        })
        webhook_ok = wh.ok
      } catch (err) {
        console.error('[webhook]', err.message)
      }
    } else {
      console.warn('[webhook] MAKE_WEBHOOK_URL not set — skipping')
    }

    res.status(200).json({
      meta,
      task:              analysis,
      transcript:        sanitisedTranscript,
      detected_language: 'en',
      webhook_ok,
    })
  } catch (err) {
    console.error('[analyze]', err.message)
    res.status(500).json({ error: 'Internal server error.' })
  }
}
```

---

## One Open Item

**Model ID (decision 6):** `claude-haiku-4-5` is used as written. The full versioned ID is `claude-haiku-4-5-20251001`. Test on a Vercel preview deploy to confirm the alias resolves — if it throws a model-not-found error, swap to the full ID.
