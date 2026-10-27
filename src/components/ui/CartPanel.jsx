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
                  €{(item.price * item.qty).toFixed(2)}
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
                €{cart.totalPrice.toFixed(2)}
              </span>
            </div>
            <button className="btn btn-primary cart-panel__checkout" id="checkout-btn">
              Finalizar Compra
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
