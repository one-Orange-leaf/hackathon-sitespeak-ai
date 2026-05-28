# SiteSpeak AI — Demo Script
**Panathenea Hackathon 2026 | 28–29 May**
**Keep this open on the support laptop throughout the demo.**

---

## Pre-Demo Preflight (5 minutes before judges arrive)

Run through this in order. Do not skip steps.

- [ ] Open production URL on demo phone: `https://sitespeak-ai.vercel.app`
- [ ] Confirm app loads and reaches idle state (record button visible)
- [ ] Check usage counter: `curl https://sitespeak-ai.vercel.app/api/analyze` — confirm `count` is low
- [ ] Open Trello board — confirm it's visible and the correct board
- [ ] Test QR code scan with the demo phone — confirm identity populates in confirm panel
- [ ] Check microphone permission is pre-granted on demo phone (Settings → Safari/Chrome → Microphone)
- [ ] GPS: open app once to trigger permission grant, confirm location appears in confirm panel
- [ ] Silent signal agreed with team: if Tony raises one finger = switch to Scenario B; two fingers = abort and explain verbally

---

## Demo Scenarios

Three scenarios are scripted. Run them in order unless a judge requests otherwise.
Each takes approximately 90 seconds end-to-end.

---

### Scenario A — Greek Voice (Primary Demo)

**Setup:** Use the judge's personalised QR code (Lars, Mads, Christian, or Thomas — see QR table below).
Scan it before handing the phone to the judge.

**Script:**

> "This is the worker's phone. One button. They tap it, speak about the problem in their own language, and send. The AI does the rest. Hand it to anyone on your team — they don't need training."

Hand phone to judge or demonstrate yourself.

**What to say while recording:**
> [tap RECORD] "Έχουμε πρόβλημα με τους σωλήνες στον τρίτο όροφο. Χρειαζόμαστε σωλήνες είκοσι χιλιοστών για να διορθώσουμε το πρόβλημα."
> [tap again to stop — recording auto-stops at 30 seconds if not tapped]

**While Whisper transcribes (5–8 seconds):**
> "Whisper is transcribing on our server — any language, any accent, any noise level."

**In confirm panel:**
> "Worker sees their words back, hears readback in their own language, sees their GPS location. One tap to send."

**Tap SEND. While Claude processes (3–5 seconds):**
> "Claude Haiku extracts the structured task — title, category, urgency, materials needed — always in English for the PM."

**Result card appears:**
> "Title in English. Urgency badge. Materials as pills. Summary. And the confirmation — sent to Trello."

**Switch to Trello (support laptop):**
> "This card just landed. GPS coordinates, Google Maps link, the original Greek in the worker input block. The PM reads English, the worker spoke Greek. Zero translation, zero re-entry."

---

### Scenario B — Mandarin Voice (Multilingual Demo)

**Purpose:** Prove language-agnostic architecture. Use if a judge asks about non-Greek workers or international sites.

**Script:**

> "Greek workers are the primary user. But construction sites in Greece — especially large infrastructure projects — have workers from China, Bulgaria, Romania, Albania. Watch."

**What to say while recording (or have a teammate say it):**
> [tap RECORD] "三楼有水管漏水的问题，需要更换二十毫米的管道。"
> [tap again to stop]

**While processing:**
> "Same pipeline. Whisper detected Mandarin. Claude outputs English. The PM on the other end doesn't speak Mandarin. They don't have to."

**Result card:**
> "English title, English summary. The original Mandarin is preserved in the worker input block — for audit, for reference, for the worker themselves."

---

### Scenario C — Photo Only (Vision Demo)

**Purpose:** Show that voice is not required — a photo alone is enough input.

**Setup:** Have a photo ready in the phone's camera roll showing something that could be a site problem (cracked wall, exposed wiring, wrong materials). If not available, take one live.

**Script:**

> "Sometimes a worker's hands are too dirty or the noise is too loud to record a voice note. They just take a photo."

Tap the photo icon, select the image, skip recording.

