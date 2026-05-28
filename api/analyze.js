import Anthropic from '@anthropic-ai/sdk'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[api/analyze] ANTHROPIC_API_KEY is not set — all POST requests will return 500')
}

const SUBMIT_TASK_TOOL = {
  name: 'submit_task',
  description: 'Submit the structured task extracted from the worker voice note and/or photo.',
  input_schema: {
    type: 'object',
    properties: {
      task_title: {
        type: 'string',
        description: 'Short task title in English, max 60 characters'
      },
      category: {
        type: 'string',
        enum: ['electrical', 'plumbing', 'structural', 'materials', 'safety', 'inspection', 'other']
      },
      materials_requested: {
        type: 'array',
        items: { type: 'string' },
        description: 'Materials or tools mentioned. Empty array if none.'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical']
      },
      summary: {
        type: 'string',
        description: '2-3 sentence summary in English'
      }
    },
    required: ['task_title', 'category', 'materials_requested', 'urgency', 'summary']
  }
}

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

const MAX_REQUESTS = 50
let requestCount = 0
let resetTime = Date.now() + 12 * 60 * 60 * 1000

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'GET') {
    res.status(200).json({ count: requestCount, max: MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - requestCount) })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server misconfiguration' })
    return
  }

  try {
    if (Date.now() > resetTime) {
      requestCount = 0
      resetTime = Date.now() + 12 * 60 * 60 * 1000
    }
    requestCount++
    if (requestCount > MAX_REQUESTS) {
      res.status(429).json({ error: 'Demo limit reached.' })
      return
    }

    const { text, lat, lng, timestamp, image, locationLabel, worker_id, site_id } = req.body
    if ((!text || !text.trim()) && !image) {
      res.status(400).json({ error: 'Text or photo required.' })
      return
    }

    const safeText    = text ? text.slice(0, 2000).trim() : ''
    const sanitised   = safeText.replace(/`/g, "'").replace(/\\/g, ' ')
    const submittedAt = new Date().toISOString()

    const textBlock = {
      type: 'text',
      text: [
        sanitised ? `Worker voice note: "${sanitised}"` : 'No voice transcript provided.',
        `Recorded at: ${timestamp || submittedAt}`,
        `GPS: ${lat != null ? `${lat}, ${lng}` : 'Not available'}`,
        '',
        'Extract the structured task using the submit_task tool.'
      ].join('\n')
    }

    const userContent = image
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, textBlock]
      : [textBlock]

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const aiResponse = await client.messages.create({
      model:       'claude-haiku-4-5',
      max_tokens:  1024,
      system:      SYSTEM_PROMPT,
      messages:    [{ role: 'user', content: userContent }],
      tools:       [SUBMIT_TASK_TOOL],
      tool_choice: { type: 'tool', name: 'submit_task' }
    })

    const toolUse = aiResponse.content.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('No tool_use block in Anthropic response')
    const analysis = toolUse.input

    const hasCoords  = lat != null && lng != null
    const maps_link  = hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : null
    const meta = {
      worker_id:      worker_id ?? null,
      site_id:        site_id   ?? null,
      coordinates:    hasCoords ? { lat, lng } : null,
      location_label: locationLabel ?? null,
      maps_link,
      submitted_at:   submittedAt,
      requests_used:  requestCount,
      requests_max:   MAX_REQUESTS,
    }

    const webhookPayload = {
      meta,
      task:           analysis,
      raw_transcript: sanitised,
      image:          image || null
    }

    let webhook_ok = false
    if (process.env.MAKE_WEBHOOK_URL) {
      try {
        const wh = await fetch(process.env.MAKE_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(webhookPayload)
        })
        webhook_ok = wh.ok
        if (!wh.ok) console.warn('[webhook] Non-OK response:', wh.status)
      } catch (err) {
        console.error('[webhook] Failed:', err.message)
      }
    } else {
      console.warn('[webhook] MAKE_WEBHOOK_URL not set — skipping')
    }

    res.status(200).json({ meta, task: analysis, transcript: sanitised, webhook_ok })

  } catch (err) {
    console.error('[api/analyze]', err.message)
    res.status(500).json({ error: 'Internal server error.' })
  }
}
