import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useCart, useCartDispatch } from '../../stores/CartContext'
import './CartPanel.css'

/**
 * Glassmorphism slide-out cart panel with backdrop blur,
 * quantity controls, and animated entry/exit.
 */
export default function CartPanel() {
  const cart = useCart()
  const dispatch = useCartDispatch()
  const panelRef = useRef(null)
  const overlayRef = useRef(null)
  const itemsRef = useRef(null)

  useEffect(() => {
    if (cart.isOpen) {
      // Enter animation
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      )
      gsap.fromTo(
        panelRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.5, ease: 'power3.out' }
      )
      // Stagger items
      if (itemsRef.current) {
        gsap.fromTo(
          itemsRef.current.children,
          { x: 30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            stagger: 0.06,
            duration: 0.4,
            delay: 0.2,
            ease: 'power3.out',
          }
        )
      }
    }
  }, [cart.isOpen])

  const handleClose = () => {
    gsap.to(panelRef.current, {
      x: '100%',
      duration: 0.4,
      ease: 'power3.in',
    })
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => dispatch({ type: 'SET_PANEL', isOpen: false }),
    })
  }

  const WHATSAPP_NUMBER = '593998346794'

  const handleWhatsAppCheckout = () => {
    if (cart.items.length === 0) return

    // Generador de código de pedido único y estético (Ej. #OS-4821)
    const orderCode = 'OS-' + Math.floor(1000 + Math.random() * 9000)
    const fecha = new Date().toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // Detectar si el usuario viene desde un dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    let lines = []

    if (isMobile) {
      // ── FORMATO PARA CELULAR (Rico en emojis vibrantes) ──
      lines.push(`✨ *OASIS MAKEUP • NUEVA ORDEN* ✨`)
      lines.push(`_Boutique de Alta Cosmética_`)
      lines.push(`----------------------------------------`)
      lines.push(`📋 *Pedido:* #${orderCode}`)
      lines.push(`📅 *Fecha:* ${fecha}`)
      lines.push(`----------------------------------------`)
      lines.push(``)
      lines.push(`💄 *PRODUCTOS SELECCIONADOS:*`)
      lines.push(``)

      cart.items.forEach((item, index) => {
        const isPack = item.isPack || item.name.includes('Pack')
        const itemIcon = isPack ? '🎁' : '💄'

        lines.push(`${itemIcon} *${index + 1}. ${item.name}*`)

        if (isPack) {
          if (item.recipient) {
            lines.push(`   • *Para:* ${item.recipient}`)
          }
          if (item.sender) {
            lines.push(`   • *De parte de:* ${item.sender}`)
          }
          if (item.itemsIncluded) {
            lines.push(`   • *Cosméticos incluidos:* ${item.itemsIncluded}`)
          }
          if (item.customMessage) {
            lines.push(`   • 💌 *Tarjeta con dedicatoria:*`)
            lines.push(`     _“${item.customMessage}”_`)
          }
        } else {
          if (item.shade) {
            lines.push(`   • *Tono / Matiz:* ${item.shade}`)
          }
          if (item.customMessage) {
            lines.push(`   • 💌 *Dedicatoria:* _“${item.customMessage}”_`)
          }
        }

        lines.push(`   • *Cantidad:* ${item.qty} ${item.qty > 1 ? 'unidades' : 'unidad'}`)
        lines.push(`   • *Subtotal:* $${(item.price * item.qty).toFixed(2)}`)
        lines.push(``)
      })

      lines.push(`----------------------------------------`)
      lines.push(`📊 *RESUMEN DE COMPRA:*`)
      lines.push(`• *Total de artículos:* ${cart.totalItems}`)
      lines.push(`• *TOTAL A PAGAR:* *$${cart.totalPrice.toFixed(2)}*`)
      lines.push(`----------------------------------------`)
      lines.push(``)
      lines.push(`📍 *DATOS PARA EL ENVÍO & PAGO:*`)
      lines.push(`• *Nombre de quien recibe:* `)
      lines.push(`• *Ciudad / Dirección:* `)
      lines.push(`• *Método de pago preferido:* (Transferencia / Depósito / Efectivo)`)
    } else {
      // ── FORMATO PARA COMPUTADORA / WINDOWS ──
      // Optimizado tipográficamente para que la app de WhatsApp para Windows se lea 100% limpia sin signos de interrogación
      lines.push(`*OASIS MAKEUP • ORDEN DE COMPRA*`)
      lines.push(`_Boutique de Cosmética & Belleza_`)
      lines.push(`----------------------------------------`)
      lines.push(`*Pedido:* #${orderCode}`)
      lines.push(`*Fecha:* ${fecha}`)
      lines.push(`----------------------------------------`)
      lines.push(``)
      lines.push(`*DETALLE DE PRODUCTOS:*`)
      lines.push(``)

      cart.items.forEach((item, index) => {
        const isPack = item.isPack || item.name.includes('Pack')

        lines.push(`*${index + 1}. ${item.name}*`)

        if (isPack) {
          if (item.recipient) {
            lines.push(`   • *Para:* ${item.recipient}`)
          }
          if (item.sender) {
            lines.push(`   • *De parte de:* ${item.sender}`)
          }
          if (item.itemsIncluded) {
            lines.push(`   • *Cosméticos incluidos:* ${item.itemsIncluded}`)
          }
          if (item.customMessage) {
            lines.push(`   • *Tarjeta con dedicatoria:*`)
            lines.push(`     > "${item.customMessage}"`)
          }
        } else {
          if (item.shade) {
            lines.push(`   • *Tono / Matiz:* ${item.shade}`)
          }
          if (item.customMessage) {
            lines.push(`   • *Dedicatoria:* > "${item.customMessage}"`)
          }
        }

        lines.push(`   • *Cantidad:* ${item.qty} ${item.qty > 1 ? 'unidades' : 'unidad'}`)
        lines.push(`   • *Subtotal:* $${(item.price * item.qty).toFixed(2)}`)
        lines.push(``)
      })

      lines.push(`----------------------------------------`)
      lines.push(`*RESUMEN DE COMPRA:*`)
      lines.push(`• *Total de artículos:* ${cart.totalItems}`)
      lines.push(`• *TOTAL A PAGAR:* *$${cart.totalPrice.toFixed(2)}*`)
      lines.push(`----------------------------------------`)
      lines.push(``)
      lines.push(`*DATOS PARA EL ENVÍO & PAGO:*`)
      lines.push(`• *Nombre de quien recibe:* `)
      lines.push(`• *Ciudad / Dirección:* `)
      lines.push(`• *Método de pago preferido:* (Transferencia / Depósito / Efectivo)`)
    }

    lines.push(``)
    lines.push(`_¡Hola Oasis Makeup! Deseo coordinar el pago y envío de mi pedido. ¿Me confirman disponibilidad y los datos para realizar la transferencia? ¡Muchas gracias!_`)

    const message = lines.join('\n')
    const encoded = encodeURIComponent(message)

    // Abre directamente la aplicación de WhatsApp que el usuario ya tenga en su dispositivo
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!cart.isOpen) return null

  return (
    <div className="cart-overlay-wrapper">
      {/* Backdrop overlay */}
      <div
        ref={overlayRef}
        className="cart-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Cart panel */}
      <aside
        ref={panelRef}
        className="cart-panel"
        role="dialog"
        aria-label="Carrito de compras"
        id="cart-panel"
      >
        {/* Header */}
        <div className="cart-panel__header">
          <h2 className="cart-panel__title">Tu Carrito</h2>
          <span className="cart-panel__count">{cart.totalItems} artículos</span>
          <button
            className="cart-panel__close"
            onClick={handleClose}
            aria-label="Cerrar carrito"
            id="cart-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items list */}
        <div ref={itemsRef} className="cart-panel__items">
          {cart.items.length === 0 ? (
            <div className="cart-panel__empty">
              <span className="cart-panel__empty-icon">✦</span>
              <p>Tu carrito está vacío</p>
              <p className="cart-panel__empty-sub">Explora nuestra colección</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={`${item.id}-${item.shade}`} className="cart-item">
                <div
                  className="cart-item__swatch"
                  style={{ background: item.shadeHex }}
                />
                <div className="cart-item__info">
                  <p className="cart-item__name">{item.name}</p>
                  <p className="cart-item__shade">{item.shade}</p>
                  {item.recipient && (
                    <p className="cart-item__gift-meta" style={{ fontSize: '0.74rem', color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
                      🎁 <strong>Para:</strong> {item.recipient} {item.sender ? <span>• <strong>De:</strong> {item.sender}</span> : ''}
                    </p>
                  )}
                  {item.customMessage && (
                    <p className="cart-item__custom-msg" style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--color-accent-primary)', marginTop: '0.2rem' }}>
                      💌 “{item.customMessage}”
                    </p>
                  )}
                </div>
                <div className="cart-item__controls">
                  <button
                    className="cart-item__qty-btn"
                    onClick={() =>
                      dispatch({
                        type: 'UPDATE_QTY',
                        id: item.id,
                        shade: item.shade,
                        qty: item.qty - 1,
                      })
                    }
                    aria-label="Reducir cantidad"
                  >
                    −
                  </button>
                  <span className="cart-item__qty">{item.qty}</span>
                  <button
                    className="cart-item__qty-btn"
                    onClick={() =>
                      dispatch({
                        type: 'UPDATE_QTY',
                        id: item.id,
                        shade: item.shade,
                        qty: item.qty + 1,
                      })
                    }
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <span className="cart-item__price">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer with total */}
        {cart.items.length > 0 && (
          <div className="cart-panel__footer">
            <div className="cart-panel__total">
              <span>Total</span>
              <span className="cart-panel__total-price">
                ${cart.totalPrice.toFixed(2)}
              </span>
            </div>
            <button
              className="btn btn-whatsapp-checkout cart-panel__checkout"
              onClick={handleWhatsAppCheckout}
              id="checkout-whatsapp-btn"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Pedir por WhatsApp</span>
            </button>
            <p className="cart-panel__whatsapp-note">
              💬 Los pagos y envíos se coordinan directamente por WhatsApp con nuestro equipo (+593 998346794).
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
