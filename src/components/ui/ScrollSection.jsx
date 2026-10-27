import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './ScrollSection.css'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    id: 'feature-packs',
    icon: '🎁',
    title: 'Cajas & Packs de Regalo',
    description:
      'Elige tus cosméticos favoritos y crea un pack único con caja de lujo y lazo de satén.',
  },
  {
    id: 'feature-message',
    icon: '💌',
    title: 'Mensaje Personalizado',
    description:
      'Incluye una dedicatoria especial impresa en tarjeta artesanal para sorprender a quien más quieres.',
  },
  {
    id: 'feature-botanical',
    icon: '🌸',
    title: 'Fórmulas Veganas & Puras',
    description:
      'Maquillaje de alta duración con extractos botánicos que hidratan y respetan tu piel sin crueldad animal.',
  },
  {
    id: 'feature-whatsapp',
    icon: '💬',
    title: 'Atención por WhatsApp',
    description:
      '¿Dudas con tu tono ideal? Escríbenos y te asesoramos de forma personalizada para tu pedido.',
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
            Creado para <span className="text-gradient">sorprender y cuidar</span>
          </h2>
          <p className="section-subtitle">
            Un emprendimiento de maquillaje donde cada producto y detalle de empaque se prepara 
            con dedicación, listo para consentirte o hacer el regalo ideal.
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
