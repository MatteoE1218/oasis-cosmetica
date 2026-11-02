import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { products as defaultProducts } from '../data/products'
import {
  fetchProductsFromSupabase,
  upsertProductToSupabase,
  upsertManyProductsToSupabase,
  deleteProductFromSupabase,
} from '../utils/supabaseClient'

const CatalogContext = createContext(null)

const LOCAL_CATALOG_KEY = 'oasis_catalog_products_v1'
const FEATURED_SLOTS_KEY = 'oasis_featured_slots_v1'
const PACK_TYPES_KEY = 'oasis_pack_types_v1'
const ADMIN_PIN_KEY = 'oasis_admin_pin_v1'
const DEFAULT_ADMIN_PIN = 'oasis2026'

export const DEFAULT_PACK_TYPES = [
  {
    id: 'box-rose',
    name: 'Caja Regalo Oasis Pink',
    desc: 'Lujoso estuche rígido en tono rubor suave con detalles fucsia y lazo de satén.',
    color: '#FFE3EC',
    borderColor: '#FF3399',
    extraPrice: 8.0,
    fixedPrice: 0, // 0 = suma los productos + extraPrice; > 0 = precio fijo del combo completo
    maxItems: 3, // Cantidad de cosméticos que lleva este pack/combo
  },
  {
    id: 'box-gold',
    name: 'Caja Destello Magenta',
    desc: 'Presentación insignia Oasis en tono suave con borde fucsia brillante.',
    color: '#FFF0F5',
    borderColor: '#F72585',
    extraPrice: 12.0,
    fixedPrice: 0,
    maxItems: 5,
  },
  {
    id: 'box-ivory',
    name: 'Caja Minimalista Blanco Puro',
    desc: 'Elegancia pura en estuche blanco luminoso con cinta fucsia de alta cosmética.',
    color: '#FFFFFF',
    borderColor: '#FFB6C1',
    extraPrice: 6.0,
    fixedPrice: 0,
    maxItems: 2,
  },
]

const DEFAULT_FEATURED_SLOTS = {
  slot1Id: '1', // Sección Destacada 1 (Labial / Producto Estrella 1)
  slot2Id: '3', // Sección Destacada 2 (Sérum / Base / Producto Estrella 2)
  slot3Id: '2', // Sección Destacada 3 (Polvo / Paleta / Producto Estrella 3)
  slot1Use3D: false, // false = si tiene foto real muestra la foto real, si no tiene foto muestra el 3D
  slot2Use3D: false,
  slot3Use3D: false,
}

