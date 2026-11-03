import { useEffect, useRef, useState } from 'react'
import { useCart, useCartDispatch } from '../../stores/CartContext'
import { useCatalog } from '../../stores/CatalogContext'
import './Navbar.css'

const navLinks = [
  { page: 'home', id: 'inicio', label: 'Inicio' },
  { page: 'packs', id: 'packs', label: 'Arma tu Pack' },
  { page: 'catalog', id: 'catalogo', label: 'Catálogo' },
]

export default function Navbar() {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const cart = useCart()
  const dispatch = useCartDispatch()
  const { activePage, navigateToPage } = useCatalog()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e, page) => {
    e.preventDefault()
    navigateToPage(page)
  }

  return (
    <nav
      ref={navRef}
      id="main-nav"
      className={`navbar ${scrolled || activePage !== 'home' ? 'navbar--scrolled' : ''}`}
      aria-label="Navegación principal"
    >
      <div className="container navbar__inner">
        {/* Logo con icono insignia */}
        <a
          href="#inicio"
          onClick={(e) => handleNavClick(e, 'home')}
          className="navbar__logo"
          id="logo-link"
          aria-label="Oasis Makeup - Inicio"
        >
          <img src="/oasis-logo.png" alt="Oasis Makeup Logo" className="navbar__logo-icon" width="38" height="38" />
          <span className="navbar__logo-text">
            <span className="navbar__logo-oasis">OASIS</span>
            <span className="navbar__logo-sub">MAKEUP</span>
          </span>
        </a>

        {/* Navigation links: Inicio, Arma tu Pack, Catálogo */}
        <ul className="navbar__links" id="nav-links">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.page)}
                className={`navbar__link ${activePage === link.page ? 'navbar__link--active' : ''}`}
                id={`nav-${link.id}`}
              >
                {link.label}
                {activePage === link.page && (
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

