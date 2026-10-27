import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { collections } from '../../data/products'
import scrollState from '../../stores/scrollStore'
import './TextureShowcase.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Texture Showcase — Interactive color swatch gallery with
 * liquid distortion morphing effect on hover and GSAP scroll reveals.
 */
export default function TextureShowcase() {
  const sectionRef = useRef(null)
  const [activeCollection, setActiveCollection] = useState(0)
  const swatchRefs = useRef([])

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // Direct section scroll tracking
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          scrollState.textures.progress = self.progress
        },
      })

      // Section title reveal
      gsap.fromTo(
        '.showcase__title',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Collection tabs stagger in
      gsap.fromTo(
        '.showcase__tab',
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Swatches stagger reveal
      gsap.fromTo(
        '.swatch',
        { scale: 0.85, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          stagger: 0.06,
          duration: 0.5,
          ease: 'back.out(1.8)',
          scrollTrigger: {
            trigger: '.showcase__swatches',
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const current = collections[activeCollection]

  return (
    <section ref={sectionRef} className="showcase section" id="colecciones">
      <div className="container">
        {/* Section header */}
        <div className="section-header">
          <p className="showcase__label">Colecciones</p>
          <h2 className="showcase__title section-title">
            Texturas que <span className="text-gradient">Seducen</span>
          </h2>
        </div>

        {/* Collection tabs */}
        <div className="showcase__tabs" role="tablist">
          {collections.map((col, i) => (
            <button
              key={col.id}
              role="tab"
              aria-selected={i === activeCollection}
              className={`showcase__tab ${i === activeCollection ? 'showcase__tab--active' : ''}`}
              onClick={() => setActiveCollection(i)}
              id={`tab-${col.id}`}
            >
              <span className="showcase__tab-dot" style={{ background: col.colors[0].hex }} />
              {col.name}
            </button>
          ))}
        </div>

        {/* Active collection display */}
        <div className="showcase__display" role="tabpanel">
          <div className="showcase__info">
            <h3 className="showcase__collection-name">{current.name}</h3>
            <p className="showcase__collection-tagline">{current.tagline}</p>
            <p className="showcase__collection-desc">{current.description}</p>
          </div>

          {/* Color swatches with liquid morph */}
          <div className="showcase__swatches">
            {current.colors.map((color, i) => (
              <div
                key={`${current.id}-${i}`}
                ref={(el) => (swatchRefs.current[i] = el)}
                className="swatch"
                style={{
                  '--swatch-color': color.hex,
                  animationDelay: `${i * 0.15}s`,
                }}
                title={color.name}
              >
                <div className="swatch__fill" />
                <span className="swatch__name">{color.name}</span>
                <div className="swatch__ripple" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative line */}
      <div className="showcase__divider" aria-hidden="true" />
    </section>
  )
}
