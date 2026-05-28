// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const RESTART_COOLDOWN_MS   = 2000
const MAX_RECORDING_SECONDS = 30
const GPS_WAIT_MS           = 3000
const GPS_POLL_MS           = 500
const STILL_PROCESSING_MS   = 4000

const WEBHOOK_LABEL_SUCCESS = '✓ Sent to Trello'
const WEBHOOK_LABEL_FAILURE = '⚠ Webhook delivery failed'

const CATEGORY_LABELS = {
  electrical: 'Electrical',
  plumbing:   'Plumbing',
  structural: 'Structural',
  materials:  'Materials',
  safety:     'Safety',
  inspection: 'Inspection',
  other:      'Other'
}

const URGENCY_LABELS = {
  low:      'LOW',
  medium:   'MEDIUM',
  high:     'HIGH',
  critical: 'CRITICAL'
}

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const appState = {
  // Identity (never reset)
  worker: null,
  site:   null,

  // GPS (never reset)
  gpsCoords:     null,
  gpsState:      'pending',   // 'pending' | 'granted' | 'denied' | 'unavailable'
  locationLabel: null,

  // Per-submission (reset on clearAppState)
  photoFile:         null,
  photoDataUrl:      null,
  audioBlob:         null,
  audioChunks:       [],
  audioMimeType:     '',
  transcript:        null,
  detectedLanguage:  'en',

  // Runtime handles (reset on clearAppState)
  mediaRecorder:        null,
  _recordingTimer:      null,
  _stillProcessingTimer: null,

  // Last result (for Phase B traceability)
  lastResponse: null
}

// ═══════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════
const STATUS_TEXT = {
  idle:        'READY',
  recording:   'RECORDING',
  transcribing:'TRANSCRIBING',
  confirming:  'CONFIRM',
  processing:  'SENDING',
  result:      'SUBMITTED',
  error:       'ERROR'
}

function setState(state) {
  document.body.dataset.state = state
  setText('status-text', STATUS_TEXT[state] || state.toUpperCase())

  // Clear any pending "Still processing…" timer
  if (appState._stillProcessingTimer) {
    clearTimeout(appState._stillProcessingTimer)
    appState._stillProcessingTimer = null
  }
  setText('loading-text', '')

  if (state === 'processing') {
    appState._stillProcessingTimer = setTimeout(() => {
      if (document.body.dataset.state === 'processing') {
        setText('loading-text', 'Still processing…')
      }
    }, STILL_PROCESSING_MS)
  }
}

// ═══════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  parseIdentityFromURL()
  initGeolocation()
  registerServiceWorker()
  bindEvents()
  setState('idle')
})

function parseIdentityFromURL() {
  const params = new URLSearchParams(window.location.search)
  appState.worker = params.get('worker') || null
  appState.site   = params.get('site')   || null

  if (!appState.worker && !appState.site) {
    document.body.dataset.identity = 'none'
  }
}

function initGeolocation() {
  appState.gpsState = 'pending'
  if (!navigator.geolocation) {
    appState.gpsState = 'unavailable'
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      appState.gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      appState.gpsState  = 'granted'
      reverseGeocode(appState.gpsCoords.lat, appState.gpsCoords.lng)
        .then(label => { appState.locationLabel = label })
        .catch(()   => { appState.locationLabel = null })
    },
    () => {
      appState.gpsState  = 'denied'
      appState.gpsCoords = null
    },
    { timeout: 10000, maximumAge: 60000 }
  )
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) throw new Error('Nominatim error')
  const data = await res.json()
  return data.display_name || null
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('[sw]', err.message))
  }
}

