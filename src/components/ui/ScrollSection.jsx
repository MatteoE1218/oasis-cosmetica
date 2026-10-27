import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './ScrollSection.css'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    id: 'feature-3d-view',
    icon: '💎',
    title: 'Vista 3D Interactiva',
    description:
      'Gira, amplía y explora cada producto desde cualquier ángulo antes de comprar.',
  },
  {
    id: 'feature-ar-try',
    icon: '✨',
    title: 'Prueba Virtual AR',
    description:
      'Usa realidad aumentada para probarte los productos directamente desde tu dispositivo.',
  },
  {
    id: 'feature-textures',
    icon: '🎨',
    title: 'Texturas Realistas',
    description:
      'Visualiza acabados mate, satinados y brillantes con iluminación físicamente precisa.',
  },
  {
    id: 'feature-palette',
    icon: '💄',
    title: 'Paletas Personalizadas',
    description:
      'Crea tu propia combinación de colores y visualízala en tiempo real en 3D.',
  },
]

export default function ScrollSection() {
  const sectionRef = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // Animate each card on scroll
      cardsRef.current.forEach((card, i) => {
        if (!card) return
        gsap.fromTo(
          card,
          {
            y: 80,
            opacity: 0,
            scale: 0.95,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              end: 'top 50%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="scroll-section section" id="coleccion">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Una experiencia <span className="text-gradient">sin precedentes</span>
          </h2>
          <p className="section-subtitle">
            Tecnología 3D de última generación aplicada a la industria de la
            belleza para una experiencia de compra completamente nueva.
          </p>
        </div>

        <div className="scroll-section__grid">
          {features.map((feature, i) => (
            <article
              key={feature.id}
              ref={(el) => (cardsRef.current[i] = el)}
              className="feature-card glass"
              id={feature.id}
            >
              <div className="feature-card__icon">{feature.icon}</div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__desc">{feature.description}</p>
              <div className="feature-card__shine" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
