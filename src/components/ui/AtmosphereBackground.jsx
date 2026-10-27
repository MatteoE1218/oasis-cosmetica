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
      // Single, unified ScrollTrigger observer for global progress and background palette
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          scrollState.globalProgress = p

          if (bgRef.current) {
            if (p < 0.22) {
              // Section 1: Hero — Soft Ivory / Alabaster
              bgRef.current.style.setProperty('--bg-base', '#FDFBF7')
              bgRef.current.style.setProperty('--orb-1-color', 'rgba(235, 215, 195, 0.35)')
              bgRef.current.style.setProperty('--orb-2-color', 'rgba(245, 230, 215, 0.40)')
              bgRef.current.style.setProperty('--orb-3-color', 'rgba(230, 205, 195, 0.25)')
            } else if (p >= 0.22 && p < 0.48) {
              // Section 2: Lipstick — Dusty Powder Rose / Nude
              bgRef.current.style.setProperty('--bg-base', '#F8EAE8')
              bgRef.current.style.setProperty('--orb-1-color', 'rgba(235, 190, 198, 0.38)')
              bgRef.current.style.setProperty('--orb-2-color', 'rgba(240, 205, 210, 0.42)')
              bgRef.current.style.setProperty('--orb-3-color', 'rgba(225, 180, 190, 0.30)')
            } else if (p >= 0.48 && p < 0.72) {
              // Section 3: Liquid Foundation / Serum — Warm Cashmere Beige
              bgRef.current.style.setProperty('--bg-base', '#F5EFEB')
              bgRef.current.style.setProperty('--orb-1-color', 'rgba(230, 212, 195, 0.40)')
              bgRef.current.style.setProperty('--orb-2-color', 'rgba(238, 222, 205, 0.45)')
              bgRef.current.style.setProperty('--orb-3-color', 'rgba(215, 195, 175, 0.32)')
            } else {
              // Section 4: Compact Powder & Catalog — Soft Porcelain Pearl
              bgRef.current.style.setProperty('--bg-base', '#F9F6F0')
              bgRef.current.style.setProperty('--orb-1-color', 'rgba(235, 225, 215, 0.35)')
              bgRef.current.style.setProperty('--orb-2-color', 'rgba(240, 230, 220, 0.38)')
              bgRef.current.style.setProperty('--orb-3-color', 'rgba(228, 218, 208, 0.28)')
            }
          }
        },
      })

      // Parallax drifting for ambient orbs
      gsap.to(orb1Ref.current, {
        y: 280,
        x: -50,
        ease: 'none',
        scrollTrigger: {
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5,
        },
      })

      gsap.to(orb2Ref.current, {
        y: -240,
        x: 60,
        ease: 'none',
        scrollTrigger: {
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5,
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