function normalizeProduct(p, index = 0) {
  return {
    id: p.id ?? `prod-${Date.now()}-${index}`,
    name: p.name || 'Producto Oasis',
    category: p.category || 'Labiales',
    price: Number(p.price ?? 25),
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 25,
    tagline: p.tagline || '',
    description: p.description || '',
    shades:
      Array.isArray(p.shades) && p.shades.length > 0
        ? p.shades
        : [{ name: 'Tono Único', hex: '#d4637a' }],
    defaultShade: Number(p.defaultShade ?? 0),
    badge: p.badge || null,
    icon: p.icon || '💄',
    gradient: p.gradient || 'linear-gradient(135deg, #9b1b30, #d4637a)',
    image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
    images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
    includeInPack: p.includeInPack !== false,
  }
}

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CATALOG_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProduct)
        }
      }
    } catch {
      // ignore local storage read errors
    }
    return defaultProducts.map(normalizeProduct)
  })

  const [featuredSlots, setFeaturedSlots] = useState(() => {
    try {
      const saved = localStorage.getItem(FEATURED_SLOTS_KEY)
      if (saved) {
        return { ...DEFAULT_FEATURED_SLOTS, ...JSON.parse(saved) }
      }
    } catch {
      // ignore
    }
    return DEFAULT_FEATURED_SLOTS
  })

  const updateFeaturedSlots = useCallback((nextSlots) => {
    setFeaturedSlots((prev) => {
      const merged = { ...prev, ...nextSlots }
      try {
        localStorage.setItem(FEATURED_SLOTS_KEY, JSON.stringify(merged))
      } catch {
        // ignore
      }
      return merged
    })
  }, [])

  const [packTypes, setPackTypes] = useState(() => {
    try {
      const saved = localStorage.getItem(PACK_TYPES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_PACK_TYPES
  })

  const savePackTypes = useCallback((nextPacks) => {
    setPackTypes(nextPacks)
    try {
      localStorage.setItem(PACK_TYPES_KEY, JSON.stringify(nextPacks))
    } catch {
      // ignore
    }
  }, [])

  const addOrUpdatePackType = useCallback(
    (packData) => {
      const clean = {
        id: packData.id || `pack-type-${Date.now()}`,
        name: packData.name?.trim() || 'Nuevo Pack Oasis',
        desc: packData.desc?.trim() || 'Empaque especial con tarjeta personalizada.',
        color: packData.color || '#FFE3EC',
        borderColor: packData.borderColor || '#FF3399',
        extraPrice: Number(packData.extraPrice ?? 8),
        fixedPrice: Number(packData.fixedPrice ?? 0),
        maxItems: Math.max(1, parseInt(packData.maxItems, 10) || 3),
      }
      const exists = packTypes.some((p) => String(p.id) === String(clean.id))
      const next = exists
        ? packTypes.map((p) => (String(p.id) === String(clean.id) ? clean : p))
        : [...packTypes, clean]
      savePackTypes(next)
      return clean
    },
    [packTypes, savePackTypes]
  )

  const deletePackType = useCallback(
    (packId) => {
      if (packTypes.length <= 1) return // mantener al menos 1 tipo de pack
      const next = packTypes.filter((p) => String(p.id) !== String(packId))
      savePackTypes(next)
    },
    [packTypes, savePackTypes]
  )

  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('oasis_admin_unlocked') === 'true'
  })
  const [syncStatus, setSyncStatus] = useState('local') // 'local' | 'syncing' | 'cloud' | 'error'
  const [syncMessage, setSyncMessage] = useState('')

  // Persistir en localStorage como respaldo instantáneo
  const saveLocally = useCallback((nextProducts) => {
    const normalized = nextProducts.map(normalizeProduct)
    setProducts(normalized)
    try {
      localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(normalized))
    } catch {
      // Si las fotos embebidas superan la cuota de localStorage, igual se mantiene en memoria y en Supabase
    }
  }, [])

  // Sincronización inicial desde Supabase
  const refreshFromCloud = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      const cloudProducts = await fetchProductsFromSupabase()
      if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        saveLocally(cloudProducts)
        setSyncStatus('cloud')
        setSyncMessage('Conectado a Supabase en tiempo real')
      } else {
        // La tabla existe en Supabase pero está vacía: subimos los productos actuales para inicializarla
        try {
          await upsertManyProductsToSupabase(products)
          setSyncStatus('cloud')
          setSyncMessage('Catálogo inicial sincronizado con Supabase')
        } catch {
          setSyncStatus('cloud')
          setSyncMessage('Tabla lista en Supabase')
        }
      }
    } catch (err) {
      const errMsg = err?.message || String(err)
      setSyncStatus('local')
      setSyncMessage(`Detalle de conexión Supabase: ${errMsg}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshFromCloud()
  }, [refreshFromCloud])

  // Detectar ruta oculta (#admin o ?admin=1) y atajo secreto Ctrl + Shift + A
  useEffect(() => {
    const checkHashAndQuery = () => {
      const hash = window.location.hash.toLowerCase()
      const search = window.location.search.toLowerCase()
      if (hash === '#admin' || hash === '#panel-admin' || search.includes('admin=oasis')) {
        setIsAdminOpen(true)
      }
    }

    checkHashAndQuery()
    window.addEventListener('hashchange', checkHashAndQuery)

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setIsAdminOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('hashchange', checkHashAndQuery)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Acciones CRUD de productos (Local inmediato + Supabase en la nube)
  const addOrUpdateProduct = useCallback(
    async (productData) => {
      const normalized = normalizeProduct(productData)
      const exists = products.some((p) => String(p.id) === String(normalized.id))
      const nextList = exists
        ? products.map((p) => (String(p.id) === String(normalized.id) ? normalized : p))
        : [normalized, ...products]

      saveLocally(nextList)

      try {
        await upsertProductToSupabase(normalized)
        setSyncStatus('cloud')
        setSyncMessage('Guardado en Supabase y en el catálogo local')
      } catch {
        setSyncMessage('Guardado en catálogo local (pendiente sincronizar tabla en Supabase)')
      }
      return normalized
    },
    [products, saveLocally]
  )

  const addManyProducts = useCallback(
    async (newProductsList, replaceAll = false) => {
      const normalizedBatch = newProductsList.map((p, idx) => normalizeProduct(p, idx))
      const nextList = replaceAll ? normalizedBatch : [...normalizedBatch, ...products]
      saveLocally(nextList)

      try {
        await upsertManyProductsToSupabase(normalizedBatch)
        setSyncStatus('cloud')
        setSyncMessage(`${normalizedBatch.length} productos publicados en Supabase`)
      } catch {
        setSyncMessage(`${normalizedBatch.length} productos guardados localmente`)
      }
      return normalizedBatch
    },
    [products, saveLocally]
  )

  const deleteProduct = useCallback(
    async (productId) => {
      const nextList = products.filter((p) => String(p.id) !== String(productId))
      saveLocally(nextList)

      try {
        await deleteProductFromSupabase(productId)
        setSyncStatus('cloud')
      } catch {
        // mantenido en local
      }
    },
    [products, saveLocally]
  )

  const restoreDefaultCatalog = useCallback(async () => {
    const initial = defaultProducts.map(normalizeProduct)
    saveLocally(initial)
    try {
      await upsertManyProductsToSupabase(initial)
    } catch {
      // ignore
    }
  }, [saveLocally])

  const verifyAdminPin = useCallback((inputPin) => {
    const storedPin = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN
    if (inputPin.trim() === storedPin) {
      setIsAdminAuthenticated(true)
      sessionStorage.setItem('oasis_admin_unlocked', 'true')
      return true
    }
    return false
  }, [])

  const updateAdminPin = useCallback((newPin) => {
    if (newPin && newPin.trim().length >= 4) {
      localStorage.setItem(ADMIN_PIN_KEY, newPin.trim())
      return true
    }
    return false
  }, [])

  const closeAdminPanel = useCallback(() => {
    setIsAdminOpen(false)
    if (window.location.hash.toLowerCase().includes('admin')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const categories = useMemo(() => {
    const base = ['Todos', 'Labiales', 'Base', 'Sombras', 'Rubor', 'Máscara']
    const extra = products
      .map((p) => p.category)
      .filter((c) => c && !base.includes(c))
    return [...base, ...new Set(extra)]
  }, [products])

  const value = useMemo(
    () => ({
      products,
      categories,
      featuredSlots,
      updateFeaturedSlots,
      packTypes,
      addOrUpdatePackType,
      deletePackType,
      isAdminOpen,
      setIsAdminOpen,
      closeAdminPanel,
      isAdminAuthenticated,
      setIsAdminAuthenticated,
      verifyAdminPin,
      updateAdminPin,
      addOrUpdateProduct,
      addManyProducts,
      deleteProduct,
      restoreDefaultCatalog,
      refreshFromCloud,
      syncStatus,
      syncMessage,
    }),
    [
      products,
      categories,
      featuredSlots,
      updateFeaturedSlots,
      packTypes,
      addOrUpdatePackType,
      deletePackType,
      isAdminOpen,
      closeAdminPanel,
      isAdminAuthenticated,
      verifyAdminPin,
      updateAdminPin,
      addOrUpdateProduct,
      addManyProducts,
      deleteProduct,
      restoreDefaultCatalog,
      refreshFromCloud,
      syncStatus,
      syncMessage,
    ]
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de CatalogProvider')
  return ctx
}

