import { useState, useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CartProvider } from './stores/CartContext'
import { CatalogProvider, useCatalog } from './stores/CatalogContext'
import AtmosphereBackground from './components/ui/AtmosphereBackground'
import Navbar from './components/ui/Navbar'
import HeroSection from './components/ui/HeroSection'
import LipstickSection from './components/ui/LipstickSection'
import FluidSection from './components/ui/FluidSection'
import CompactSection from './components/ui/CompactSection'
import ProductCatalog from './components/ui/ProductCatalog'
import CustomBoxSection from './components/ui/CustomBoxSection'
import ScrollSection from './components/ui/ScrollSection'
import Footer from './components/ui/Footer'
import CartPanel from './components/ui/CartPanel'
import Loader from './components/ui/Loader'
import WhatsAppButton from './components/ui/WhatsAppButton'
import AdminPanel from './components/ui/AdminPanel'
import './App.css'

function MainContent() {
  const { activePage } = useCatalog()

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        ScrollTrigger.refresh()
      } catch {
        // ignore
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [activePage])

  return (
    <main id="main-content">
      {activePage === 'home' && (
        <>
          {/* Sección 1: Hero — Presentación principal */}
          <HeroSection />

          {/* Productos Destacados (1, 2 y 3 configurables desde el Panel de Admin) */}
          <LipstickSection />
          <FluidSection />
          <CompactSection />

          {/* Sobre Nosotros, calidad y accesos directos */}
          <ScrollSection />
        </>
      )}

      {activePage === 'packs' && <CustomBoxSection />}

      {activePage === 'catalog' && <ProductCatalog />}
    </main>
  )
}

export default function App() {
  const [, setLoaded] = useState(false)

  return (
    <CatalogProvider>
      <CartProvider>
        <div className="app">
          {/* Preloader editorial */}
          <Loader onComplete={() => setLoaded(true)} />

          {/* Dynamic atmospheric background morphing with scroll */}
          <AtmosphereBackground />

          {/* HTML overlay content */}
          <div className="overlay-content">
            <Navbar />

            <MainContent />

            {/* Footer editorial */}
            <Footer />

            {/* Drawer de carrito */}
            <CartPanel />

            {/* Botón flotante de WhatsApp para atención y pedidos */}
            <WhatsAppButton />

            {/* Panel de Administrador Oculto (5 clics en logo del footer) */}
            <AdminPanel />
          </div>
        </div>
      </CartProvider>
    </CatalogProvider>
  )
}
