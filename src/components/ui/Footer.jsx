import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Footer.css'

gsap.registerPlugin(ScrollTrigger)

// Enlaces de redes sociales — actualizables con tus perfiles oficiales
export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com', // Pega aquí tu perfil de Instagram
  tiktok: 'https://tiktok.com',       // Pega aquí tu perfil de TikTok
}

export default function Footer() {
  const footerRef = useRef(null)

  useEffect(() => {
    if (!footerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.footer__inner > *',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, footerRef.current)

    return () => ctx.revert()
  }, [])

  return (
    <footer ref={footerRef} className="footer" id="footer">
      <div className="container footer__inner">
        {/* Brand */}
        <div className="footer__brand">
          <div className="footer__logo-wrap">
            <img src="/oasis-logo.png" alt="Oasis Makeup" className="footer__logo-icon" width="34" height="34" />
            <span className="footer__logo">OASIS MAKEUP</span>
          </div>
          <p className="footer__brand-desc">
            Maquillaje de alta cosmética y productos en tendencia.
            Descubre nuestras fórmulas y crea tu pack personalizado con mensaje especial.
          </p>

          {/* Social Icons */}
          <div className="footer__socials">
            <span className="footer__socials-label">Síguenos:</span>
            <div className="footer__social-links">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-btn footer__social-btn--instagram"
                aria-label="Síguenos en Instagram"
                title="Instagram @oasis.makeup"
                id="footer-social-instagram"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>

              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-btn footer__social-btn--tiktok"
                aria-label="Síguenos en TikTok"
                title="TikTok @oasis.makeup"
                id="footer-social-tiktok"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .59.043.87.126V9.4a6.34 6.34 0 0 0-.87-.06A6.33 6.33 0 0 0 3.15 15.67a6.33 6.33 0 0 0 10.8 4.47 6.28 6.28 0 0 0 1.86-4.47V8.71a8.18 8.18 0 0 0 4.78 1.53V6.79a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span>TikTok</span>
              </a>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="footer__links-group">
          <h3 className="footer__heading">Tienda</h3>
          <ul className="footer__links">
            <li><a href="#catalogo" className="footer__link">Catálogo</a></li>
            <li><a href="#packs" className="footer__link">Packs de Regalo</a></li>
            <li><a href="#lipstick" className="footer__link">Labiales</a></li>
            <li><a href="#base-fluida" className="footer__link">Base & Sérum</a></li>
          </ul>
        </div>

        <div className="footer__links-group">
          <h3 className="footer__heading">Información</h3>
          <ul className="footer__links">
            <li><a href="#" className="footer__link">Sobre Nosotros</a></li>
            <li><a href="#catalogo" className="footer__link">Guía de Tonos</a></li>
            <li><a href="#packs" className="footer__link">Detalles de Packs</a></li>
            <li><a href="https://wa.me/593998346794" target="_blank" rel="noopener noreferrer" className="footer__link">Atención por WhatsApp</a></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="footer__newsletter">
          <h3 className="footer__heading">Boletín Exclusivo</h3>
          <p className="footer__newsletter-desc">
            Recibe novedades y ofertas exclusivas de la marca.
          </p>
          <form className="footer__form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="tu@email.com"
              className="footer__input"
              aria-label="Email para boletín de noticias"
              id="newsletter-email"
            />
            <button type="submit" className="footer__submit" id="newsletter-submit">
              →
            </button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>© 2026 Oasis Makeup. Todos los derechos reservados.</p>
          <p className="footer__tech">
            Creado con <span aria-label="amor">♥</span> para Oasis Makeup
          </p>
        </div>
      </div>
    </footer>
  )
}
