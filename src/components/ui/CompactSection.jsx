import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCartDispatch } from '../../stores/CartContext'
import ProductViewer3D from '../3d/ProductViewer3D'
import './CompactSection.css'

gsap.registerPlugin(ScrollTrigger)

const shades = [
  { name: 'Seda Rosa 01', hex: '#E8B0BA', benefit: 'Aporta luminosidad rosada inmediata' },
  { name: 'Seda Natural 02', hex: '#D8BA9E', benefit: 'Unifica y difumina poros' },
  { name: 'Bronce Terracota 03', hex: '#C48E72', benefit: 'Esculpe con calidez dorada' },
  { name: 'Perla Estelar 04', hex: '#FFF4E6', benefit: 'Reflejos estroboscópicos micro-perla' },
]

/**
 * Sección 4 — Polvos Compactos / Poudre Éclat
 * Features in-section 3D showcase that smoothly slides in from the right on scroll.
 */
export default function CompactSection() {
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

      // Pills stagger
      gsap.fromTo(
        '.compact-pill',
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.compact-features',
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
        id: 2,
        name: 'Polvo Resplandor',
        price: 68.0,
        shade: shades[selectedShade].name,
        shadeHex: shades[selectedShade].hex,
        icon: '🎨',
      },
    })
    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 1200)
    dispatch({ type: 'SET_PANEL', isOpen: true })
  }

  const active = shades[selectedShade]

  return (
    <section ref={sectionRef} className="compact-section section" id="compacto">
      <div className="container compact-grid">
        {/* Left Column: Editorial Information */}
        <div ref={contentRef} className="compact-content">
          <div className="compact-tag">
            <span className="compact-tag__dot" />
            <span>Edición Limitada • Laca Blanca & Espejo de Alta Definición</span>
          </div>

          <h2 className="compact-title">
            Polvo Resplandor <br />
            <span className="text-gradient">Seda & Velo Perfeccionador</span>
          </h2>

          <p className="compact-desc">
            Polvos micro-aireados con tecnología difusora de luz. Enriquecidos con 
            extracto de perlas naturales de río, unifican la tez al instante y matifican 
            con suavidad aterciopelada, manteniendo la frescura y vitalidad orgánica del rostro.
          </p>

          {/* Feature Pills */}
          <div className="compact-features">
            <div className="compact-pill glass">
              <span className="compact-pill__icon">🪞</span>
              <div className="compact-pill__text">
                <strong>Espejo HD</strong>
                <p>Estuche joya recargable</p>
              </div>
            </div>
            <div className="compact-pill glass">
              <span className="compact-pill__icon">🪶</span>
              <div className="compact-pill__text">
                <strong>Micro-Sedoso</strong>
                <p>Cero efecto máscara</p>
              </div>
            </div>
            <div className="compact-pill glass">
              <span className="compact-pill__icon">💫</span>
              <div className="compact-pill__text">
                <strong>Luz Difusa</strong>
                <p>Acabado aterciopelado</p>
              </div>
            </div>
          </div>

          {/* Shade selector */}
          <div className="compact-shades">
            <div className="compact-shades__header">
              <span className="compact-shades__label">Acabado y matiz:</span>
              <span className="compact-shades__active-name">
                {active.name} <span className="compact-shades__sub">• {active.benefit}</span>
              </span>
            </div>
            <div className="compact-shades__list" role="radiogroup" aria-label="Tonos de polvo compacto">
              {shades.map((shade, i) => (
                <button
                  key={shade.name}
                  role="radio"
                  aria-checked={selectedShade === i}
                  className={`compact-shade-btn ${selectedShade === i ? 'compact-shade-btn--active' : ''}`}
                  style={{ backgroundColor: shade.hex }}
                  onClick={() => handleSelectShade(i)}
                  title={`${shade.name} — ${shade.benefit}`}
                >
                  <span className="compact-shade-btn__glow" style={{ backgroundColor: shade.hex }} />
                </button>
              ))}
            </div>
            <span className="compact-shades__hint">✦ Estuche joya con espejo interior exhibido en 3D</span>
          </div>

          {/* Actions */}
          <div className="compact-actions">
            <button
              className={`btn btn-primary ${addedAnimation ? 'btn-added' : ''}`}
              onClick={handleAddToCart}
              id="compact-add-btn"
            >
              <span>{addedAnimation ? '✓ ¡Añadido!' : 'Añadir al Carrito'}</span>
              <span className="compact-btn-price">• €68.00</span>
            </button>
            <a href="#colecciones" className="btn btn-outline">
              Siguiente: Galería de Texturas
            </a>
          </div>
        </div>

        {/* Right Column: 3D Product Showcase (Slides in from the right) */}
        <div ref={viewerRef} className="compact-3d-wrapper">
          <ProductViewer3D
            type="compact"
            activeShadeIndex={selectedShade}
            badgeText="Polvo Resplandor • Estuche Joya 3D"
          />
        </div>
      </div>
    </section>
  )
}


