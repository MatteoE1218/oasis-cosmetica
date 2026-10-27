import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCartDispatch } from '../../stores/CartContext'
import ProductViewer3D from '../3d/ProductViewer3D'
import './LipstickSection.css'

gsap.registerPlugin(ScrollTrigger)

const shades = [
  { name: 'Carmesí Imperial 01', hex: '#C52844', mood: 'Rojo Icono', finish: 'Satén Lujoso' },
  { name: 'Borgoña Nocturno 02', hex: '#6B1D3A', mood: 'Intenso Nocturno', finish: 'Terciopelo Mate' },
  { name: 'Coral Radiante 03', hex: '#E06050', mood: 'Brillo Solar', finish: 'Cremoso Radiante' },
  { name: 'Rosa Seda Natural 04', hex: '#D4956B', mood: 'Elegancia Natural', finish: 'Seda Pura' },
  { name: 'Baya Estrella 05', hex: '#8B2252', mood: 'Baya Noble', finish: 'Satén Profundo' },
]

/**
 * Sección 2 — Pintalabios / Rouge Éternel
 * Features in-section 3D showcase that smoothly slides in from the right on scroll.
 */
export default function LipstickSection() {
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const viewerRef = useRef(null)
  const [selectedShade, setSelectedShade] = useState(0)
  const [addedAnimation, setAddedAnimation] = useState(false)
  const dispatch = useCartDispatch()

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // Editorial text slides in from the left
      gsap.fromTo(
        contentRef.current,
        { x: -70, opacity: 0 },
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

      // 3D product showcase slides in smoothly from the right and stays static
      gsap.fromTo(
        viewerRef.current,
        { x: 100, opacity: 0 },
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

      // Feature pills staggered entrance
      gsap.fromTo(
        '.lipstick-pill',
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.lipstick-features',
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
        id: 1,
        name: 'Labial Eterno',
        price: 42.0,
        shade: shades[selectedShade].name,
        shadeHex: shades[selectedShade].hex,
        icon: '💄',
      },
    })
    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 1200)
    dispatch({ type: 'SET_PANEL', isOpen: true })
  }

  const active = shades[selectedShade]

  return (
    <section ref={sectionRef} className="lipstick-section section" id="lipstick">
      <div className="container lipstick-grid">
        {/* Left Column: Editorial Information */}
        <div ref={contentRef} className="lipstick-content">
          <div className="lipstick-tag">
            <span className="lipstick-tag__dot" />
            <span>Colección Exclusiva • Satén Terciopelo</span>
          </div>

          <h2 className="lipstick-title">
            Labial Eterno <br />
            <span className="text-gradient">Intensidad & Confort Supremo</span>
          </h2>

          <p className="lipstick-desc">
            Formulado con aceites nutritivos y pigmentos puros de alta saturación. 
            Su punta biselada se desliza con suavidad sobre los labios, vistiendo 
            tu sonrisa con un color vibrante, aterciopelado y de larga duración.
          </p>

          {/* Feature Pills */}
          <div className="lipstick-features">
            <div className="lipstick-pill glass">
              <span className="lipstick-pill__icon">✨</span>
              <div className="lipstick-pill__text">
                <strong>16H</strong>
                <p>Duración sin retoque</p>
              </div>
            </div>
            <div className="lipstick-pill glass">
              <span className="lipstick-pill__icon">🌸</span>
              <div className="lipstick-pill__text">
                <strong>Nutrición</strong>
                <p>Cuidado e hidratación</p>
              </div>
            </div>
            <div className="lipstick-pill glass">
              <span className="lipstick-pill__icon">💋</span>
              <div className="lipstick-pill__text">
                <strong>Sin Transferencia</strong>
                <p>Velo aterciopelado</p>
              </div>
            </div>
          </div>

          {/* Shade selector with live 3D feedback */}
          <div className="lipstick-shades">
            <div className="lipstick-shades__header">
              <span className="lipstick-shades__label">Tono seleccionado:</span>
              <span className="lipstick-shades__active-name">
                {active.name} <span className="lipstick-shades__finish">• {active.finish}</span>
              </span>
            </div>
            <div className="lipstick-shades__list" role="radiogroup" aria-label="Tonos de labial">
              {shades.map((shade, i) => (
                <button
                  key={shade.name}
                  role="radio"
                  aria-checked={selectedShade === i}
                  className={`lipstick-shade-btn ${selectedShade === i ? 'lipstick-shade-btn--active' : ''}`}
                  style={{ backgroundColor: shade.hex }}
                  onClick={() => handleSelectShade(i)}
                  title={`${shade.name} — ${shade.mood}`}
                >
                  <span className="lipstick-shade-btn__glow" style={{ backgroundColor: shade.hex }} />
                </button>
              ))}
            </div>
            <span className="lipstick-shades__hint">✦ El acabado adopta el tono seleccionado en tiempo real</span>
          </div>

          {/* Actions */}
          <div className="lipstick-actions">
            <button
              className={`btn btn-primary ${addedAnimation ? 'btn-added' : ''}`}
              onClick={handleAddToCart}
              id="lipstick-add-btn"
            >
              <span>{addedAnimation ? '✓ ¡Añadido!' : 'Añadir al Carrito'}</span>
              <span className="lipstick-btn-price">• €42.00</span>
            </button>
            <a href="#base-fluida" className="btn btn-outline">
              Siguiente: Sérum Resplandor
            </a>
          </div>
        </div>

        {/* Right Column: 3D Product Showcase (Slides in from the right) */}
        <div ref={viewerRef} className="lipstick-3d-wrapper">
          <ProductViewer3D
            type="lipstick"
            color={active.hex}
            badgeText="Labial Eterno • Vista en Vivo"
          />
        </div>
      </div>
    </section>
  )
}


