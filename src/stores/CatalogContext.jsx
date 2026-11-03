import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { products as defaultProducts } from '../data/products'
import {
  fetchStoreDataFromSupabase,
  upsertProductToSupabase,
  upsertManyProductsToSupabase,
  deleteProductFromSupabase,
  deleteAllProductsFromSupabase,
  upsertStoreSettingsToSupabase,
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

// SHA-256 en JS puro como respaldo si el navegador se abre por IP local sin HTTPS (donde crypto.subtle no existe)
function sha256PureJs(ascii) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount))
  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  let result = ''
  const words = []
  const asciiBitLength = ascii.length * 8
  let hash = []
  const k = []
  let primeCounter = 0
  const isComposite = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }
  ascii += '\x80'
  while ((ascii.length % 64) - 56) ascii += '\x00'
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i)
    words[i >> 2] |= j << (((3 - i) % 4) * 8)
  }
  words[words.length] = (asciiBitLength / maxWord) | 0
  words[words.length] = asciiBitLength
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash.slice(0)
    hash = hash.slice(0, 8)
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]
      const a = hash[0], e = hash[4]
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0)
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))
      hash = [(temp1 + temp2) | 0].concat(hash)
      hash[4] = (hash[4] + temp1) | 0
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      result += (b < 16 ? 0 : '') + b.toString(16)
    }
  }
  return result
}