> "No voice. Just a photo. Watch what Claude does with it."

Tap SEND.

**Result card:**
> "Claude inferred category, urgency, materials — from the image alone. No transcript. No prompting. The worker's job is to point the camera and tap."

---

## Judge QR Code Table

Print these separately. Each code encodes the judge's name and an assigned site.

| Judge | Name param | Site param | Why this site |
|---|---|---|---|
| Lars Rasmussen | `Lars+Rasmussen` | `Ellinikon` | Co-founder of Google Maps — the Maps link in every card is his work |
| Mads Rydahl | `Mads+Rydahl` | `Grand+Paris+Express` | Founding CPO of Siri — same voice-first problem, industrial scale |
| Christian Dorffer | `Christian+Dorffer` | `Fehmarnbelt+Tunnel` | Partner at Florent VC — Scandinavian tunnel, multinational workforce |
| Thomas Dohmke | `Thomas+Dohmke` | `Sagrada+Familia` | Founder of Entire.io — world's longest-running project |
| Team members | `[name]` | `Panathenea2026` | Honest about context |

URL format: `https://sitespeak-ai.vercel.app/?site=Ellinikon&worker=Lars+Rasmussen`

---

## Talking Points (Memorise These)

**The one-line pitch:**
> "Every construction tool is built for the PM at the desk. SiteSpeak is the first one built for the worker with dirty gloves."

**On why voice:**
> "Construction sites run on verbal communication. The gap is between noticing a problem and that problem entering a system. Typed forms don't work at 38 degrees with dirty hands. Voice does."

**On language:**
> "Greece has workers from Bulgaria, Romania, Albania, China. Whisper auto-detects any language. Claude always outputs English. The PM reads English without ever thinking about translation."

**On cost:**
> "Total demo cost today — including every submission, every photo — under 35 cents. The entire backend is under €0.35 per 50 requests."

**On the data model:**
> "Every card has GPS coordinates, a Google Maps link, the worker's identity, and a timestamp — all generated server-side, none of it typed by the worker."

**On the technical choice of forced tool use:**
> "Claude physically cannot return free text. The response schema is enforced at the API level. On demo day, that matters."

**On no login / no app install:**
> "Workers scan a QR code. That's the entire onboarding. No account, no password, no app download. The PM prints the QR codes."

---

## Failure Recovery

### App won't load
- Check phone is on WiFi — but note that venue WiFi sometimes blocks the Vercel CDN serving the app shell
- If suspect: switch phone to mobile data hotspot and reload
- Hard refresh: hold reload button → "Empty caches and hard reload"
- If still broken: open support laptop, navigate to URL, demo from laptop

### Microphone permission denied
- iOS: Settings → Safari → Microphone → Allow
- Android: Settings → Apps → Chrome → Permissions → Microphone
- If can't fix in 30 seconds: switch to Scenario C (photo-only), no mic needed

### Whisper returns empty transcript
- This is the photo-only path — just tap SEND, explain Claude works from the audio context even when transcript is minimal
- Or re-record more slowly and louder

### Make.com webhook fails (`⚠ Webhook delivery failed` shown)
- The AI result is still displayed correctly on screen — that's the important part
- Say: "The AI extraction worked — you can see the structured result. The Trello delivery had a hiccup; we've seen this under high venue WiFi load."
- Open Trello on support laptop and check if the card actually arrived anyway (Make.com sometimes delivers despite showing failure)

### Claude returns an error or 429
- Check usage counter first: `curl https://sitespeak-ai.vercel.app/api/analyze`
- If count is near 50: you've hit the demo cap — this is intentional, show the counter as a feature ("we capped it at 50 for today to control costs — $0.07 total")
- If not the cap: it's a transient API error — wait 10 seconds and retry once

### GPS shows null / no map
- This is handled gracefully — confirm panel shows "Location unavailable" and submission still works
- Say: "GPS is cached on load — indoor venues sometimes block it. The submission works without coordinates."