// ═══════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════
function bindEvents() {
  document.getElementById('photo-input')
    ?.addEventListener('change', handlePhotoChange)
  document.getElementById('photo-input-confirm')
    ?.addEventListener('change', handlePhotoChange)
  document.getElementById('record-btn')
    ?.addEventListener('click', handleRecordToggle)
  document.getElementById('readback-btn')
    ?.addEventListener('click', handleReadback)
  document.getElementById('submit-btn')
    ?.addEventListener('click', handleSubmit)
  document.getElementById('cancel-btn')
    ?.addEventListener('click', handleCancel)
  document.getElementById('restart-btn')
    ?.addEventListener('click', handleRestart)
  document.getElementById('error-restart-btn')
    ?.addEventListener('click', handleRestart)

  // Stop recording if user tabs away mid-session
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && document.body.dataset.state === 'recording') {
      stopRecording()
    }
  })
}

// ═══════════════════════════════════════════
// PHOTO
// ═══════════════════════════════════════════
function handlePhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  compressImage(file)
    .then(blob => {
      appState.photoFile = file
      const reader = new FileReader()
      reader.onload = ev => {
        appState.photoDataUrl = ev.target.result
        const preview = document.getElementById('confirm-photo-preview')
        const none    = document.getElementById('confirm-photo-none')
        if (preview) { preview.src = appState.photoDataUrl; preview.hidden = false }
        if (none)    none.hidden = true
        document.body.classList.add('has-photo')
      }
      reader.readAsDataURL(blob)
    })
    .catch(err => console.error('[photo]', err.message))

  setText('photo-status', 'Photo added ✓')
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.onload  = e => {
      const img   = new Image()
      img.onerror = () => reject(new Error('Image load failed'))
      img.onload  = () => {
        const canvas = document.createElement('canvas')
        const scale  = Math.min(1, 800 / img.width)
        canvas.width  = Math.round(img.width  * scale)
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

// ═══════════════════════════════════════════
// RECORDING
// ═══════════════════════════════════════════
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    ''
  ]
  return types.find(t => t === '' || MediaRecorder.isTypeSupported(t)) ?? ''
}

function handleRecordToggle() {
  const state = document.body.dataset.state
  if      (state === 'idle')      startRecording()
  else if (state === 'recording') stopRecording()
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      appState.audioMimeType = getSupportedMimeType()
      appState.audioChunks   = []

      const options = appState.audioMimeType ? { mimeType: appState.audioMimeType } : {}
      appState.mediaRecorder = new MediaRecorder(stream, options)

      appState.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) appState.audioChunks.push(e.data)
      }

      appState.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        appState.audioBlob  = new Blob(appState.audioChunks, {
          type: appState.audioMimeType || 'audio/webm'
        })
        appState.audioChunks = []
        clearTimeout(appState._recordingTimer)
        appState._recordingTimer = null
        enterConfirming()
      }

      appState.mediaRecorder.start()
      setState('recording')
      setText('record-label', 'STOP')

      appState._recordingTimer = setTimeout(() => {
        if (document.body.dataset.state === 'recording') stopRecording()
      }, MAX_RECORDING_SECONDS * 1000)
    })
    .catch(err => {
      console.error('[mic]', err.message)
      showError('Microphone access denied. Please allow microphone access and try again.')
    })
}

function stopRecording() {
  clearTimeout(appState._recordingTimer)
  appState._recordingTimer = null
  if (appState.mediaRecorder?.state !== 'inactive') {
    appState.mediaRecorder.stop()
  }
  setText('record-label', 'RECORD')
}

