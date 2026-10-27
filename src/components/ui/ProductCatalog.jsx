import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { products } from '../../data/products'
import { useCartDispatch } from '../../stores/CartContext'
import useTiltEffect from '../../hooks/useTiltEffect'
import scrollState from '../../stores/scrollStore'
import './ProductCatalog.css'

gsap.registerPlugin(ScrollTrigger)

const categories = ['Todos', 'Labiales', 'Base', 'Sombras', 'Rubor', 'Máscara']

/* ── Individual Product Card ── */
function ProductCard({ product }) {
  const cardRef = useRef(null)
  const [selectedShade, setSelectedShade] = useState(product.defaultShade || 0)
  const [added, setAdded] = useState(false)
  const dispatch = useCartDispatch()

  useTiltEffect(cardRef, { maxTilt: 8, scale: 1.02 })

  const shade = product.shades[selectedShade] || product.shades[0]

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: product.id,
        name: product.name,
        price: product.price,
        shade: shade.name,
        shadeHex: shade.hex,
        icon: product.icon,
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article ref={cardRef} className="product-card glass" id={`product-${product.id}`}>
      {/* Tilt glare overlay */}
      <div className="tilt-glare" aria-hidden="true" />

      {/* Badge */}
      {product.badge && (
        <span className="product-card__badge">{product.badge}</span>
      )}

      {/* Product visual — Editorial CSS Art Container */}
      <div
        className="product-card__visual"
        style={{ background: product.gradient }}
      >
        <span className="product-card__icon">{product.icon}</span>
        <div className="product-card__shine" aria-hidden="true" />
      </div>

      {/* Info */}
      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__category">{product.category}</span>
          <span className="product-card__rating">★ 4.9</span>
        </div>

        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__tagline">{product.tagline}</p>

        {/* Shade selector */}
        <div className="product-card__shades-wrapper">
          <span className="product-card__shade-name">{shade.name}</span>
          <div className="product-card__shades" role="radiogroup" aria-label="Seleccionar tono">
            {product.shades.map((s, i) => (
              <button
                key={s.name}
                className={`product-card__shade ${i === selectedShade ? 'product-card__shade--active' : ''}`}
                style={{ '--shade': s.hex }}
                onClick={() => setSelectedShade(i)}
                aria-label={s.name}
                aria-checked={i === selectedShade}
                role="radio"
                title={s.name}
              />
            ))}
          </div>
        </div>

        <div className="product-card__footer">
          <div className="product-card__price-box">
            <span className="product-card__price-label">Precio</span>
            <span className="product-card__price">€{product.price.toFixed(2)}</span>
          </div>

          <button
            className={`product-card__add-btn ${added ? 'product-card__add-btn--added' : ''}`}
            onClick={handleAddToCart}
            aria-label={`Añadir ${product.name} en tono ${shade.name} al carrito`}
            id={`add-to-cart-${product.id}`}
          >
            {added ? (
              <span>✓ Añadido</span>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Añadir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

/* ── Product Catalog Section ── */
export default function ProductCatalog() {
  const sectionRef = useRef(null)
  const cardsContainerRef = useRef(null)
  const [activeCategory, setActiveCategory] = useState('Todos')

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
          scrollState.catalog.progress = self.progress
        },
      })

      // Title reveal
      gsap.fromTo(
        '.catalog__title',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Cards stagger entrance
      gsap.fromTo(
        '.product-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsContainerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter((p) => p.category === activeCategory)

  return (
    <section ref={sectionRef} className="catalog section" id="catalogo">
      <div className="container">
        <div className="section-header">
          <p className="catalog__label">Colección de Maquillaje Exclusivo</p>
          <h2 className="catalog__title section-title">
            Fórmulas de <span className="text-gradient">Excelencia</span>
          </h2>
          <p className="section-subtitle">
            Ingredientes botánicos puros, pigmentos de estudio y texturas diseñadas 
            para sublimar cada rasgo con luz natural y confort inalterable.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="catalog__filters" role="tablist" aria-label="Filtrar por categoría">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`catalog__filter-btn ${activeCategory === cat ? 'catalog__filter-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div ref={cardsContainerRef} className="catalog__grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

