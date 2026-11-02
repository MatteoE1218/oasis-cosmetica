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
const ADMIN_PIN_KEY = 'oasis_admin_pin_v1'
const DEFAULT_ADMIN_PIN = 'oasis2026'

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