// ═══════════════════════════════════════════
// CONFIRMING
// ═══════════════════════════════════════════
async function enterConfirming() {
  setState('confirming')

  // Identity
  setText('confirm-worker', appState.worker ? `Worker: ${appState.worker}` : 'Worker: —')
  setText('confirm-site',   appState.site   ? `Site: ${appState.site}`     : 'Site: —')

  // Photo preview
  const preview = document.getElementById('confirm-photo-preview')
  const none    = document.getElementById('confirm-photo-none')
  if (appState.photoDataUrl) {
    if (preview) { preview.src = appState.photoDataUrl; preview.hidden = false }
    if (none)    none.hidden = true
  } else {
    if (preview) preview.hidden = true
    if (none)    none.hidden = false
  }

  // Transcription
  const transcribingHint = document.getElementById('transcribing-hint')
  if (transcribingHint) transcribingHint.textContent = 'Transcribing…'

  try {
    if (appState.audioBlob?.size > 0) {
      const formData = new FormData()
      formData.append('audio',    appState.audioBlob)
      formData.append('mimeType', appState.audioMimeType)

      const res  = await fetchWithRetry('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()

      appState.transcript       = sanitise(data.transcript || '')
      appState.detectedLanguage = data.detected_language   || 'en'
      setText('confirm-transcript', appState.transcript || '[No speech detected]')
    } else {
      appState.transcript = ''
      setText('confirm-transcript', '[No audio — photo only]')
    }
  } catch (err) {
    console.error('[transcribe]', err.message)
    appState.transcript = ''
    setText('confirm-transcript', '[Transcription failed — you can still submit with photo]')
  }

  if (transcribingHint) transcribingHint.textContent = ''

  // GPS gate — wait up to 3 s if still pending
  if (appState.gpsState === 'pending') await waitForGPS()
  renderConfirmGPS()
  renderConfirmMap()
}

async function waitForGPS() {
  const deadline = Date.now() + GPS_WAIT_MS
  while (appState.gpsState === 'pending' && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, GPS_POLL_MS))
  }
}

function renderConfirmGPS() {
  const el = document.getElementById('confirm-gps')
  if (!el) return
  if (appState.gpsCoords) {
    el.textContent = appState.locationLabel
      || `${appState.gpsCoords.lat.toFixed(5)}, ${appState.gpsCoords.lng.toFixed(5)}`
  } else {
    el.textContent = 'Location unavailable'
  }
}

