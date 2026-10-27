import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import scrollState from '../../stores/scrollStore'
import './HeroSection.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Haute Cosmétique Hero Section
 * Fluidly choreographs typography and coordinates with the 3D studio scene.
 */
export default function HeroSection() {
  const heroRef = useRef(null)
  const contentRef = useRef(null)
  const badgeRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const actionsRef = useRef(null)
  const highlightsRef = useRef(null)
  const scrollIndicatorRef = useRef(null)

  useEffect(() => {
    if (!heroRef.current) return
    const ctx = gsap.context(() => {
      // ── Entrance Animation ──
      const entranceTl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.1,
      })

      entranceTl
        .fromTo(
          badgeRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 }
        )
        .fromTo(
          titleRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1 },
          '-=0.6'
        )
        .fromTo(
          subtitleRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          '-=0.7'
        )
        .fromTo(
          actionsRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          highlightsRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.4'
        )
        .fromTo(
          scrollIndicatorRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.7 },
          '-=0.3'
        )

      // ── Section ScrollTrigger ──
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          scrollState.hero.progress = self.progress
        },
      })

      // Parallax exit — gracefully floats upward as user scrolls
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0.15,
        scrollTrigger: {
          trigger: heroRef.current,
          start: '20% top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to(scrollIndicatorRef.current, {
        opacity: 0,
        y: -20,
        scrollTrigger: {
          trigger: heroRef.current,
          start: '5% top',
          end: '25% top',
          scrub: true,
        },
      })
    }, heroRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} className="hero" id="hero">
      <div ref={contentRef} className="hero__content">
        {/* Couture Badge */}
        <div ref={badgeRef} className="hero__badge">
          <span className="hero__badge-pulse" />
          <span className="hero__badge-text">Maquillaje Exclusivo & Packs Personalizados</span>
        </div>

        {/* Hero Title */}
        <h1 ref={titleRef} className="hero__title">
          <span className="hero__title-line hero__title-line--sub">El Arte de la</span>
          <span className="hero__title-line hero__title-line--main text-gradient">
            Belleza Pura
          </span>
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="hero__subtitle">
          Maquillaje de alta calidad pensado para resaltar tu belleza cada día. 
          Descubre tonos en tendencia, acabado impecable, larga duración y la opción 
          de armar tus cajas de regalo personalizadas con una dedicatoria especial.
        </p>

        {/* Actions */}
        <div ref={actionsRef} className="hero__actions">
          <a href="#lipstick" className="btn btn-primary" id="hero-cta-explore">
            <span>Explorar Colección</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
          <a href="#packs" className="btn btn-outline" id="hero-cta-packs">
            🎁 Armar Pack de Regalo
          </a>
        </div>

        {/* Brand Highlights */}
        <div ref={highlightsRef} className="hero__highlights">
          <div className="hero__highlight-item">
            <span className="hero__highlight-num">16H</span>
            <span className="hero__highlight-label">Fijación Sedosa</span>
          </div>
          <div className="hero__highlight-divider" />
          <div className="hero__highlight-item">
            <span className="hero__highlight-num">100%</span>
            <span className="hero__highlight-label">Vegano & Puro</span>
          </div>
          <div className="hero__highlight-divider" />
          <div className="hero__highlight-item">
            <span className="hero__highlight-num">0%</span>
            <span className="hero__highlight-label">Crueldad Animal</span>
          </div>
        </div>
      </div>

      {/* Floating Scroll Indicator */}
      <a href="#lipstick" ref={scrollIndicatorRef} className="hero__scroll-indicator" aria-label="Desplazar hacia abajo">
        <span className="hero__scroll-text">Desliza para Descubrir</span>
        <div className="hero__scroll-mouse">
          <div className="hero__scroll-wheel" />
        </div>
      </a>

      {/* Warm ambient radial glows */}
      <div className="hero__glow hero__glow--1" aria-hidden="true" />
      <div className="hero__glow hero__glow--2" aria-hidden="true" />
    </section>
  )
}

