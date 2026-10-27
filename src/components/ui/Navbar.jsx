import { useEffect, useRef, useState } from 'react'
import { useCart, useCartDispatch } from '../../stores/CartContext'
import './Navbar.css'

const navLinks = [
  { href: '#hero', id: 'hero', label: 'Inicio' },
  { href: '#lipstick', id: 'lipstick', label: 'Labiales' },
  { href: '#base-fluida', id: 'base-fluida', label: 'Base Líquida' },
  { href: '#compacto', id: 'compacto', label: 'Polvos' },
  { href: '#colecciones', id: 'colecciones', label: 'Texturas' },
  { href: '#catalogo', id: 'catalogo', label: 'Catálogo' },
]

export default function Navbar() {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const cart = useCart()
  const dispatch = useCartDispatch()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)

      // Active section calculation
      const sections = ['hero', 'lipstick', 'base-fluida', 'compacto', 'colecciones', 'catalogo']
      const scrollPos = window.scrollY + 200

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      ref={navRef}
      id="main-nav"
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
      aria-label="Navegación principal"
    >
      <div className="container navbar__inner">
        {/* Logo */}
        <a href="#hero" className="navbar__logo" id="logo-link" aria-label="Oasis 3D - Inicio">
          <span className="navbar__logo-diamond" aria-hidden="true">◆</span>
          <span className="navbar__logo-text">
            <span className="navbar__logo-oasis">OASIS</span>
            <span className="navbar__logo-sub">COSMÉTICA</span>
          </span>
        </a>

        {/* Navigation links */}
        <ul className="navbar__links" id="nav-links">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className={`navbar__link ${activeSection === link.id ? 'navbar__link--active' : ''}`}
                id={`nav-${link.id}`}
              >
                {link.label}
                {activeSection === link.id && (
                  <span className="navbar__link-indicator" aria-hidden="true" />
                )}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="navbar__actions">
          <button
            className="navbar__cart-btn"
            id="nav-cart-btn"
            onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
            aria-label={`Carrito: ${cart.totalItems} artículos`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cart.totalItems > 0 && (
              <span className="navbar__cart-badge">{cart.totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}

