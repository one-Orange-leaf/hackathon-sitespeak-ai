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
    const { transcript, photoBase64, mimeType, worker, site, lat, lng, locationLabel, detectedLanguage } = req.body

    const sanitisedTranscript = sanitise(transcript)

    const cleanBase64 = typeof photoBase64 === 'string'
      ? photoBase64.replace(/^data:[^;]+;base64,/, '')
      : null

    const content = []
    if (cleanBase64) {
      content.push({
        type: 'image',
        source: {
          type:       'base64',
          media_type: mimeType || 'image/jpeg',
          data:       cleanBase64,
        },
      })
    }
    if (sanitisedTranscript) content.push({ type: 'text', text: sanitisedTranscript })

    if (content.length === 0) {
      res.status(400).json({ error: 'No content to analyze. Please record audio or attach a photo.' })
      return
    }

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
      location_label: locationLabel || null,
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
      detected_language: detectedLanguage || 'en',
      webhook_ok,
    })
  } catch (err) {
    console.error('[analyze]', err.message)
    res.status(500).json({ error: 'Internal server error.' })
  }
}
