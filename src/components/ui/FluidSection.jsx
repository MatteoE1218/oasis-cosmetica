import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCartDispatch } from '../../stores/CartContext'
import ProductViewer3D from '../3d/ProductViewer3D'
import './FluidSection.css'

gsap.registerPlugin(ScrollTrigger)

const shades = [
  { name: 'Porcelana Cristal 01', hex: '#f5e6d3', undertone: 'Neutro Frío' },
  { name: 'Marfil Radiante 02', hex: '#e8d5b7', undertone: 'Dorado Suave' },
  { name: 'Arena Cálida 03', hex: '#d4b896', undertone: 'Neutro Cálido' },
  { name: 'Caramelo Ámbar 04', hex: '#c49a6c', undertone: 'Dorado Intenso' },
  { name: 'Espresso Ébano 05', hex: '#6b4226', undertone: 'Cálido Profundo' },
]

/**
 * Sección 3 — Base Líquida / Sérum Éclat
 * Features in-section 3D showcase that smoothly slides in from the left on scroll.
 */
export default function FluidSection() {
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const viewerRef = useRef(null)
  const [selectedShade, setSelectedShade] = useState(0)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const dispatch = useCartDispatch()

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // 3D product showcase slides in smoothly from the left and stays static
      gsap.fromTo(
        viewerRef.current,
        { x: -100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Editorial text slides in from the right
      gsap.fromTo(
        contentRef.current,
        { x: 70, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Feature pills staggered entrance
      gsap.fromTo(
        '.fluid-pill',
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.fluid-features',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const handleSelectShade = (index) => {
    setSelectedShade(index)
  }

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: 3,
        name: 'Sérum Resplandor',
        price: 56.0,
        shade: shades[selectedShade].name,
        shadeHex: shades[selectedShade].hex,
        icon: '✨',
      },
    })
    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 1200)
    dispatch({ type: 'SET_PANEL', isOpen: true })
  }

  const active = shades[selectedShade]

  return (
    <section ref={sectionRef} className="fluid-section section" id="base-fluida">
      <div className="container fluid-grid fluid-grid--reversed">
        {/* Left Column: 3D Product Showcase (Slides in from the left) */}
        <div ref={viewerRef} className="fluid-3d-wrapper">
          <ProductViewer3D
            type="serum"
            color={active.hex}
            badgeText="Sérum Resplandor • Cristal 3D"
          />
        </div>

        {/* Right Column: Editorial Text */}
        <div ref={contentRef} className="fluid-content">
          <div className="fluid-tag">
            <span className="fluid-tag__dot" />
            <span>Innovación en Tez • Cobertura Cristalina Luminosa</span>
          </div>

          <h2 className="fluid-title">
            Sérum Resplandor <br />
            <span className="text-gradient">Fluidez, Luz & Piel de Seda</span>
          </h2>

          <p className="fluid-desc">
            Una base sérum de alta gama enriquecida con micro-gotas de ácido hialurónico 
            vectorizado y perlas foto-reflectoras. Al posarse sobre la piel, crea un velo 
            ingrávido e imperceptible que refracta la luz con acabado radiante de pasarela.
          </p>

          {/* Feature Pills */}
          <div className="fluid-features">
            <div className="fluid-pill glass">
              <span className="fluid-pill__icon">💧</span>
              <div className="fluid-pill__text">
                <strong>+48H</strong>
                <p>Hidratación botánica</p>
              </div>
            </div>
            <div className="fluid-pill glass">
              <span className="fluid-pill__icon">✨</span>
              <div className="fluid-pill__text">
                <strong>Piel de Cristal</strong>
                <p>Efecto filtro óptico</p>
              </div>
            </div>
            <div className="fluid-pill glass">
              <span className="fluid-pill__icon">🛡️</span>
              <div className="fluid-pill__text">
                <strong>FPS 35</strong>
                <p>Escudo antioxidante</p>
              </div>
            </div>
          </div>

          {/* Tone selector with live 3D feedback */}
          <div className="fluid-shades">
            <div className="fluid-shades__header">
              <span className="fluid-shades__label">Tono seleccionado:</span>
              <span className="fluid-shades__active-name">
                {active.name} <span className="fluid-shades__sub">• {active.undertone}</span>
              </span>
            </div>
            <div className="fluid-shades__list" role="radiogroup" aria-label="Tonos de base fluida">
              {shades.map((shade, i) => (
                <button
                  key={shade.name}
                  role="radio"
                  aria-checked={selectedShade === i}
                  className={`fluid-shade-btn ${selectedShade === i ? 'fluid-shade-btn--active' : ''}`}
                  style={{ backgroundColor: shade.hex }}
                  onClick={() => handleSelectShade(i)}
                  title={`${shade.name} (${shade.undertone})`}
                >
                  <span className="fluid-shade-btn__glow" style={{ backgroundColor: shade.hex }} />
                </button>
              ))}
            </div>
            <span className="fluid-shades__hint">✦ El fluido dentro del frasco 3D se transforma en vivo</span>
          </div>

          {/* Actions */}
          <div className="fluid-actions">
            <button
              className={`btn btn-primary ${addedAnimation ? 'btn-added' : ''}`}
              onClick={handleAddToCart}
              id="fluid-add-btn"
            >
              <span>{addedAnimation ? '✓ ¡Añadido!' : 'Añadir al Carrito'}</span>
              <span className="fluid-btn-price">• €56.00</span>
            </button>
            <a href="#compacto" className="btn btn-outline">
              Siguiente: Polvo Resplandor
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}


