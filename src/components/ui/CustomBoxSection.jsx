import { useState, useRef, useEffect, useMemo } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCartDispatch } from '../../stores/CartContext'
import { useCatalog, DEFAULT_PACK_TYPES } from '../../stores/CatalogContext'
import './CustomBoxSection.css'

gsap.registerPlugin(ScrollTrigger)

export default function CustomBoxSection() {
  const sectionRef = useRef(null)
  const { products, packTypes, navigateToPage } = useCatalog()

  const activePackTypes =
    Array.isArray(packTypes) && packTypes.length > 0 ? packTypes : DEFAULT_PACK_TYPES

  const selectableItems = useMemo(() => {
    const fromCatalog = products
      .filter((p) => p.includeInPack !== false && (p.stock === undefined || p.stock > 0))
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        icon: p.icon || '💄',
      }))
    return fromCatalog.length > 0
      ? fromCatalog
      : [{ id: 1, name: 'Labial Eterno', price: 42.0, icon: '💄' }]
  }, [products])

  const [selectedBoxId, setSelectedBoxId] = useState(activePackTypes[0]?.id)
  const selectedBox =
    activePackTypes.find((b) => String(b.id) === String(selectedBoxId)) || activePackTypes[0]

  const maxAllowed = Math.max(1, Number(selectedBox?.maxItems ?? 3))

  const [selectedProducts, setSelectedProducts] = useState(() =>
    selectableItems.slice(0, Math.min(2, maxAllowed)).map((i) => i.id)
  )
  const [recipient, setRecipient] = useState('')
  const [sender, setSender] = useState('')
  const [message, setMessage] = useState('Que cada día brille con la luz y belleza que llevas dentro.')
  const [added, setAdded] = useState(false)
  const [limitNotice, setLimitNotice] = useState('')
  const dispatch = useCartDispatch()

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.custom-box__title',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
        }
      )

      gsap.fromTo(
        '.custom-box__grid > *',
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.7,
          ease: 'power3.out',
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const handleSelectBox = (box) => {
    setSelectedBoxId(box.id)
    setLimitNotice('')
    const newMax = Math.max(1, Number(box.maxItems ?? 3))
    if (selectedProducts.length > newMax) {
      setSelectedProducts((prev) => prev.slice(0, newMax))
    }
  }

  const toggleProduct = (id) => {
    setLimitNotice('')
    if (selectedProducts.includes(id)) {
      if (selectedProducts.length === 1) return // al menos 1 producto
      setSelectedProducts(selectedProducts.filter((p) => p !== id))
    } else {
      if (selectedProducts.length >= maxAllowed) {
        setLimitNotice(`Este pack incluye hasta ${maxAllowed} producto(s). Desmarca uno para cambiarlo o elige un pack más grande.`)
        return
      }
      setSelectedProducts([...selectedProducts, id])
    }
  }

  const calculateTotal = () => {
    if (Number(selectedBox?.fixedPrice) > 0) {
      return Number(selectedBox.fixedPrice)
    }
    const productsSum = selectedProducts.reduce((acc, id) => {
      const p = selectableItems.find((item) => item.id === id)
      return acc + (p ? p.price : 0)
    }, 0)
    return productsSum + Number(selectedBox?.extraPrice || 0)
  }

  const handleAddPackToCart = () => {
    const total = calculateTotal()
    const productNames = selectedProducts
      .map((id) => selectableItems.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(', ')

    const cleanRecipient = recipient.trim() || 'Alguien Especial'
    const cleanSender = sender.trim()

    dispatch({
      type: 'ADD_ITEM',
      item: {
        id: `pack-${Date.now()}`,
        name: `Pack de Regalo (${selectedBox.name})`,
        price: total,
        shade: `${selectedProducts.length} cosméticos • Para: ${cleanRecipient}${cleanSender ? ` | De: ${cleanSender}` : ''}`,
        shadeHex: selectedBox.borderColor || '#FF3399',
        icon: '🎁',
        isPack: true,
        boxName: selectedBox.name,
        recipient: cleanRecipient,
        sender: cleanSender,
        customMessage: message.trim(),
        itemsIncluded: productNames,
      },
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
    dispatch({ type: 'SET_PANEL', isOpen: true })
  }

  return (
    <section ref={sectionRef} className="custom-box custom-box--page section" id="packs">
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
            onClick={() => navigateToPage('catalog')}
          >
            🛍️ Ver Catálogo Completo →
          </button>
        </div>

        {/* Encabezado editorial */}
        <div className="section-header text-center">
          <div className="custom-box__tag">
            <span className="custom-box__tag-dot" />
            <span>Detalles que Enamoran</span>
          </div>
          <h2 className="custom-box__title section-title">
            Arma tu Pack de Regalo <br />
            <span className="text-gradient">con Mensaje Personalizado</span>
          </h2>
          <p className="section-subtitle">
            Crea una experiencia inolvidable. Elige el tipo de pack o combo, selecciona tus cosméticos favoritos y nosotros incluiremos una tarjeta artesanal con tu dedicatoria personalizada.
          </p>
        </div>

        {/* Grid de 2 columnas: Configuración y Vista previa */}
        <div className="custom-box__grid">
          {/* Columna Izquierda: Configuración del Pack */}
          <div className="custom-box__config glass">
            {/* Paso 1: Estilo de Caja / Tipo de Pack */}
            <div className="custom-box__step">
              <div className="custom-box__step-header">
                <span className="custom-box__step-num">1</span>
                <div>
                  <h3 className="custom-box__step-title">Elige tu tipo de Pack o Combo</h3>
                  <p className="custom-box__step-sub">Cada pack indica su precio y cuántos productos incluye</p>
                </div>
              </div>

              <div className="custom-box__options">
                {activePackTypes.map((box) => {
                  const isFixed = Number(box.fixedPrice) > 0
                  const maxItemsNum = Math.max(1, Number(box.maxItems ?? 3))
                  return (
                    <button
                      key={box.id}
                      className={`custom-box__option-btn ${selectedBox.id === box.id ? 'custom-box__option-btn--active' : ''}`}
                      onClick={() => handleSelectBox(box)}
                      type="button"
                    >
                      <span
                        className="custom-box__color-sample"
                        style={{ backgroundColor: box.color || '#FFE3EC', borderColor: box.borderColor || '#FF3399' }}
                      />
                      <div className="custom-box__option-info">
                        <strong>{box.name}</strong>
                        <span>
                          {isFixed
                            ? `Combo $${Number(box.fixedPrice).toFixed(2)}`
                            : `+$${Number(box.extraPrice || 0).toFixed(2)}`}{' '}
                          • Hasta {maxItemsNum} prod.
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Paso 2: Productos a incluir */}
            <div className="custom-box__step">
              <div className="custom-box__step-header">
                <span className="custom-box__step-num">2</span>
                <div>
                  <h3 className="custom-box__step-title">
                    Selecciona los cosméticos ({selectedProducts.length} de {maxAllowed})
                  </h3>
                  <p className="custom-box__step-sub">
                    Tu <strong>{selectedBox.name}</strong> permite elegir hasta <strong>{maxAllowed} producto(s)</strong>
                  </p>
                </div>
              </div>

              {limitNotice && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#d91e75',
                    background: '#fff0f6',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  ✦ {limitNotice}
                </p>
              )}

              <div className="custom-box__items-list">
                {selectableItems.map((item) => {
                  const isChecked = selectedProducts.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className={`custom-box__item-label ${isChecked ? 'custom-box__item-label--checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleProduct(item.id)}
                        className="custom-box__checkbox"
                      />
                      <span className="custom-box__item-icon">{item.icon}</span>
                      <span className="custom-box__item-name">{item.name}</span>
                      <span className="custom-box__item-price">
                        {Number(selectedBox.fixedPrice) > 0 ? 'Incluido' : `$${item.price.toFixed(2)}`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Paso 3: Mensaje Personalizado */}
            <div className="custom-box__step">
              <div className="custom-box__step-header">
                <span className="custom-box__step-num">3</span>
                <div>
                  <h3 className="custom-box__step-title">Escribe tu dedicatoria especial</h3>
                  <p className="custom-box__step-sub">Se imprimirá en una tarjeta de regalo</p>
                </div>
              </div>

              <div className="custom-box__inputs">
                <div className="custom-box__input-row">
                  <div className="custom-box__field">
                    <label htmlFor="card-recipient">Para (Destinataria/o):</label>
                    <input
                      id="card-recipient"
                      type="text"
                      placeholder="Ej. Sofía"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      maxLength={35}
                    />
                  </div>
                  <div className="custom-box__field">
                    <label htmlFor="card-sender">De parte de:</label>
                    <input
                      id="card-sender"
                      type="text"
                      placeholder="Ej. Con amor, Mateo"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      maxLength={35}
                    />
                  </div>
                </div>

                <div className="custom-box__field">
                  <label htmlFor="card-message">Mensaje especial:</label>
                  <textarea
                    id="card-message"
                    rows="3"
                    placeholder="Escribe tu dedicatoria..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={160}
                  />
                  <span className="custom-box__char-count">{message.length}/160 caracteres</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo de la Tarjeta y el Pack */}
          <div className="custom-box__preview-column">
            <div className="custom-box__card-preview">
              <div className="custom-box__card-ribbon">◆ OASIS REGALOS ◆</div>

              <div className="custom-box__card-inner">
                <p className="custom-box__preview-to">
                  Para: <span>{recipient || 'Alguien Muy Especial'}</span>
                </p>

                <p className="custom-box__preview-text">
                  “{message || 'Escribe tu dedicatoria...'}”
                </p>

                <p className="custom-box__preview-from">
                  {sender || 'Con todo mi cariño'}
                </p>
              </div>

              <div className="custom-box__preview-seal">
                <span>Tarjeta con acabado mate & sobre perfumado</span>
              </div>
            </div>

            {/* Resumen del Pack */}
            <div className="custom-box__summary glass">
              <div className="custom-box__summary-header">
                <h4>Resumen de tu Pack</h4>
                <span className="custom-box__summary-badge">
                  {selectedBox.name} ({selectedProducts.length}/{maxAllowed} prod.)
                </span>
              </div>

              <ul className="custom-box__summary-list">
                {Number(selectedBox.fixedPrice) > 0 ? (
                  <li>
                    <span>Precio del Combo ({selectedBox.name})</span>
                    <span>${Number(selectedBox.fixedPrice).toFixed(2)}</span>
                  </li>
                ) : (
                  <li>
                    <span>Empaque de regalo ({selectedBox.name})</span>
                    <span>${Number(selectedBox.extraPrice || 0).toFixed(2)}</span>
                  </li>
                )}
                {selectedProducts.map((id) => {
                  const p = selectableItems.find((item) => item.id === id)
                  return (
                    <li key={id}>
                      <span>{p?.name}</span>
                      <span>
                        {Number(selectedBox.fixedPrice) > 0
                          ? 'Incluido'
                          : `$${(p?.price || 0).toFixed(2)}`}
                      </span>
                    </li>
                  )
                })}
                <li className="custom-box__summary-free">
                  <span>Tarjeta con mensaje personalizado</span>
                  <span className="custom-box__free-tag">¡Gratis!</span>
                </li>
              </ul>

              <div className="custom-box__summary-total">
                <span>Precio Total</span>
                <span className="custom-box__total-amount">${calculateTotal().toFixed(2)}</span>
              </div>

              <button
                className={`btn btn-primary custom-box__add-btn ${added ? 'btn-added' : ''}`}
                onClick={handleAddPackToCart}
                id="add-custom-pack-btn"
              >
                <span>{added ? '✓ ¡Pack Añadido al Carrito!' : 'Añadir Pack al Carrito'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
