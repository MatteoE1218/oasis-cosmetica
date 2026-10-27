import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Footer.css'

gsap.registerPlugin(ScrollTrigger)

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
          <span className="footer__logo">◆ OASIS</span>
          <p className="footer__brand-desc">
            Cosmética botánica y maquillaje exclusivo.
            Descubre nuestras fórmulas y crea tu pack personalizado con mensaje especial.
          </p>
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
            <li><a href="#" className="footer__link">Ingredientes</a></li>
            <li><a href="#" className="footer__link">Sostenibilidad</a></li>
            <li><a href="#btn-whatsapp" className="footer__link">Contacto WhatsApp</a></li>
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
          <p>© 2026 Oasis Cosmética. Todos los derechos reservados.</p>
          <p className="footer__tech">
            Creado con <span aria-label="amor">♥</span> para Oasis Cosmética
          </p>
        </div>
      </div>
    </footer>
  )
}
