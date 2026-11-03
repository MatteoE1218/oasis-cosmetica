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
const CATEGORIES_STORAGE_KEY = 'oasis_catalog_categories_v1'
const ADMIN_PIN_HASH_KEY = 'oasis_admin_pin_sha256_v1'
// SHA-256 exacto de la clave inicial ('oasis2026')
const DEFAULT_ADMIN_PIN_SHA256 = '9d613c8d749936d3e14ba5ac29a6e262ecdd4fa3adeeccc28cdc9661e828cd3e'
const DEFAULT_CATEGORIES_LIST = ['Labiales', 'Base', 'Sombras', 'Rubor', 'Máscara']

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_CATEGORIES_LIST
  })

  const saveCategoriesList = useCallback((nextCats) => {
    const clean = [...new Set(nextCats.map((c) => c.trim()).filter((c) => c && c !== 'Todos'))]
    setCustomCategories(clean)
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(clean))
    } catch {
      // ignore
    }
  }, [])

  const addCategory = useCallback(
    (newCatName) => {
      const cleanName = (newCatName || '').trim()
      if (!cleanName || cleanName.toLowerCase() === 'todos') return false
      if (customCategories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) return false
      saveCategoriesList([...customCategories, cleanName])
      return true
    },
    [customCategories, saveCategoriesList]
  )

  const deleteCategory = useCallback(
    (catName) => {
      if (customCategories.length <= 1) return false
      const next = customCategories.filter((c) => c !== catName)
      saveCategoriesList(next)
      return true
    },
    [customCategories, saveCategoriesList]
  )

  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
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

  // Seguridad: Deshabilitado el acceso por URL (#admin) o atajos públicos.
  // Solo se puede abrir mediante el gesto oculto en el logo del Footer (5 clics rápidos).
  useEffect(() => {
    const cleanSuspiciousUrl = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash === '#admin' || hash === '#panel-admin') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    cleanSuspiciousUrl()
    window.addEventListener('hashchange', cleanSuspiciousUrl)
    return () => window.removeEventListener('hashchange', cleanSuspiciousUrl)
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

  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(0)

  const verifyAdminPin = useCallback(
    async (inputPin) => {
      if (Date.now() < lockoutUntil) {
        return false
      }
      const cleanInput = (inputPin || '').trim()
      if (!cleanInput) return false

      const inputHash = await sha256Hex(cleanInput)
      const storedHash = localStorage.getItem(ADMIN_PIN_HASH_KEY) || DEFAULT_ADMIN_PIN_SHA256

      if (inputHash === storedHash) {
        setFailedAttempts(0)
        setIsAdminAuthenticated(true)
        sessionStorage.setItem('oasis_admin_unlocked', 'true')
        return true
      }

      const nextFailures = failedAttempts + 1
      setFailedAttempts(nextFailures)
      if (nextFailures >= 5) {
        setLockoutUntil(Date.now() + 3 * 60 * 1000) // Bloqueo de 3 minutos tras 5 intentos fallidos
      }
      return false
    },
    [failedAttempts, lockoutUntil]
  )

  const updateAdminPin = useCallback(async (newPin) => {
    if (newPin && newPin.trim().length >= 4) {
      const hashed = await sha256Hex(newPin.trim())
      localStorage.setItem(ADMIN_PIN_HASH_KEY, hashed)
      return true
    }
    return false
  }, [])

  // Cerrar el panel bloquea inmediatamente la sesión para que siempre pida clave al volver a abrir
  const closeAdminPanel = useCallback(() => {
    setIsAdminOpen(false)
    setIsAdminAuthenticated(false)
    sessionStorage.removeItem('oasis_admin_unlocked')
    if (window.location.hash.toLowerCase().includes('admin')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  // Timer de seguridad por inactividad (5 minutos sin mover mouse o escribir dentro del panel)
  useEffect(() => {
    if (!isAdminOpen || !isAdminAuthenticated) return

    let inactivityTimer
    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        setIsAdminAuthenticated(false)
        setIsAdminOpen(false)
        sessionStorage.removeItem('oasis_admin_unlocked')
      }, 5 * 60 * 1000) // 5 minutos
    }

    resetTimer()
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('click', resetTimer)

    return () => {
      clearTimeout(inactivityTimer)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('click', resetTimer)
    }
  }, [isAdminOpen, isAdminAuthenticated])

  const categories = useMemo(() => {
    return ['Todos', ...customCategories]
  }, [customCategories])

  const value = useMemo(
    () => ({
      products,
      categories,
      customCategories,
      addCategory,
      deleteCategory,
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
      failedAttempts,
      lockoutUntil,
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
      customCategories,
      addCategory,
      deleteCategory,
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
      failedAttempts,
      lockoutUntil,
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

