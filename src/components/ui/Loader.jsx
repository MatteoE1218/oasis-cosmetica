import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import './Loader.css'

/**
 * Cinematic loading screen with brand reveal, shimmer progress bar,
 * and smooth exit transition.
 */
export default function Loader({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const loaderRef = useRef()
  const brandRef = useRef()
  const barFillRef = useRef()

  useEffect(() => {
    if (!loaderRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.loader__letter',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          delay: 0.3,
        }
      )
      gsap.fromTo(
        '.loader__tagline',
        { opacity: 0 },
        { opacity: 1, duration: 0.8, delay: 1.2, ease: 'power2.out' }
      )
    }, loaderRef.current)

    // Simulate elegant loading progress smoothly
    let current = 0
    const interval = setInterval(() => {
      current += Math.random() * 20 + 8
      if (current >= 100) {
        current = 100
        clearInterval(interval)

        // Smooth dissolve exit animation
        setTimeout(() => {
          gsap.to(loaderRef.current, {
            opacity: 0,
            scale: 1.03,
            filter: 'blur(8px)',
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              setVisible(false)
              onComplete?.()
            },
          })
        }, 180)
      }
      setProgress(Math.min(Math.round(current), 100))
    }, 70)

    return () => {
      clearInterval(interval)
      ctx.revert()
    }
  }, [onComplete])

  if (!visible) return null

  return (
    <div ref={loaderRef} className="loader" id="loader">
      <div className="loader__inner">
        {/* Brand name — letter by letter */}
        <div ref={brandRef} className="loader__brand" aria-label="Oasis">
          {'OASIS'.split('').map((letter, i) => (
            <span key={i} className="loader__letter">
              {letter}
            </span>
          ))}
        </div>

        <p className="loader__tagline">Alta Cosmética</p>

        {/* Progress bar */}
        <div className="loader__progress">
          <div
            ref={barFillRef}
            className="loader__bar-fill"
            style={{ width: `${progress}%` }}
          />
          <div className="loader__shimmer" />
        </div>

        <span className="loader__percent">{Math.round(progress)}%</span>
      </div>

      {/* Ambient particles */}
      <div className="loader__particles" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="loader__particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              '--size': `${2 + Math.random() * 4}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
