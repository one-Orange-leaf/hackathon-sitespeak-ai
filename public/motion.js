// Animation helpers — optional enhancement layer.
// CSS Layer 1 (style.css) handles all visibility; these are additive only.
// If this module fails to load or throws, the app continues unaffected.
 
/**
 * Briefly scales element up then back to draw attention.
 * @param {Element} el
 * @param {number} duration — total ms for the pulse cycle (default 600)
 */
export function pulseElement(el, duration = 600) {
  if (!el) return
 
  const half = duration / 2
  const original = el.style.transition
  el.style.transition = `transform ${half}ms ease`
  el.style.transform = 'scale(1.06)'
 
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.transition = `transform ${half}ms ease`
      el.style.transform = 'scale(1)'
      setTimeout(() => {
        el.style.transition = original
      }, half)
    }, half)
  })
}
 
/**
 * Fades element from opacity 0 to 1.
 * Assumes element is already visible in the DOM (display not none).
 * @param {Element} el
 * @param {number} duration — fade duration in ms (default 300)
 */
export function fadeIn(el, duration = 300) {
  if (!el) return
 
  el.style.opacity = '0'
  el.style.transition = `opacity ${duration}ms ease`
 
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1'
    })
  })
}
 