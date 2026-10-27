import { useState } from 'react'
import { CartProvider } from './stores/CartContext'
import AtmosphereBackground from './components/ui/AtmosphereBackground'
import Navbar from './components/ui/Navbar'
import HeroSection from './components/ui/HeroSection'
import LipstickSection from './components/ui/LipstickSection'
import FluidSection from './components/ui/FluidSection'
import CompactSection from './components/ui/CompactSection'
import TextureShowcase from './components/ui/TextureShowcase'
import ProductCatalog from './components/ui/ProductCatalog'
import CustomBoxSection from './components/ui/CustomBoxSection'
import ScrollSection from './components/ui/ScrollSection'
import Footer from './components/ui/Footer'
import CartPanel from './components/ui/CartPanel'
import Loader from './components/ui/Loader'
import WhatsAppButton from './components/ui/WhatsAppButton'
import './App.css'

/**
 * App Root — Haute Cosmétique 3D (Luminous Editorial Edition)
 *
 * Scrollytelling Architecture:
 * - AtmosphereBackground: fixed dynamic gradient backdrop morphing between ivory (#FDFBF7),
 *   dusty powder rose (#F8EAE8), warm cashmere beige (#F5EFEB), and soft porcelain (#F9F6F0).
 * - Scene3D: fixed R3F canvas with Three.js studio lighting and 3 cosmetic items
 *   (Rouge Éternel lipstick, Sérum Éclat glass bottle, Poudre Éclat lacquer compact).
 * - Multi-section layout with synchronized GSAP ScrollTrigger animations.
 */
export default function App() {
  const [loaded, setLoaded] = useState(false)

  return (
    <CartProvider>
      <div className="app">
        {/* Preloader editorial */}
        <Loader onComplete={() => setLoaded(true)} />

        {/* Dynamic atmospheric background morphing with scroll */}
        <AtmosphereBackground />

        {/* HTML overlay content */}
        <div className="overlay-content">
          <Navbar />

          <main id="main-content">
            {/* Sección 1: Hero — Presentación principal con iluminación cálida */}
            <HeroSection />

            {/* Sección 2: Pintalabios — Labial 3D rotando y abriéndose con el scroll (#F8EAE8) */}
            <LipstickSection />

            {/* Sección 3: Base Líquida / Sérum — Frasco de vidrio y textura fluida (#F5EFEB) */}
            <FluidSection />

            {/* Sección 4: Polvos Compactos — Estuche de laca blanca con espejo (#F9F6F0) */}
            <CompactSection />

            {/* Galería interactiva de texturas & morphing swatches */}
            <TextureShowcase />

            {/* Catálogo completo con tarjetas de productos */}
            <ProductCatalog />

            {/* Nueva sección: Arma tu Pack o Caja de Regalo Personalizada */}
            <CustomBoxSection />

            {/* Calidad, garantía y atención */}
            <ScrollSection />
          </main>

          {/* Footer editorial */}
          <Footer />

          {/* Drawer de carrito */}
          <CartPanel />

          {/* Botón flotante de WhatsApp para atención y pedidos */}
          <WhatsAppButton />
        </div>
      </div>
    </CartProvider>
  )
}
