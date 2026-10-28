import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCartDispatch } from '../../stores/CartContext'
import './CustomBoxSection.css'

gsap.registerPlugin(ScrollTrigger)

const boxStyles = [
  {
    id: 'box-rose',
    name: 'Caja Regalo Oasis Pink',
    desc: 'Lujoso estuche rígido en tono rubor suave con detalles fucsia y lazo de satén.',
    color: '#FFE3EC',
    borderColor: '#FF3399',
    extraPrice: 8.0,
  },
  {
    id: 'box-gold',
    name: 'Caja Destello Magenta',
    desc: 'Presentación insignia Oasis en tono suave con borde fucsia brillante.',
    color: '#FFF0F5',
    borderColor: '#F72585',
    extraPrice: 12.0,
  },
  {
    id: 'box-ivory',
    name: 'Caja Minimalista Blanco Puro',
    desc: 'Elegancia pura en estuche blanco luminoso con cinta fucsia de alta cosmética.',
    color: '#FFFFFF',
    borderColor: '#FFB6C1',
    extraPrice: 6.0,
  },
]

const selectableItems = [
  { id: 101, name: 'Labial Eterno (Tono a elección)', price: 42.0, icon: '💄' },
  { id: 102, name: 'Sérum Resplandor (Base)', price: 56.0, icon: '✨' },
  { id: 103, name: 'Polvo Resplandor con Espejo', price: 68.0, icon: '🪞' },
  { id: 104, name: 'Rubor Terciopelo Suave', price: 34.0, icon: '🌸' },
  { id: 105, name: 'Brillo Labial Cristalino', price: 28.0, icon: '💎' },
]

export default function CustomBoxSection() {
  const sectionRef = useRef(null)
  const [selectedBox, setSelectedBox] = useState(boxStyles[0])
  const [selectedProducts, setSelectedProducts] = useState([101, 102])
  const [recipient, setRecipient] = useState('')
  const [sender, setSender] = useState('')
  const [message, setMessage] = useState('Que cada día brille con la luz y belleza que llevas dentro.')
  const [added, setAdded] = useState(false)
  const dispatch = useCartDispatch()

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.custom-box__title',
        { y: 40, opacity: 0 },
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

      gsap.fromTo(
        '.custom-box__grid > *',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.custom-box__grid',
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, sectionRef.current)

    return () => ctx.revert()
  }, [])

  const toggleProduct = (id) => {
    if (selectedProducts.includes(id)) {
      if (selectedProducts.length === 1) return // al menos 1 producto
      setSelectedProducts(selectedProducts.filter((p) => p !== id))
    } else {
      setSelectedProducts([...selectedProducts, id])
    }
  }

  const calculateTotal = () => {
    const productsSum = selectedProducts.reduce((acc, id) => {
      const p = selectableItems.find((item) => item.id === id)
      return acc + (p ? p.price : 0)
    }, 0)
    return productsSum + selectedBox.extraPrice
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
        shadeHex: selectedBox.borderColor,
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
    <section ref={sectionRef} className="custom-box section" id="packs">
      <div className="container">
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
            Crea una experiencia inolvidable. Elige tus cosméticos favoritos, 
            el estilo de caja que más te guste y nosotros incluiremos una tarjeta 
            artesanal con tu dedicatoria personalizada impresa con tinta dorada.
          </p>
        </div>

        {/* Grid de 2 columnas: Configuración y Vista previa */}
        <div className="custom-box__grid">
          {/* Columna Izquierda: Configuración del Pack */}
          <div className="custom-box__config glass">
            {/* Paso 1: Estilo de Caja */}
            <div className="custom-box__step">
              <div className="custom-box__step-header">
                <span className="custom-box__step-num">1</span>
                <div>
                  <h3 className="custom-box__step-title">Elige el estilo de tu caja</h3>
                  <p className="custom-box__step-sub">Empaque para regalo con lazo satinado</p>
                </div>
              </div>

              <div className="custom-box__options">
                {boxStyles.map((box) => (
                  <button
                    key={box.id}
                    className={`custom-box__option-btn ${selectedBox.id === box.id ? 'custom-box__option-btn--active' : ''}`}
                    onClick={() => setSelectedBox(box)}
                    type="button"
                  >
                    <span 
                      className="custom-box__color-sample" 
                      style={{ backgroundColor: box.color, borderColor: box.borderColor }}
                    />
                    <div className="custom-box__option-info">
                      <strong>{box.name}</strong>
                      <span>+${box.extraPrice.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Paso 2: Productos a incluir */}
            <div className="custom-box__step">
              <div className="custom-box__step-header">
                <span className="custom-box__step-num">2</span>
                <div>
                  <h3 className="custom-box__step-title">Selecciona los cosméticos a incluir</h3>
                  <p className="custom-box__step-sub">Mínimo 1 producto para armar tu pack</p>
                </div>
              </div>

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
                      <span className="custom-box__item-price">${item.price.toFixed(2)}</span>
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
                  “{message || 'Escribe tu dedicatoria...' }”
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
                <span className="custom-box__summary-badge">{selectedBox.name}</span>
              </div>

              <ul className="custom-box__summary-list">
                <li>
                  <span>Empaque de regalo</span>
                  <span>${selectedBox.extraPrice.toFixed(2)}</span>
                </li>
                {selectedProducts.map((id) => {
                  const p = selectableItems.find((item) => item.id === id)
                  return (
                    <li key={id}>
                      <span>{p?.name}</span>
                      <span>${p?.price.toFixed(2)}</span>
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
