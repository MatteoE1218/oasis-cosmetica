import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import scrollState from '../../stores/scrollStore'
import './AtmosphereBackground.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Atmospheric Dynamic Background — Luminous Editorial Edition
 * Smoothly morphs delicate background tones and warm light orbs across sections.
 */
export default function AtmosphereBackground() {
  const bgRef = useRef(null)
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)
  const orb3Ref = useRef(null)

  useEffect(() => {
    if (!bgRef.current) return
    const ctx = gsap.context(() => {
      let lastZone = -1

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          scrollState.globalProgress = p

          // Determinar zona solo cuando cruza el umbral (evita recalcular estilos en cada pixel)
          let currentZone = 0
          if (p >= 0.22 && p < 0.48) currentZone = 1
          else if (p >= 0.48 && p < 0.72) currentZone = 2
          else if (p >= 0.72) currentZone = 3

          if (currentZone !== lastZone && bgRef.current) {
            lastZone = currentZone
            if (currentZone === 0) {
              bgRef.current.style.setProperty('--bg-base', '#FDFBF7')
            } else if (currentZone === 1) {
              bgRef.current.style.setProperty('--bg-base', '#F8EAE8')
            } else if (currentZone === 2) {
              bgRef.current.style.setProperty('--bg-base', '#F5EFEB')
            } else {
              bgRef.current.style.setProperty('--bg-base', '#F9F6F0')
            }
          }
        },
      })
    }, bgRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={bgRef} className="atmosphere-bg" aria-hidden="true">
      {/* Base background color with smooth transition */}
      <div className="atmosphere-bg__base" />

      {/* Atmospheric dynamic radial glow orbs */}
      <div ref={orb1Ref} className="atmosphere-orb atmosphere-orb--1" />
      <div ref={orb2Ref} className="atmosphere-orb atmosphere-orb--2" />
      <div ref={orb3Ref} className="atmosphere-orb atmosphere-orb--3" />

      {/* Soft editorial vignette */}
      <div className="atmosphere-bg__vignette" />
    </div>
  )
}

