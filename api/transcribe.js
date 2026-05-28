export const config = { api: { bodyParser: false } }

const MIME_TO_EXT = {
  'audio/webm':                   'webm',
  'audio/webm;codecs=opus':       'webm',
  'audio/mp4':                    'mp4',
  'audio/mp4;codecs=mp4a.40.2':   'mp4',
  'audio/ogg':                    'ogg',
  'audio/ogg;codecs=opus':        'ogg',
  'audio/mpeg':                   'mp3',
  'audio/wav':                    'wav',
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseMultipart(buf, boundary) {
  const CRLFCRLF   = Buffer.from('\r\n\r\n')
  const bBuf       = Buffer.from('--' + boundary)
  const partSep    = Buffer.from('\r\n--' + boundary)
  const fields     = {}

  let pos = buf.indexOf(bBuf)
  if (pos === -1) return fields
  pos += bBuf.length

  while (pos < buf.length) {
    // Closing boundary ends with '--'
    if (buf[pos] === 0x2D && buf[pos + 1] === 0x2D) break
    // Each part boundary is followed by \r\n
    if (buf[pos] === 0x0D && buf[pos + 1] === 0x0A) pos += 2
    else break

    const hEnd = buf.indexOf(CRLFCRLF, pos)
    if (hEnd === -1) break

    const headers    = buf.slice(pos, hEnd).toString()
    const bodyStart  = hEnd + 4
    const nextBound  = buf.indexOf(partSep, bodyStart)
    if (nextBound === -1) break

    const body = buf.slice(bodyStart, nextBound)
    const m    = headers.match(/name="([^"]+)"/i)
    if (m) fields[m[1]] = body

    pos = nextBound + partSep.length
  }

  return fields
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured.' })
    return
  }

  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > 10 * 1024 * 1024) {
    res.status(413).json({ error: 'Audio file too large (max 10MB).' })
    return
  }

  try {
    const contentType    = req.headers['content-type'] || ''
    const boundaryMatch  = contentType.match(/boundary=([^\s;]+)/)
    if (!boundaryMatch) {
      res.status(400).json({ error: 'Missing multipart boundary.' })
      return
    }

    const buf    = await readBody(req)
    const fields = parseMultipart(buf, boundaryMatch[1])

    const audioBuffer  = fields['audio']
    const mimeTypeRaw  = fields['mimeType']?.toString().trim() || 'audio/webm'
    const baseType     = mimeTypeRaw.split(';')[0].trim()
    const ext          = MIME_TO_EXT[baseType] || 'webm'

    const form = new FormData()
    form.append('file', new Blob([audioBuffer], { type: baseType }), `recording.${ext}`)
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body:    form,
    })

    if (!whisperRes.ok) {
      console.error('[transcribe] Whisper error:', whisperRes.status, await whisperRes.text())
      res.status(500).json({ error: 'Transcription failed.' })
      return
    }

    const data = await whisperRes.json()
    res.status(200).json({
      transcript:        data.text     ?? '',
      detected_language: data.language ?? 'en',
    })
  } catch (err) {
    console.error('[transcribe]', err.message)
    res.status(500).json({ error: 'Transcription failed.' })
  }
}
