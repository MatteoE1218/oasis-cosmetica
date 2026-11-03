import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCatalog } from '../../stores/CatalogContext'
import { useCartDispatch } from '../../stores/CartContext'
import useTiltEffect from '../../hooks/useTiltEffect'
import scrollState from '../../stores/scrollStore'
import './ProductCatalog.css'

gsap.registerPlugin(ScrollTrigger)

/* ── Product Detail Modal (Fotos, Descripción Completa, Tonos y Compra) ── */
function ProductDetailModal({ product, onClose, onGoToPacks }) {
  const dispatch = useCartDispatch()
  const [selectedShade, setSelectedShade] = useState(product?.defaultShade || 0)
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!product) return null

  const shades =
    Array.isArray(product.shades) && product.shades.length > 0
      ? product.shades
      : [{ name: 'Tono Único', hex: '#d4637a' }]
  const shade = shades[selectedShade] || shades[0]
  const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : 25
  const isOutOfStock = stock <= 0

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : []

  const currentImage = gallery[activeImgIdx] || gallery[0] || ''
  const unitPrice = Number(product.price || 0)

  const handlePrevImg = (e) => {
    e.stopPropagation()
    if (gallery.length <= 1) return
    setActiveImgIdx((prev) => (prev - 1 + gallery.length) % gallery.length)
  }

  const handleNextImg = (e) => {
    e.stopPropagation()
    if (gallery.length <= 1) return
    setActiveImgIdx((prev) => (prev + 1) % gallery.length)
  }

  const handleAddToCart = () => {
    if (isOutOfStock) return
    for (let i = 0; i < quantity; i++) {
      dispatch({
        type: 'ADD_ITEM',
        item: {
          id: product.id,
          name: product.name,
          price: unitPrice,
          shade: shade.name,
          shadeHex: shade.hex,
          icon: product.icon || '💄',
          image: currentImage,
        },
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div
      className="product-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${product.name}`}
    >
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="product-modal__close"
          onClick={onClose}
          aria-label="Cerrar detalle del producto"
        >
          ✕
        </button>

        <div className="product-modal__grid">
          {/* Columna Izquierda: Galería de Fotos del Producto */}
          <div className="product-modal__gallery">
            <div
              className="product-modal__main-visual"
              style={{ background: currentImage ? '#fdf8fa' : product.gradient }}
            >
              {product.badge && (
                <span className="product-modal__badge">{product.badge}</span>
              )}

              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`${product.name} - Vista ${activeImgIdx + 1}`}
                  className="product-modal__main-photo"
                />
              ) : (
                <span className="product-modal__fallback-icon">{product.icon || '💄'}</span>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-modal__nav-arrow product-modal__nav-arrow--prev"
                    onClick={handlePrevImg}
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="product-modal__nav-arrow product-modal__nav-arrow--next"
                    onClick={handleNextImg}
                    aria-label="Siguiente foto"
                  >
                    ›
                  </button>
                  <span className="product-modal__photo-counter">
                    Foto {activeImgIdx + 1} de {gallery.length}
                  </span>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="product-modal__thumbs">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`product-modal__thumb ${idx === activeImgIdx ? 'active' : ''}`}
                    onClick={() => setActiveImgIdx(idx)}
                    aria-label={`Ver miniatura ${idx + 1}`}
                  >
                    <img src={imgUrl} alt={`${product.name} miniatura ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información completa, tonos y compra */}
          <div className="product-modal__info">
            <div className="product-modal__meta">
              <span className="product-modal__category">{product.category}</span>
              <span
                className={`product-card__stock ${
                  isOutOfStock
                    ? 'product-card__stock--out'
                    : stock <= 5
                    ? 'product-card__stock--low'
                    : ''
                }`}
              >
                {isOutOfStock
                  ? 'Agotado'
                  : stock <= 5
                  ? `¡Solo ${stock} disponibles!`
                  : `${stock} disponibles en stock`}
              </span>
            </div>

            <h2 className="product-modal__title">{product.name}</h2>

            <div className="product-modal__price-row">
              <span className="product-modal__price">${unitPrice.toFixed(2)}</span>
              {product.tagline && product.tagline !== product.description && (
                <span className="product-modal__tagline-pill">{product.tagline}</span>
              )}
            </div>

            <div className="product-modal__desc-box">
              <h4 className="product-modal__section-label">Descripción y Detalles</h4>
              <p className="product-modal__description">
                {product.description || product.tagline || 'Cosmético de alta calidad Oasis Makeup con pigmentación duradera y acabado profesional.'}
              </p>
            </div>

            {/* Selector de Tonos */}
            <div className="product-modal__shades-box">
              <div className="product-modal__shades-header">
                <span className="product-modal__section-label">Tono Seleccionado:</span>
                <strong className="product-modal__shade-active-name">{shade.name}</strong>
              </div>
              <div className="product-modal__shades-list" role="radiogroup" aria-label="Seleccionar tono">
                {shades.map((s, i) => (
                  <button
                    key={`${s.name}-${i}`}
                    type="button"
                    className={`product-modal__shade-btn ${i === selectedShade ? 'active' : ''}`}
                    onClick={() => setSelectedShade(i)}
                    title={s.name}
                  >
                    <span className="product-modal__shade-swatch" style={{ backgroundColor: s.hex }} />
                    <span className="product-modal__shade-text">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad + Botón Añadir al Carrito */}
            <div className="product-modal__actions">
              {!isOutOfStock && (
                <div className="product-modal__qty" aria-label="Cantidad">
                  <button
                    type="button"
                    className="product-modal__qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="product-modal__qty-val">{quantity}</span>
                  <button
                    type="button"
                    className="product-modal__qty-btn"
                    onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                    disabled={quantity >= stock}
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`product-modal__add-btn ${added ? 'added' : ''} ${isOutOfStock ? 'disabled' : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? (
                  <span>Producto Agotado</span>
                ) : added ? (
                  <span>✓ ¡Añadido al Carrito!</span>
                ) : (
                  <span>
                    Añadir al Carrito • ${(unitPrice * quantity).toFixed(2)}
                  </span>
                )}
              </button>
            </div>

            {product.includeInPack !== false && (
              <button
                type="button"
                className="product-modal__pack-link"
                onClick={() => {
                  onClose()
                  onGoToPacks()
                }}
              >
                🎁 ¿Quieres regalarlo? Ármalo en un Pack Personalizado →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Individual Product Card ── */
function ProductCard({ product, onSelectProduct }) {
  const cardRef = useRef(null)
  const [selectedShade, setSelectedShade] = useState(product.defaultShade || 0)
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [added, setAdded] = useState(false)
  const dispatch = useCartDispatch()

  useTiltEffect(cardRef, { maxTilt: 8, scale: 1.02 })

  const shades = Array.isArray(product.shades) && product.shades.length > 0
    ? product.shades
    : [{ name: 'Tono Único', hex: '#d4637a' }]
  const shade = shades[selectedShade] || shades[0]
  const stock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : 25
  const isOutOfStock = stock <= 0

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : []

  const currentImage = gallery[activeImgIdx] || gallery[0] || ''

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (isOutOfStock) return
    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        shade: shade.name,
        shadeHex: shade.hex,
        icon: product.icon || '💄',
        image: currentImage,
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article
      ref={cardRef}
      className="product-card product-card--clickable glass"
      id={`product-${product.id}`}
      onClick={() => onSelectProduct(product)}
    >
      {/* Tilt glare overlay */}
      <div className="tilt-glare" aria-hidden="true" />

      {/* Badge */}
      {product.badge && (
        <span className="product-card__badge">{product.badge}</span>
      )}

      {/* Product visual — Foto Real o Contenedor Editorial */}
      <div
        className={`product-card__visual ${currentImage ? 'product-card__visual--photo' : ''}`}
        style={{ background: product.gradient }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
            className="product-card__photo"
            loading="lazy"
          />
        ) : (
          <span className="product-card__icon">{product.icon}</span>
        )}
        <div className="product-card__shine" aria-hidden="true" />

        <span className="product-card__view-hint">
          🔍 Ver fotos y detalle{gallery.length > 1 ? ` (${gallery.length})` : ''}
        </span>

        {gallery.length > 1 && (
          <div className="product-card__dots" onClick={(e) => e.stopPropagation()}>
            {gallery.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`product-card__dot ${idx === activeImgIdx ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImgIdx(idx)
                }}
                aria-label={`Ver foto ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__category">{product.category}</span>
          <span
            className={`product-card__stock ${
              isOutOfStock
                ? 'product-card__stock--out'
                : stock <= 5
                ? 'product-card__stock--low'
                : ''
            }`}
          >
            {isOutOfStock
              ? 'Agotado'
              : stock <= 5
              ? `¡Solo ${stock} disp.!`
              : `${stock} disponibles`}
          </span>
        </div>

        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__tagline">
          {product.description || product.tagline}
        </p>

        {/* Shade selector */}
        <div className="product-card__shades-wrapper" onClick={(e) => e.stopPropagation()}>
          <span className="product-card__shade-name">Tono: {shade.name}</span>
          <div className="product-card__shades" role="radiogroup" aria-label="Seleccionar tono">
            {shades.map((s, i) => (
              <button
                key={`${s.name}-${i}`}
                type="button"
                className={`product-card__shade ${i === selectedShade ? 'product-card__shade--active' : ''}`}
                style={{ '--shade': s.hex }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedShade(i)
                }}
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
            <span className="product-card__price">${Number(product.price).toFixed(2)}</span>
          </div>

          <div className="product-card__footer-btns">
            <button
              type="button"
              className="product-card__detail-btn"
              onClick={(e) => {
                e.stopPropagation()
                onSelectProduct(product)
              }}
            >
              Ver Detalle
            </button>
            <button
              type="button"
              className={`product-card__add-btn ${added ? 'product-card__add-btn--added' : ''} ${
                isOutOfStock ? 'product-card__add-btn--disabled' : ''
              }`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              aria-label={`Añadir ${product.name} en tono ${shade.name} al carrito`}
              id={`add-to-cart-${product.id}`}
            >
              {isOutOfStock ? (
                <span>Agotado</span>
              ) : added ? (
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
      </div>
    </article>
  )
}

/* ── Product Catalog Section (Dedicated Page View) ── */
export default function ProductCatalog() {
  const sectionRef = useRef(null)
  const cardsContainerRef = useRef(null)
  const { products, categories, navigateToPage } = useCatalog()
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          scrollState.catalog.progress = self.progress
        },
      })

      gsap.fromTo(
        '.catalog__title',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategory === 'Todos' || p.category === activeCategory
    const q = searchQuery.trim().toLowerCase()
    if (!q) return matchesCat
    const matchesText =
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    return matchesCat && matchesText
  })

  return (
    <section ref={sectionRef} className="catalog catalog--page section" id="catalogo">
      <div className="container">
        {/* Barra superior de navegación rápida */}
        <div className="page-top-bar">
          <button
            type="button"
            className="page-top-bar__back"
            onClick={() => navigateToPage('home')}
          >
            ← Volver a Inicio
          </button>
          <button
            type="button"
            className="page-top-bar__pack-cta"
            onClick={() => navigateToPage('packs')}
          >
            🎁 Ir a Arma tu Pack →
          </button>
        </div>

        <div className="section-header">
          <p className="catalog__label">Catálogo Completo Oasis Makeup</p>
          <h2 className="catalog__title section-title">
            Explora Nuestra <span className="text-gradient">Colección</span>
          </h2>
          <p className="section-subtitle">
            Filtra por categoría o haz clic en cualquier producto para ver todas sus fotos, tonos disponibles y descripción detallada.
          </p>
        </div>

        {/* Buscador + Filtros de Categoría */}
        <div className="catalog__controls">
          <div className="catalog__search-wrap">
            <span className="catalog__search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="catalog__search-input"
              placeholder="Buscar producto por nombre, marca o acabado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar en el catálogo"
            />
            {searchQuery && (
              <button
                type="button"
                className="catalog__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

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
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="catalog__empty glass">
            <p>No encontramos productos que coincidan con tu filtro.</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setActiveCategory('Todos')
                setSearchQuery('')
              }}
            >
              Ver Todos los Productos
            </button>
          </div>
        ) : (
          <div ref={cardsContainerRef} className="catalog__grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalle del Producto */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onGoToPacks={() => navigateToPage('packs')}
        />
      )}
    </section>
  )
}