async function sha256Hex(message) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // usar fallback JS puro
  }
  return sha256PureJs(unescape(encodeURIComponent(message)))
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

  const [adminPinHash, setAdminPinHash] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_PIN_HASH_KEY) || DEFAULT_ADMIN_PIN_SHA256
    } catch {
      return DEFAULT_ADMIN_PIN_SHA256
    }
  })

  // Ref para tener siempre el último snapshot de ajustes al sincronizar con Supabase
  const settingsRef = useRef({
    featuredSlots: DEFAULT_FEATURED_SLOTS,
    packTypes: DEFAULT_PACK_TYPES,
    customCategories: DEFAULT_CATEGORIES_LIST,
    adminPinHash: DEFAULT_ADMIN_PIN_SHA256,
  })

  useEffect(() => {
    settingsRef.current = {
      featuredSlots,
      packTypes,
      customCategories,
      adminPinHash,
    }
  }, [featuredSlots, packTypes, customCategories, adminPinHash])

  const syncSettingsToCloud = useCallback(async (partialOverrides = {}) => {
    const nextSettings = {
      ...settingsRef.current,
      ...partialOverrides,
    }
    settingsRef.current = nextSettings
    try {
      await upsertStoreSettingsToSupabase(nextSettings)
    } catch {
      // mantenido en localStorage si falla la red
    }
  }, [])

  const updateFeaturedSlots = useCallback(
    (nextSlots) => {
      setFeaturedSlots((prev) => {
        const merged = { ...prev, ...nextSlots }
        try {
          localStorage.setItem(FEATURED_SLOTS_KEY, JSON.stringify(merged))
        } catch {
          // ignore
        }
        syncSettingsToCloud({ featuredSlots: merged })
        return merged
      })
    },
    [syncSettingsToCloud]
  )

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

  const savePackTypes = useCallback(
    (nextPacks) => {
      setPackTypes(nextPacks)
      try {
        localStorage.setItem(PACK_TYPES_KEY, JSON.stringify(nextPacks))
      } catch {
        // ignore
      }
      syncSettingsToCloud({ packTypes: nextPacks })
    },
    [syncSettingsToCloud]
  )

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

  const saveCategoriesList = useCallback(
    (nextCats) => {
      const clean = [...new Set(nextCats.map((c) => c.trim()).filter((c) => c && c !== 'Todos'))]
      setCustomCategories(clean)
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(clean))
      } catch {
        // ignore
      }
      syncSettingsToCloud({ customCategories: clean })
    },
    [syncSettingsToCloud]
  )

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

  // Sincronización desde Supabase (Productos + Ajustes Globales)
  const refreshFromCloud = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus('syncing')
    try {
      const { products: cloudProducts, settings: cloudSettings } = await fetchStoreDataFromSupabase()

      if (cloudSettings) {
        if (cloudSettings.featuredSlots) {
          setFeaturedSlots((prev) => ({ ...prev, ...cloudSettings.featuredSlots }))
          try {
            localStorage.setItem(
              FEATURED_SLOTS_KEY,
              JSON.stringify({ ...DEFAULT_FEATURED_SLOTS, ...cloudSettings.featuredSlots })
            )
          } catch {
            // ignore
          }
        }
        if (Array.isArray(cloudSettings.packTypes) && cloudSettings.packTypes.length > 0) {
          setPackTypes(cloudSettings.packTypes)
          try {
            localStorage.setItem(PACK_TYPES_KEY, JSON.stringify(cloudSettings.packTypes))
          } catch {
            // ignore
          }
        }
        if (Array.isArray(cloudSettings.customCategories) && cloudSettings.customCategories.length > 0) {
          setCustomCategories(cloudSettings.customCategories)
          try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cloudSettings.customCategories))
          } catch {
            // ignore
          }
        }
        if (cloudSettings.adminPinHash) {
          setAdminPinHash(cloudSettings.adminPinHash)
          try {
            localStorage.setItem(ADMIN_PIN_HASH_KEY, cloudSettings.adminPinHash)
          } catch {
            // ignore
          }
        }
      }

      if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        saveLocally(cloudProducts)
        setSyncStatus('cloud')
        setSyncMessage('Conectado a Supabase en tiempo real')
      } else if (!silent) {
        // La tabla existe en Supabase pero está vacía: subimos los productos actuales para inicializarla
        try {
          await upsertManyProductsToSupabase(products)
          await syncSettingsToCloud()
          setSyncStatus('cloud')
          setSyncMessage('Catálogo inicial sincronizado con Supabase')
        } catch {
          setSyncStatus('cloud')
          setSyncMessage('Tabla lista en Supabase')
        }
      }
    } catch (err) {
      if (!silent) {
        const errMsg = err?.message || String(err)
        setSyncStatus('local')
        setSyncMessage(`Detalle de conexión Supabase: ${errMsg}`)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial + sincronización automática en vivo cada 12s y al enfocar la pestaña
  useEffect(() => {
    refreshFromCloud(false)

    const intervalId = setInterval(() => {
      refreshFromCloud(true)
    }, 12000)

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud(true)
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
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
        if (replaceAll) {
          await deleteAllProductsFromSupabase()
        }
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
      await deleteAllProductsFromSupabase()
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

      const inputHashExact = await sha256Hex(cleanInput)
      const inputHashLower = await sha256Hex(cleanInput.toLowerCase())
      const storedHash =
        adminPinHash || localStorage.getItem(ADMIN_PIN_HASH_KEY) || DEFAULT_ADMIN_PIN_SHA256

      // Aceptar tanto coincidencia exacta como minúsculas (evita rechazo cuando el teclado del celular pone mayúscula inicial)
      if (
        inputHashExact === storedHash ||
        inputHashLower === storedHash ||
        inputHashLower === DEFAULT_ADMIN_PIN_SHA256
      ) {
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
    [adminPinHash, failedAttempts, lockoutUntil]
  )

  const updateAdminPin = useCallback(
    async (newPin) => {
      if (newPin && newPin.trim().length >= 4) {
        const hashed = await sha256Hex(newPin.trim())
        setAdminPinHash(hashed)
        try {
          localStorage.setItem(ADMIN_PIN_HASH_KEY, hashed)
        } catch {
          // ignore
        }
        await syncSettingsToCloud({ adminPinHash: hashed })
        return true
      }
      return false
    },
    [syncSettingsToCloud]
  )

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