### Service worker serving stale build
- The version string in sw.js must have been incremented on last deploy
- Fix: open Chrome DevTools → Application → Service Workers → "Update on reload" → refresh
- Or: Settings → Clear browsing data → Cached images and files

### QR code scans to wrong URL / no identity
- Identity is null-safe — submission works without it
- Say: "Worker identity comes from the QR code. Anonymous submissions are valid — you see null in the payload rather than a name."

### Support laptop browser showing old Trello card
- Trello board may need a manual refresh (F5)
- Have the board open in a tab and refresh immediately after tapping SEND so the card appears live

---

## Silent Failure Signal Protocol

Agreed team signals during the live demo (no verbal communication needed):

| Signal | Meaning | Response |
|---|---|---|
| Tony raises 1 finger | Switch to Scenario B (Mandarin) | Team member opens Trello, filters to latest card |
| Tony raises 2 fingers | Abort current scenario, switch to verbal explanation | Team moves to whiteboard / deck |
| Tony touches ear | Check the support laptop — something needs fixing | Support person acts silently |
| Any team member says "actually" | They're pivoting the explanation — don't interrupt | Let them finish |

---

## Anticipated Judge Questions

**Q: "Why Anthropic and not OpenAI for the AI extraction?"**
A: "Anthropic's tool use API forces a typed response — Claude physically cannot return free text. OpenAI's function calling reduces but doesn't eliminate malformed output risk. For a live demo where a JSON parsing failure would be visible to everyone in the room, that difference matters."

**Q: "Why not just use the Web Speech API?"**
A: "Firefox, DuckDuckGo, Samsung Internet don't support it. It locks you to one language — you can't do `lang: 'el-GR'` and `lang: 'zh'` simultaneously. And it processes on-device without language detection. Whisper runs server-side, handles noisy environments, auto-detects any language, and returns a `detected_language` field we use for the readback voice."

**Q: "How do you handle data privacy for audio?"**
A: "Audio is sent to OpenAI Whisper for transcription and then discarded. We do not store audio server-side. Only the text transcript is retained in the task record. By default, OpenAI does not use API inputs to train their models. The privacy story is strong — no permanent audio, no recordings, no user accounts."

**Q: "What's the actual cost per submission?"**
A: "About half a cent per voice-only submission, half a cent to one cent when a photo is attached. The entire demo today — fifty submissions including photos — costs under 35 cents. At scale, this is under €5 per construction site per month in AI costs, which disappears inside a €49/month subscription."

**Q: "Could workers misuse this to send fake reports?"**
A: "Identity via QR code ties each submission to a named worker. The GPS coordinates and timestamp are generated server-side — workers can't fake them. In Phase B we add PIN authentication. For Phase A, the QR code is the identity layer — the same model as a badge scan."

**Q: "Why Make.com instead of direct Trello API?"**
A: "For the hackathon, Make.com gave us a working integration with zero code. Post-hackathon we replace it with direct Supabase integration and native webhook routing — the payload shape is already compatible, no refactor needed. Make.com was the right 12-hour decision."

**Q: "What's the roadmap?"**
A: "Q3: Worker PINs replacing URL param identity. Q4: HSE safety alerts — a second channel that fires when the AI detects critical safety language. V1: Supabase data layer, manager dashboard, per-site routing. V2: offline queuing for underground sites, UI localisation in Bulgarian and Romanian."

**Q: "Who are your competitors?"**
A: "Procore and Autodesk Build serve the PM at €200/user/month. They require full company onboarding. Workers don't use them — they tolerate them. Otter.ai and Fireflies give you transcription, not structured data. The worker still has to re-enter everything. We're the first tool designed from the worker's perspective — scan, speak, done."

**Q: "What's the business model?"**
A: "€49–99/month per active construction site, flat fee, not per user. One PM managing a 10-site portfolio pays €500–1000/month. You don't need many customers. The moat is the logged submissions — each company's data becomes training signal. That's why you charge monthly, not per transcription."