function renderConfirmMap() {
  const img    = document.getElementById('confirm-map-img')
  const unavail = document.getElementById('confirm-map-unavailable')
  const apiKey  = document.documentElement.dataset.gmapsKey

  if (!appState.gpsCoords) {
    if (img)    img.hidden    = true
    if (unavail) unavail.hidden = false
    return
  }

  const { lat, lng } = appState.gpsCoords

  if (!apiKey) {
    if (img)    img.hidden    = true
    if (unavail) {
      unavail.hidden      = false
      unavail.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
    return
  }

  const src = [
    'https://maps.googleapis.com/maps/api/staticmap',
    `?center=${lat},${lng}&zoom=15&size=600x300`,
    `&markers=color:red|${lat},${lng}`,
    `&key=${apiKey}`
  ].join('')

  if (img)    { img.src = src; img.hidden = false }
  if (unavail) unavail.hidden = true
}

// ═══════════════════════════════════════════
// READBACK
// ═══════════════════════════════════════════
function handleReadback() {
  if (!window.speechSynthesis || !appState.transcript) return
  window.speechSynthesis.cancel()
  const utt  = new SpeechSynthesisUtterance(appState.transcript)
  utt.lang   = appState.detectedLanguage || 'en'
  window.speechSynthesis.speak(utt)
}

// ═══════════════════════════════════════════
// SUBMIT
// ═══════════════════════════════════════════
async function handleSubmit() {
  if (!appState.transcript && !appState.photoDataUrl) {
    showError('Please record a voice note or add a photo.')
    return
  }

  setState('processing')

  const body = {
    transcript:  appState.transcript || '',
    photoBase64: appState.photoDataUrl ? appState.photoDataUrl.split(',')[1] : null,
    mimeType:    'image/jpeg',
    worker:      appState.worker,
    site:        appState.site,
    lat:         appState.gpsCoords?.lat ?? null,
    lng:         appState.gpsCoords?.lng ?? null
  }

  try {
    const res  = await fetchWithRetry('/api/analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    })
    const data = await res.json()
    appState.lastResponse = data
    renderResultPanel(data)
    setState('result')
  } catch (err) {
    console.error('[submit]', err.message)
    showError('Could not reach the server. Please check your connection and try again.')
  }
}

function renderResultPanel(data) {
  const task = data.task || {}
  const meta = data.meta || {}
  const urgency = task.urgency || 'medium'

  // Urgency badge (colour class) + priority text field
  const badge = document.getElementById('result-urgency-badge')
  if (badge) {
    badge.textContent = URGENCY_LABELS[urgency] || urgency.toUpperCase()
    badge.className   = `urgency-${urgency}`
  }
  setText('result-priority', URGENCY_LABELS[urgency] || urgency.toUpperCase())

  setText('result-title',    task.task_title || '—')
  setText('result-category', CATEGORY_LABELS[task.category] || task.category || '—')
  setText('result-summary',  task.summary    || '—')

  // Materials pills
  const materialsRow = document.getElementById('result-materials-row')
  const materialsEl  = document.getElementById('result-materials')
  const materials    = task.materials_requested || []
  if (materialsEl) {
    materialsEl.innerHTML = materials
      .map(m => `<span class="material-pill">${escapeHtml(m)}</span>`)
      .join('')
  }
  if (materialsRow) materialsRow.hidden = materials.length === 0

  // Meta row
  const metaWorker = document.getElementById('result-meta-worker')
  const metaSite   = document.getElementById('result-meta-site')
  const metaCoords = document.getElementById('result-meta-coords')
  const webhookEl  = document.getElementById('webhook-status')

  if (metaWorker) metaWorker.textContent = meta.worker_id ? `Worker: ${meta.worker_id}` : ''
  if (metaSite)   metaSite.textContent   = meta.site_id   ? `Site: ${meta.site_id}`     : ''
  if (metaCoords && meta.maps_link) {
    metaCoords.innerHTML = `<a href="${escapeHtml(meta.maps_link)}" target="_blank" rel="noopener">View on Maps</a>`
  }
  if (webhookEl) {
    webhookEl.textContent = data.webhook_ok ? WEBHOOK_LABEL_SUCCESS : WEBHOOK_LABEL_FAILURE
  }

  // Worker's original words
  setText('result-transcript', data.transcript || '—')

  // Usage counter
  const counter = document.getElementById('usage-counter')
  if (counter && meta.requests_used != null) {
    counter.textContent = `${meta.requests_used}/50`
  }
}

// ═══════════════════════════════════════════
// CANCEL / RESTART
// ═══════════════════════════════════════════
function handleCancel() {
  clearAppState()
  setState('idle')
}

function handleRestart(e) {
  const btn = e.currentTarget
  btn.disabled = true
  setTimeout(() => { btn.disabled = false }, RESTART_COOLDOWN_MS)
  clearAppState()
  setState('idle')
}

function clearAppState() {
  appState.photoFile        = null
  appState.photoDataUrl     = null
  appState.audioBlob        = null
  appState.audioChunks      = []
  appState.audioMimeType    = ''
  appState.transcript       = null
  appState.detectedLanguage = 'en'
  appState.mediaRecorder    = null

  // GPS and identity are intentionally preserved

  document.body.classList.remove('has-photo')
  setText('photo-status', 'Add photo')
  setText('record-label', 'RECORD')
  setText('confirm-transcript', '')

  const preview = document.getElementById('confirm-photo-preview')
  if (preview) { preview.src = ''; preview.hidden = true }
  const none = document.getElementById('confirm-photo-none')
  if (none) none.hidden = false

  const photoInput = document.getElementById('photo-input')
  if (photoInput) photoInput.value = ''
  const photoInputConfirm = document.getElementById('photo-input-confirm')
  if (photoInputConfirm) photoInputConfirm.value = ''
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function showError(message) {
  setText('error-message', message)
  setState('error')
}

function sanitise(text) {
  return text.slice(0, 2000).trim().replace(/`/g, "'").replace(/\\/g, ' ')
}

function setText(id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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