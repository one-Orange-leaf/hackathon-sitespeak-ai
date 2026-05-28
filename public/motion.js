let _animate = null

async function getAnimate() {
  if (_animate !== null) return _animate
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@motionone/dom@latest/dist/index.es.js')
    _animate = mod.animate
  } catch (_) {
    _animate = () => {}
  }
  return _animate
}

export async function animateButtonRecord(el) {
  if (!el) return
  try {
    const animate = await getAnimate()
    animate(el, { scale: [1, 0.93, 1] }, { duration: 0.14 })
  } catch (_) {}
}

export async function animateButtonIdle(el) {
  if (!el) return
  try {
    const animate = await getAnimate()
    animate(el, { scale: [0.95, 1] }, { duration: 0.2, easing: 'ease-out' })
  } catch (_) {}
}

export async function animatePanelIn(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector
  if (!el) return
  try {
    const animate = await getAnimate()
    animate(el, { opacity: [0, 1], y: [8, 0] }, { duration: 0.24, easing: 'ease-out' })
  } catch (_) {}
}

export async function animatePanelOut(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector
  if (!el) return
  try {
    const animate = await getAnimate()
    animate(el, { opacity: [1, 0] }, { duration: 0.14 })
  } catch (_) {}
}

export async function animateResultCascade(el) {
  if (!el) return
  try {
    const animate = await getAnimate()
    if (el.children.length > 0) {
      animate(el, { opacity: [0, 1] }, { duration: 0.35, easing: 'ease-out' })
    } else {
      const text = el.textContent
      el.textContent = ''
      const chars = [...text].map(c => {
        const s = document.createElement('span')
        s.textContent = c
        el.appendChild(s)
        return s
      })
      const anim = animate(chars, { opacity: [0, 1] }, { duration: 0.02, delay: (_e, i) => i * 0.025 })
      const finish = anim?.finished ?? Promise.resolve()
      finish.catch(() => {}).finally(() => { el.textContent = text })
    }
  } catch (_) {}
}

export async function animateSendSuccess() {
  const el = document.getElementById('result-panel')
  if (!el) return
  try {
    const animate = await getAnimate()
    animate(el, { opacity: [0, 1], scale: [0.97, 1] }, { duration: 0.4, easing: 'ease-out' })
  } catch (_) {}
}
