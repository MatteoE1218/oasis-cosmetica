import { useEffect, useCallback } from 'react'

/**
 * 3D tilt effect hook for product cards.
 * Applies perspective transform based on cursor position within the element.
 */
export default function useTiltEffect(ref, options = {}) {
  const { maxTilt = 12, scale = 1.03, speed = 400, glare = true } = options

  const handleMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const tiltX = (maxTilt / 2 - y * maxTilt).toFixed(2)
    const tiltY = (x * maxTilt - maxTilt / 2).toFixed(2)

    el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale}, ${scale}, ${scale})`
    el.style.transition = `transform ${speed * 0.3}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`

    if (glare) {
      const glareEl = el.querySelector('.tilt-glare')
      if (glareEl) {
        const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 180
        glareEl.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.12) 0%, transparent 80%)`
        glareEl.style.opacity = '1'
      }
    }
  }, [ref, maxTilt, scale, speed, glare])

  const handleMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
    el.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`

    if (glare) {
      const glareEl = el.querySelector('.tilt-glare')
      if (glareEl) glareEl.style.opacity = '0'
    }
  }, [ref, speed, glare])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [ref, handleMouseMove, handleMouseLeave])
}
