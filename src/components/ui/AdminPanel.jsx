import { useState, useRef } from 'react'
import { useCatalog } from '../../stores/CatalogContext'
import {
  autoClassifyProduct,
  autoGenerateCopy,
  parseBulkCatalogText,
  parseFilenameMetadata,
  processImageFile,
} from '../../utils/catalogClassifier'
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  supabaseSignIn,
  supabaseSignUp,
  uploadImageToSupabase,
  SUPABASE_SETUP_SQL,
} from '../../utils/supabaseClient'
import './AdminPanel.css'

const EMPTY_PRODUCT = {
  id: '',
  name: '',
  category: 'Labiales',
  price: 28.0,
  stock: 25,
  tagline: '',
  description: '',
  badge: 'Nuevo',
  icon: '💄',
  gradient: 'linear-gradient(135deg, #9b1b30, #d4637a)',
  image: '',
  images: [],
  includeInPack: true,
  shades: [
    { name: 'Carmesí', hex: '#9b1b30' },
    { name: 'Rosa Seda', hex: '#c9877f' },
  ],
}

const EMPTY_PACK = {
  id: '',
  name: '',
  desc: '',
  color: '#FFE3EC',
  borderColor: '#FF3399',
  extraPrice: 8.0,
  fixedPrice: 0,
  maxItems: 3,
}

export default function AdminPanel() {
  const {
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
  } = useCatalog()

  // Auth states
  const [authMode, setAuthMode] = useState('pin') // 'pin' | 'supabase'
  const [pinInput, setPinInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Navigation Tabs inside Admin
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' | 'single' | 'bulk' | 'cloud'

  // Single Product Form
  const [formData, setFormData] = useState(EMPTY_PRODUCT)
  const [isEditing, setIsEditing] = useState(false)
  const [newShadeName, setNewShadeName] = useState('')
  const [newShadeHex, setNewShadeHex] = useState('#d4637a')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toast, setToast] = useState('')

  // Bulk Upload States
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)
  const [replaceExistingOnBulk, setReplaceExistingOnBulk] = useState(false)

  // Pack / Combo Form States
  const [packForm, setPackForm] = useState(EMPTY_PACK)
  const [isEditingPack, setIsEditingPack] = useState(false)

  // Categories State
  const [newCategoryInput, setNewCategoryInput] = useState('')

  // Cloud Config States
  const currentSbConfig = getSupabaseConfig()
  const [sbUrl, setSbUrl] = useState(currentSbConfig.url)
  const [sbAnonKey, setSbAnonKey] = useState(currentSbConfig.anonKey)
  const [newPinValue, setNewPinValue] = useState('')
  const [copiedSql, setCopiedSql] = useState(false)

  const singleFileInputRef = useRef(null)
  const bulkPhotosInputRef = useRef(null)
  const bulkCsvInputRef = useRef(null)

  if (!isAdminOpen) return null

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3800)
  }

  /* ── Login Handlers ── */
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setAuthError(`Demasiados intentos fallidos. Espera ${secs} segundos para volver a intentar.`)
      return
    }

    if (authMode === 'pin') {
      setAuthLoading(true)
      const ok = await verifyAdminPin(pinInput)
      setAuthLoading(false)
      if (!ok) {
        setAuthError('Acceso denegado: Clave de administrador inválida.')
      } else {
        setPinInput('')
      }
      return
    }

    // Login con Supabase Auth
    setAuthLoading(true)
    try {
      await supabaseSignIn(emailInput, passwordInput)
      setIsAdminAuthenticated(true)
      sessionStorage.setItem('oasis_admin_unlocked', 'true')
    } catch (err) {
      setAuthError(err.message || 'Error al iniciar sesión con Supabase Auth')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegisterAdmin = async () => {
    if (!emailInput || !passwordInput) {
      setAuthError('Ingresa tu correo y una contraseña de mínimo 6 caracteres')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      await supabaseSignUp(emailInput, passwordInput)
      setIsAdminAuthenticated(true)
      sessionStorage.setItem('oasis_admin_unlocked', 'true')
      showToast('Cuenta de administrador creada en Supabase Auth')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  /* ── Single Product Handlers ── */
  const handleAutoCompleteProduct = () => {
    const rule = autoClassifyProduct(formData.name, formData.description)
    const copy = autoGenerateCopy(formData.name, rule.category)
    setFormData((prev) => ({
      ...prev,
      category: rule.category,
      icon: rule.icon,
      gradient: rule.gradient,
      tagline: prev.tagline || copy.tagline,
      description: prev.description || copy.description,
      shades: prev.shades?.length ? prev.shades : rule.defaultShades,
    }))
    showToast(`Clasificado automáticamente como ${rule.category} ${rule.icon}`)
  }

  const handleSingleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingImage(true)
    try {
      const uploadedUrls = []
      let extractedColors = []

      for (const file of files) {
        const processed = await processImageFile(file)
        if (processed.dominantColors.length > 0 && extractedColors.length === 0) {
          extractedColors = processed.dominantColors
        }

        try {
          const publicUrl = await uploadImageToSupabase(file)
          uploadedUrls.push(publicUrl)
        } catch {
          uploadedUrls.push(processed.dataUrl)
        }

        // Si el formulario aún no tiene nombre, extraerlo del nombre del archivo
        if (!formData.name.trim()) {
          const meta = parseFilenameMetadata(file.name)
          const rule = autoClassifyProduct(meta.name, '')
          const copy = autoGenerateCopy(meta.name, rule.category)
          setFormData((prev) => ({
            ...prev,
            name: meta.name,
            price: meta.price || prev.price,
            category: rule.category,
            icon: rule.icon,
            gradient: rule.gradient,
            tagline: prev.tagline || copy.tagline,
            description: prev.description || copy.description,
          }))
        }
      }

      setFormData((prev) => {
        const combinedImages = [...(prev.images || []), ...uploadedUrls]
        return {
          ...prev,
          image: combinedImages[0] || '',
          images: combinedImages,
          shades:
            extractedColors.length > 0 && prev.shades.length <= 2
              ? extractedColors
              : prev.shades,
        }
      })
      showToast('Foto(s) procesadas y colores detectados')
    } catch {
      showToast('No se pudo procesar la imagen seleccionada')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAddShade = () => {
    if (!newShadeName.trim()) return
    setFormData((prev) => ({
      ...prev,
      shades: [...prev.shades, { name: newShadeName.trim(), hex: newShadeHex }],
    }))
    setNewShadeName('')
  }

  const handleRemoveShade = (idx) => {
    setFormData((prev) => {
      const next = prev.shades.filter((_, i) => i !== idx)
      return {
        ...prev,
        shades: next.length > 0 ? next : [{ name: 'Tono Único', hex: '#d4637a' }],
      }
    })
  }

  const handleSaveSingleProduct = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Por favor escribe el nombre del producto')
      return
    }

    const rule = autoClassifyProduct(formData.name, formData.description, formData.category)
    const copy = autoGenerateCopy(formData.name, formData.category || rule.category)

    const productToSave = {
      ...formData,
      id: formData.id || `oasis-${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category || rule.category,
      price: Number(formData.price) || 0,
      stock: Math.max(0, Number(formData.stock ?? 25)),
      tagline: formData.tagline.trim() || copy.tagline,
      description: formData.description.trim() || copy.description,
      icon: formData.icon || rule.icon,
      gradient: formData.gradient || rule.gradient,
    }

    await addOrUpdateProduct(productToSave)
    showToast(isEditing ? '✓ Producto actualizado con éxito' : '✓ Producto publicado en el catálogo')
    setFormData(EMPTY_PRODUCT)
    setIsEditing(false)
    setActiveTab('inventory')
  }

  const handleEditProduct = (product) => {
    setFormData({
      ...EMPTY_PRODUCT,
      ...product,
      images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
    })
    setIsEditing(true)
    setActiveTab('single')
  }

  /* ── Bulk Upload & Auto-Classification Handlers ── */
  const handleAnalyzeBulkText = () => {
    const items = parseBulkCatalogText(bulkText)
    if (items.length === 0) {
      showToast('Escribe o pega al menos una línea de producto para clasificar')
      return
    }
    setBulkPreview((prev) => [...items, ...prev])
    showToast(`✨ ${items.length} productos clasificados automáticamente`)
  }

  const handleBulkCsvFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setBulkText(text)
    const items = parseBulkCatalogText(text)
    setBulkPreview((prev) => [...items, ...prev])
    showToast(`✨ Archivo leído: ${items.length} productos detectados y clasificados`)
  }

  const handleBulkPhotosUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsProcessingBulk(true)
    try {
      const generatedItems = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const meta = parseFilenameMetadata(file.name)
        const rule = autoClassifyProduct(meta.name, '')
        const copy = autoGenerateCopy(meta.name, rule.category)
        const processed = await processImageFile(file)

        let imageUrl = processed.dataUrl
        try {
          imageUrl = await uploadImageToSupabase(file)
        } catch {
          // usa DataURL optimizado
        }

        const shades =
          processed.dominantColors.length >= 2
            ? processed.dominantColors
            : rule.defaultShades

        generatedItems.push({
          id: `bulk-img-${Date.now()}-${i}`,
          name: meta.name,
          category: rule.category,
          price: meta.price,
          stock: 25,
          tagline: copy.tagline,
          description: copy.description,
          shades,
          defaultShade: 0,
          badge: 'Nuevo',
          icon: rule.icon,
          gradient: rule.gradient,
          image: imageUrl,
          images: [imageUrl],
          includeInPack: true,
        })
      }

      setBulkPreview((prev) => [...generatedItems, ...prev])
      showToast(`✨ ${generatedItems.length} fotos clasificadas con nombre, descripción y precio sugerido`)
    } finally {
      setIsProcessingBulk(false)
    }
  }

  const handleUpdateBulkItem = (index, field, value) => {
    setBulkPreview((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        const updated = { ...item, [field]: value }
        if (field === 'name' || field === 'description') {
          const rule = autoClassifyProduct(updated.name, updated.description)
          updated.category = rule.category
          updated.icon = rule.icon
          updated.gradient = rule.gradient
        }
        return updated
      })
    )
  }

  const handleBulkItemPhotoChange = async (index, file) => {
    if (!file) return
    const processed = await processImageFile(file)
    let url = processed.dataUrl
    try {
      url = await uploadImageToSupabase(file)
    } catch {
      // fallback dataUrl
    }
    setBulkPreview((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, image: url, images: [url] } : item))
    )
  }

  const handlePublishBulkCatalog = async () => {
    if (bulkPreview.length === 0) return
    setIsProcessingBulk(true)
    try {
      await addManyProducts(bulkPreview, replaceExistingOnBulk)
      showToast(`🎉 ¡${bulkPreview.length} productos publicados en el catálogo!`)
      setBulkPreview([])
      setBulkText('')
      setActiveTab('inventory')
    } finally {
      setIsProcessingBulk(false)
    }
  }

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2))
    const a = document.createElement('a')
    a.href = dataStr
    a.download = `catalogo-oasis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL)
    setCopiedSql(true)
    showToast('✓ Código SQL copiado al portapapeles')
    setTimeout(() => setCopiedSql(false), 3000)
  }

  const getProductFeaturedSlot = (prodId) => {
    const idStr = String(prodId)
    if (String(featuredSlots?.slot1Id) === idStr) return 1
    if (String(featuredSlots?.slot2Id) === idStr) return 2
    if (String(featuredSlots?.slot3Id) === idStr) return 3
    return 0
  }

  const handleToggleFeaturedInCatalog = (prod) => {
    const currentSlot = getProductFeaturedSlot(prod.id)
    if (currentSlot === 1) {
      updateFeaturedSlots({ slot1Id: '' })
      showToast(`Quitado "${prod.name}" de los destacados de inicio`)
    } else if (currentSlot === 2) {
      updateFeaturedSlots({ slot2Id: '' })
      showToast(`Quitado "${prod.name}" de los destacados de inicio`)
    } else if (currentSlot === 3) {
      updateFeaturedSlots({ slot3Id: '' })
      showToast(`Quitado "${prod.name}" de los destacados de inicio`)
    } else {
      // Buscar el primer espacio libre o rotar en el espacio 1, 2, 3
      const existsSlot1 = products.some((p) => String(p.id) === String(featuredSlots?.slot1Id))
      const existsSlot2 = products.some((p) => String(p.id) === String(featuredSlots?.slot2Id))
      const existsSlot3 = products.some((p) => String(p.id) === String(featuredSlots?.slot3Id))

      if (!featuredSlots?.slot1Id || !existsSlot1) {
        updateFeaturedSlots({ slot1Id: String(prod.id) })
        showToast(`⭐ "${prod.name}" fijado como Destacado #1 de Inicio`)
      } else if (!featuredSlots?.slot2Id || !existsSlot2) {
        updateFeaturedSlots({ slot2Id: String(prod.id) })
        showToast(`⭐ "${prod.name}" fijado como Destacado #2 de Inicio`)
      } else if (!featuredSlots?.slot3Id || !existsSlot3) {
        updateFeaturedSlots({ slot3Id: String(prod.id) })
        showToast(`⭐ "${prod.name}" fijado como Destacado #3 de Inicio`)
      } else {
        // Desplazar para poner este como el principal #1
        updateFeaturedSlots({
          slot1Id: String(prod.id),
          slot2Id: featuredSlots.slot1Id,
          slot3Id: featuredSlots.slot2Id,
        })
        showToast(`⭐ "${prod.name}" ahora se muestra como Destacado #1 al Inicio`)
      }
    }
  }

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Panel de Administración Oasis">
      <div className="admin-modal">
        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header__brand">
            <span className="admin-header__badge">PANEL OCULTO</span>
            <h2 className="admin-header__title">Oasis Makeup • Gestor de Catálogo</h2>
          </div>

          <div className="admin-header__actions">
            <span className={`admin-sync-pill admin-sync-pill--${syncStatus}`} title={syncMessage}>
              <span className="admin-sync-dot" />
              {syncStatus === 'cloud'
                ? 'En Línea • Sincronizado'
                : syncStatus === 'syncing'
                  ? 'Guardando cambios...'
                  : 'Guardado Automático'}
            </span>

            <button
              type="button"
              className="admin-close-btn"
              onClick={closeAdminPanel}
              aria-label="Cerrar panel de administrador"
            >
              ✕ Salir a la Tienda
            </button>
          </div>
        </header>

        {toast && <div className="admin-toast">{toast}</div>}

        {/* Si no ha iniciado sesión, mostrar pantalla de seguridad */}
        {!isAdminAuthenticated ? (
          <div className="admin-login-container">
            <div className="admin-login-card">
              <div className="admin-login-icon">🔒</div>
              <h3>Acceso Exclusivo Administrador</h3>
              <p>
                Ingresa tu clave de administrador para gestionar el catálogo, precios, categorías y combos de Oasis Makeup.
              </p>

              <form onSubmit={handleLoginSubmit} className="admin-login-form">
                <div className="admin-field">
                  <label htmlFor="admin-pin-input">Clave de Administrador:</label>
                  <input
                    id="admin-pin-input"
                    type="password"
                    placeholder="••••••••••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {authError && <p className="admin-login-error">{authError}</p>}

                <button type="submit" className="admin-btn-primary" disabled={authLoading}>
                  {authLoading ? 'Verificando...' : 'Desbloquear Panel'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Panel Desbloqueado */
          <div className="admin-body">
            {/* Barra de Navegación del Admin */}
            <nav className="admin-tabs">
              <button
                type="button"
                className={`admin-tab ${activeTab === 'inventory' ? 'admin-tab--active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                📦 Catálogo Actual ({products.length})
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === 'single' ? 'admin-tab--active' : ''}`}
                onClick={() => {
                  setIsEditing(false)
                  setFormData(EMPTY_PRODUCT)
                  setActiveTab('single')
                }}
              >
                ➕ Subir Producto (1 a 1)
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === 'bulk' ? 'admin-tab--active' : ''}`}
                onClick={() => setActiveTab('bulk')}
              >
                ⚡ Subida Masiva Inteligente
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === 'packs' ? 'admin-tab--active' : ''}`}
                onClick={() => {
                  setIsEditingPack(false)
                  setPackForm(EMPTY_PACK)
                  setActiveTab('packs')
                }}
              >
                🎁 Packs y Combos ({packTypes?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === 'categories' ? 'admin-tab--active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                🏷️ Categorías ({customCategories?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === 'cloud' ? 'admin-tab--active' : ''}`}
                onClick={() => setActiveTab('cloud')}
              >
                🔐 Seguridad y Clave
              </button>
            </nav>

            {/* ── PESTAÑA 1: INVENTARIO ACTUAL ── */}
            {activeTab === 'inventory' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>Productos Publicados ({products.length})</h3>
                    <p>
                      Edita precios, stock o fotos en tiempo real, y marca con <strong>⭐ Destacar en Inicio</strong> los productos que quieres mostrar en la portada principal.
                    </p>
                  </div>
                  <div className="admin-toolbar-btns">
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      onClick={() => {
                        setIsEditing(false)
                        setFormData(EMPTY_PRODUCT)
                        setActiveTab('single')
                      }}
                    >
                      + Nuevo Producto
                    </button>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => setActiveTab('bulk')}
                    >
                      ⚡ Subida Masiva de Catálogo
                    </button>
                    <button type="button" className="admin-btn-outline" onClick={handleExportJson}>
                      ⬇ Exportar Respaldo
                    </button>
                  </div>
                </div>

                <div className="admin-inventory-grid">
                  {products.map((prod) => {
                    const featuredSlotNum = getProductFeaturedSlot(prod.id)
                    const isFeatured = featuredSlotNum > 0
                    return (
                      <div
                        key={prod.id}
                        className={`admin-prod-card ${isFeatured ? 'admin-prod-card--featured' : ''}`}
                      >
                        <div
                          className="admin-prod-card__thumb"
                          style={{ background: prod.gradient }}
                        >
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} />
                          ) : (
                            <span>{prod.icon}</span>
                          )}
                          <span className="admin-prod-card__cat">{prod.category}</span>

                          <button
                            type="button"
                            className={`admin-star-btn ${isFeatured ? 'admin-star-btn--active' : ''}`}
                            onClick={() => handleToggleFeaturedInCatalog(prod)}
                            title={
                              isFeatured
                                ? `Mostrándose en Portada de Inicio (#${featuredSlotNum}). Clic para quitar.`
                                : 'Clic para destacar este producto al inicio de la página'
                            }
                          >
                            {isFeatured ? `⭐ En Inicio #${featuredSlotNum}` : '☆ Destacar en Inicio'}
                          </button>
                        </div>

                        <div className="admin-prod-card__info">
                          <h4>{prod.name}</h4>
                          <p className="admin-prod-card__desc">{prod.tagline || prod.description}</p>

                          <div className="admin-prod-card__meta">
                            <strong className="admin-prod-card__price">${Number(prod.price).toFixed(2)}</strong>
                            <span
                              className={`admin-stock-badge ${
                                prod.stock <= 0
                                  ? 'admin-stock-badge--out'
                                  : prod.stock <= 5
                                  ? 'admin-stock-badge--low'
                                  : ''
                              }`}
                            >
                              Stock: {prod.stock ?? 25} u.
                            </span>
                          </div>

                          <div className="admin-prod-card__shades">
                            {prod.shades?.map((s, idx) => (
                              <span
                                key={idx}
                                className="admin-shade-dot"
                                style={{ backgroundColor: s.hex }}
                                title={s.name}
                              />
                            ))}
                          </div>

                          <div className="admin-prod-card__actions">
                            <button
                              type="button"
                              className="admin-btn-edit"
                              onClick={() => handleEditProduct(prod)}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="admin-btn-delete"
                              onClick={() => deleteProduct(prod.id)}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── PESTAÑA 2: SUBIDA INDIVIDUAL (1 A 1) ── */}
            {activeTab === 'single' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>{isEditing ? `Editando: ${formData.name}` : 'Subir Producto Individual'}</h3>
                    <p>
                      Completa los detalles del cosmético o escribe el nombre y pulsa <strong>Autocompletar con IA</strong> para clasificar categoría, descripción y tonos automáticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-btn-magic"
                    onClick={handleAutoCompleteProduct}
                  >
                    ✨ Autocompletar Categoría y Descripción
                  </button>
                </div>

                <form className="admin-single-form" onSubmit={handleSaveSingleProduct}>
                  <div className="admin-form-columns">
                    {/* Columna Izquierda: Datos Principales */}
                    <div className="admin-form-col">
                      <div className="admin-field">
                        <label>Nombre del Producto *</label>
                        <input
                          type="text"
                          placeholder="Ej. Labial Líquido Mate Terciopelo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="admin-field-row">
                        <div className="admin-field">
                          <label>Categoría *</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                            {categories
                              .filter((c) => c !== 'Todos')
                              .map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="admin-field">
                          <label>Precio ($ USD) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                          />
                        </div>

                        <div className="admin-field">
                          <label>Cantidad Disponible (Stock) *</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="admin-field-row">
                        <div className="admin-field">
                          <label>Frase Corta / Subtítulo (Tagline)</label>
                          <input
                            type="text"
                            placeholder="Ej. Pigmento de ultra larga duración"
                            value={formData.tagline}
                            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Etiqueta Destacada (Badge)</label>
                          <input
                            type="text"
                            placeholder="Ej. Nuevo, Más Vendido, Oferta"
                            value={formData.badge || ''}
                            onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="admin-field">
                        <label>Descripción Detallada</label>
                        <textarea
                          rows="3"
                          placeholder="Describe beneficios, textura, acabado y duración..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.includeInPack !== false}
                          onChange={(e) =>
                            setFormData({ ...formData, includeInPack: e.target.checked })
                          }
                        />
                        <span>Permitir elegir este producto en la sección &ldquo;Arma tu Pack de Regalo&rdquo;</span>
                      </label>
                    </div>

                    {/* Columna Derecha: Fotos y Colores/Tonos */}
                    <div className="admin-form-col">
                      {/* Subida de Fotos */}
                      <div className="admin-field">
                        <label>Fotografías del Producto</label>
                        <div
                          className="admin-dropzone"
                          onClick={() => singleFileInputRef.current?.click()}
                        >
                          <input
                            ref={singleFileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={handleSingleImageUpload}
                          />
                          {formData.image ? (
                            <div className="admin-dropzone__preview">
                              <img src={formData.image} alt="Vista previa" />
                              <span>{uploadingImage ? 'Subiendo...' : 'Haz clic para añadir o cambiar foto'}</span>
                            </div>
                          ) : (
                            <div className="admin-dropzone__empty">
                              <span className="admin-dropzone__icon">📸</span>
                              <p>
                                {uploadingImage
                                  ? 'Procesando imagen...'
                                  : 'Haz clic aquí para subir fotos desde tu dispositivo'}
                              </p>
                              <small>Extrae automáticamente los tonos reales de la foto</small>
                            </div>
                          )}
                        </div>

                        <input
                          type="url"
                          placeholder="O pega directamente el enlace (URL) de una imagen..."
                          value={formData.image?.startsWith('data:') ? '' : formData.image}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              image: e.target.value,
                              images: e.target.value ? [e.target.value] : [],
                            })
                          }
                          className="admin-url-input"
                        />

                        {formData.images?.length > 1 && (
                          <div className="admin-gallery-thumbs">
                            {formData.images.map((imgUrl, idx) => (
                              <div key={idx} className="admin-gallery-thumb">
                                <img
                                  src={imgUrl}
                                  alt={`Foto ${idx + 1}`}
                                  onClick={() => setFormData({ ...formData, image: imgUrl })}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = formData.images.filter((_, i) => i !== idx)
                                    setFormData({
                                      ...formData,
                                      images: filtered,
                                      image: filtered[0] || '',
                                    })
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Colores / Tonos disponibles */}
                      <div className="admin-field">
                        <label>Colores / Tonos Disponibles ({formData.shades.length})</label>
                        <div className="admin-shades-adder">
                          <input
                            type="color"
                            value={newShadeHex}
                            onChange={(e) => setNewShadeHex(e.target.value)}
                            className="admin-color-picker"
                            title="Elegir color"
                          />
                          <input
                            type="text"
                            placeholder="Nombre del tono (ej. Rojo Rubí)"
                            value={newShadeName}
                            onChange={(e) => setNewShadeName(e.target.value)}
                          />
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={handleAddShade}
                          >
                            + Añadir Tono
                          </button>
                        </div>

                        <div className="admin-shades-list">
                          {formData.shades.map((s, idx) => (
                            <div key={idx} className="admin-shade-chip">
                              <input
                                type="color"
                                value={s.hex}
                                onChange={(e) => {
                                  const next = [...formData.shades]
                                  next[idx] = { ...next[idx], hex: e.target.value }
                                  setFormData({ ...formData, shades: next })
                                }}
                              />
                              <input
                                type="text"
                                value={s.name}
                                onChange={(e) => {
                                  const next = [...formData.shades]
                                  next[idx] = { ...next[idx], name: e.target.value }
                                  setFormData({ ...formData, shades: next })
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveShade(idx)}
                                title="Quitar tono"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-form-footer">
                    <button
                      type="button"
                      className="admin-btn-outline"
                      onClick={() => setActiveTab('inventory')}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="admin-btn-primary">
                      {isEditing ? '💾 Guardar Cambios del Producto' : '🚀 Publicar Producto en el Catálogo'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── PESTAÑA 3: SUBIDA MASIVA DEL CATÁLOGO CON CLASIFICACIÓN AUTOMÁTICA ── */}
            {activeTab === 'bulk' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>⚡ Subida Masiva con Clasificación Automática</h3>
                    <p>
                      Sube múltiples fotos de tu catálogo, importa un archivo CSV/Excel o pega tu listado de productos: el sistema detecta <strong>categoría, descripción, colores, fotos y precios</strong> automáticamente.
                    </p>
                  </div>
                </div>

                {/* 2 Tarjetas de Entrada Masiva */}
                <div className="admin-bulk-inputs">
                  {/* Opción A: Subir lote de fotos */}
                  <div
                    className="admin-bulk-box"
                    onClick={() => bulkPhotosInputRef.current?.click()}
                  >
                    <input
                      ref={bulkPhotosInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleBulkPhotosUpload}
                    />
                    <span className="admin-bulk-box__icon">🖼️</span>
                    <h4>Opción 1: Subir Lote de Fotos del Catálogo</h4>
                    <p>
                      Selecciona 5, 20 o 100 fotos de productos a la vez. Extraemos el nombre y precio del archivo, detectamos los tonos reales de la imagen y redactamos la descripción automáticamente.
                    </p>
                    <span className="admin-btn-secondary">
                      {isProcessingBulk ? 'Analizando fotos...' : 'Seleccionar Múltiples Fotos'}
                    </span>
                  </div>

                  {/* Opción B: Archivo CSV / Excel o Texto pegado */}
                  <div className="admin-bulk-box admin-bulk-box--text">
                    <div className="admin-bulk-box__header">
                      <h4>Opción 2: Pegar Desde Excel / WhatsApp / PDF o Subir CSV</h4>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => bulkCsvInputRef.current?.click()}
                      >
                        📄 Subir archivo .CSV / .TXT
                      </button>
                      <input
                        ref={bulkCsvInputRef}
                        type="file"
                        accept=".csv,.txt,.tsv"
                        hidden
                        onChange={handleBulkCsvFile}
                      />
                    </div>

                    <textarea
                      rows="5"
                      className="admin-auto-textarea admin-bulk-paste-textarea"
                      placeholder={`Pega aquí tus productos (uno por línea o copiado de Excel). Ejemplo:\nLabial Mate Velvet - Rojo sedoso larga duración - $18.50\nBase Sérum Luminosa, Cobertura cristal con ácido hialurónico, $32.00, 20, Porcelana, Arena\nPaleta de 12 Sombras Sunset - Tonos cálidos y dorados - $45.00`}
                      value={bulkText}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.max(120, el.scrollHeight)}px`;
                        }
                      }}
                      onChange={(e) => {
                        setBulkText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(120, e.target.scrollHeight)}px`;
                      }}
                    />

                    <button
                      type="button"
                      className="admin-btn-magic"
                      onClick={handleAnalyzeBulkText}
                    >
                      ✨ Clasificar y Generar Vista Previa Automática
                    </button>
                  </div>
                </div>

                {/* Tabla Interactiva de Revisión antes de Publicar */}
                {bulkPreview.length > 0 && (
                  <div className="admin-bulk-preview">
                    <div className="admin-bulk-preview__bar">
                      <div>
                        <h4>Vista Previa Clasificada ({bulkPreview.length} productos listos)</h4>
                        <p>Puedes ajustar cualquier foto, precio, categoría o descripción antes de publicar.</p>
                      </div>

                      <div className="admin-bulk-preview__actions">
                        <label className="admin-checkbox-label">
                          <input
                            type="checkbox"
                            checked={replaceExistingOnBulk}
                            onChange={(e) => setReplaceExistingOnBulk(e.target.checked)}
                          />
                          <span>Reemplazar catálogo anterior</span>
                        </label>
                        <button
                          type="button"
                          className="admin-btn-outline"
                          onClick={() => setBulkPreview([])}
                        >
                          Limpiar Lista
                        </button>
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={handlePublishBulkCatalog}
                          disabled={isProcessingBulk}
                        >
                          🚀 Publicar {bulkPreview.length} Productos Ahora
                        </button>
                      </div>
                    </div>

                    <div className="admin-bulk-table-wrap">
                      <table className="admin-bulk-table">
                        <thead>
                          <tr>
                            <th>Foto</th>
                            <th>Nombre del Producto</th>
                            <th>Categoría (Auto)</th>
                            <th>Descripción (Auto)</th>
                            <th>Precio ($)</th>
                            <th>Stock</th>
                            <th>Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.map((item, idx) => (
                            <tr key={item.id}>
                              <td>
                                <label className="admin-table-photo" title="Cambiar foto">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) =>
                                      handleBulkItemPhotoChange(idx, e.target.files?.[0])
                                    }
                                  />
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} />
                                  ) : (
                                    <span>{item.icon} 📸</span>
                                  )}
                                </label>
                              </td>
                              <td className="admin-bulk-col-name">
                                <textarea
                                  rows={2}
                                  className="admin-auto-textarea"
                                  value={item.name}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = 'auto';
                                      el.style.height = `${el.scrollHeight}px`;
                                    }
                                  }}
                                  onChange={(e) => {
                                    handleUpdateBulkItem(idx, 'name', e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                />
                              </td>
                              <td className="admin-bulk-col-category">
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    handleUpdateBulkItem(idx, 'category', e.target.value)
                                  }
                                >
                                  {categories
                                    .filter((c) => c !== 'Todos')
                                    .map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td className="admin-bulk-col-desc">
                                <textarea
                                  rows={2}
                                  className="admin-auto-textarea"
                                  value={item.description}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = 'auto';
                                      el.style.height = `${el.scrollHeight}px`;
                                    }
                                  }}
                                  onChange={(e) => {
                                    handleUpdateBulkItem(idx, 'description', e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateBulkItem(idx, 'price', parseFloat(e.target.value) || 0)
                                  }
                                  className="admin-input-narrow"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.stock}
                                  onChange={(e) =>
                                    handleUpdateBulkItem(idx, 'stock', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="admin-input-narrow"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-btn-delete"
                                  onClick={() =>
                                    setBulkPreview(bulkPreview.filter((_, i) => i !== idx))
                                  }
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PESTAÑA PACKS Y COMBOS PERSONALIZADOS ── */}
            {activeTab === 'packs' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>🎁 Administrar Tipos de Packs y Combos de Regalo</h3>
                    <p>
                      Configura los tipos de cajas o combos disponibles, cuántos cosméticos puede elegir el cliente en cada uno y su precio (costo de caja o precio fijo de combo).
                    </p>
                  </div>
                </div>

                <div className="admin-cloud-grid">
                  {/* Formulario para crear / editar tipo de Pack */}
                  <div className="admin-cloud-card">
                    <h4>{isEditingPack ? `✏️ Editando: ${packForm.name}` : '➕ Crear Nuevo Tipo de Pack / Combo'}</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!packForm.name.trim()) {
                          showToast('Escribe el nombre del Pack o Combo')
                          return
                        }
                        addOrUpdatePackType(packForm)
                        showToast(
                          isEditingPack
                            ? '✓ Pack actualizado en vivo'
                            : '✓ Nuevo Pack agregado a la tienda'
                        )
                        setPackForm(EMPTY_PACK)
                        setIsEditingPack(false)
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1rem' }}
                    >
                      <div className="admin-field">
                        <label>Nombre del Pack / Caja / Combo *</label>
                        <input
                          type="text"
                          placeholder="Ej. Pack Dúo Amor / Caja Oasis Pink"
                          value={packForm.name}
                          onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="admin-field">
                        <label>Descripción corta del empaque</label>
                        <input
                          type="text"
                          placeholder="Ej. Estuche rígido con lazo satinado y tarjeta impresa"
                          value={packForm.desc}
                          onChange={(e) => setPackForm({ ...packForm, desc: e.target.value })}
                        />
                      </div>

                      <div className="admin-field-row">
                        <div className="admin-field">
                          <label>¿Cuántos productos lleva? *</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={packForm.maxItems}
                            onChange={(e) =>
                              setPackForm({ ...packForm, maxItems: parseInt(e.target.value, 10) || 1 })
                            }
                            required
                          />
                        </div>

                        <div className="admin-field">
                          <label>Precio de la Caja (+$ USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={packForm.extraPrice}
                            onChange={(e) => setPackForm({ ...packForm, extraPrice: e.target.value })}
                          />
                        </div>

                        <div className="admin-field">
                          <label>O Precio Fijo Combo ($ USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0 = sumar productos"
                            value={packForm.fixedPrice}
                            onChange={(e) => setPackForm({ ...packForm, fixedPrice: e.target.value })}
                          />
                        </div>
                      </div>

                      <small style={{ color: '#6b5b63', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        💡 <strong>Nota sobre precios:</strong> Si dejas <em>Precio Fijo Combo</em> en <strong>0</strong>, el sistema cobrará la suma de los cosméticos elegidos + el <em>Precio de la Caja</em>. Si pones un valor mayor a 0 en <em>Precio Fijo Combo</em> (ej. $45.00), ese será el precio total cerrado del combo sin importar qué productos elija.
                      </small>

                      <div className="admin-field-row">
                        <div className="admin-field">
                          <label>Color de Fondo Muestra</label>
                          <input
                            type="color"
                            value={packForm.color}
                            onChange={(e) => setPackForm({ ...packForm, color: e.target.value })}
                            className="admin-color-picker"
                          />
                        </div>
                        <div className="admin-field">
                          <label>Color del Borde / Cinta</label>
                          <input
                            type="color"
                            value={packForm.borderColor}
                            onChange={(e) => setPackForm({ ...packForm, borderColor: e.target.value })}
                            className="admin-color-picker"
                          />
                        </div>
                      </div>

                      <div className="admin-toolbar-btns" style={{ marginTop: '0.5rem' }}>
                        {isEditingPack && (
                          <button
                            type="button"
                            className="admin-btn-outline"
                            onClick={() => {
                              setIsEditingPack(false)
                              setPackForm(EMPTY_PACK)
                            }}
                          >
                            Cancelar Edición
                          </button>
                        )}
                        <button type="submit" className="admin-btn-primary">
                          {isEditingPack ? '💾 Guardar Cambios del Pack' : '➕ Agregar Tipo de Pack'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Lista de Packs actuales */}
                  <div className="admin-cloud-card">
                    <h4>📦 Tipos de Packs Activos ({packTypes?.length || 0})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1rem' }}>
                      {packTypes?.map((box) => {
                        const isFixed = Number(box.fixedPrice) > 0
                        return (
                          <div
                            key={box.id}
                            style={{
                              padding: '1.1rem',
                              borderRadius: '16px',
                              border: '1px solid rgba(247, 37, 133, 0.18)',
                              background: '#fffafd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                              <span
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: box.color || '#FFE3EC',
                                  border: `3px solid ${box.borderColor || '#FF3399'}`,
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <strong style={{ fontSize: '1rem', display: 'block' }}>{box.name}</strong>
                                <span style={{ fontSize: '0.82rem', color: '#6b5b63', display: 'block' }}>
                                  {box.desc}
                                </span>
                                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                                  <span className="admin-stock-badge">
                                    Lleva hasta {box.maxItems ?? 3} producto(s)
                                  </span>
                                  <span
                                    className="admin-stock-badge"
                                    style={{ background: '#fce7f3', color: '#be185d' }}
                                  >
                                    {isFixed
                                      ? `Precio Fijo Combo: $${Number(box.fixedPrice).toFixed(2)}`
                                      : `Caja +$${Number(box.extraPrice || 0).toFixed(2)} (más productos)`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="admin-btn-edit"
                                onClick={() => {
                                  setPackForm({
                                    id: box.id,
                                    name: box.name,
                                    desc: box.desc || '',
                                    color: box.color || '#FFE3EC',
                                    borderColor: box.borderColor || '#FF3399',
                                    extraPrice: box.extraPrice ?? 8,
                                    fixedPrice: box.fixedPrice ?? 0,
                                    maxItems: box.maxItems ?? 3,
                                  })
                                  setIsEditingPack(true)
                                }}
                              >
                                ✏️ Editar
                              </button>
                              {packTypes.length > 1 && (
                                <button
                                  type="button"
                                  className="admin-btn-delete"
                                  onClick={() => {
                                    deletePackType(box.id)
                                    showToast('Tipo de pack eliminado')
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PESTAÑA DE CATEGORÍAS DEL CATÁLOGO ── */}
            {activeTab === 'categories' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>🏷️ Administrar Categorías del Catálogo</h3>
                    <p>
                      Agrega nuevas categorías (ej. <em>Cuidado Facial, Brochas, Delineadores, Perfumes</em>) o quita las que no utilices. Los botones de filtro de la tienda y los selectores de subida se actualizan al instante.
                    </p>
                  </div>
                </div>

                <div className="admin-cloud-grid">
                  {/* Agregar nueva categoría */}
                  <div className="admin-cloud-card">
                    <h4>➕ Agregar Nueva Categoría</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!newCategoryInput.trim()) return
                        const added = addCategory(newCategoryInput)
                        if (added) {
                          showToast(`✓ Categoría "${newCategoryInput.trim()}" agregada al catálogo`)
                          setNewCategoryInput('')
                        } else {
                          showToast('Esa categoría ya existe en la lista')
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1rem' }}
                    >
                      <div className="admin-field">
                        <label>Nombre de la Categoría *</label>
                        <input
                          type="text"
                          placeholder="Ej. Cuidado Facial, Brochas, Iluminadores..."
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          required
                        />
                      </div>

                      <button type="submit" className="admin-btn-primary" style={{ alignSelf: 'flex-start' }}>
                        ➕ Crear Categoría
                      </button>
                    </form>
                  </div>

                  {/* Listado de categorías activas */}
                  <div className="admin-cloud-card">
                    <h4>📋 Categorías Activas ({customCategories?.length || 0})</h4>
                    <p style={{ fontSize: '0.84rem', color: '#6b5b63', marginBottom: '1rem' }}>
                      El botón <strong>Todos</strong> siempre se muestra fijo al inicio del catálogo.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {customCategories?.map((catName) => {
                        const count = products.filter((p) => p.category === catName).length
                        return (
                          <div
                            key={catName}
                            style={{
                              padding: '0.9rem 1.15rem',
                              borderRadius: '14px',
                              border: '1px solid rgba(247, 37, 133, 0.16)',
                              background: '#fffafd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '0.98rem' }}>{catName}</strong>
                              <span
                                style={{
                                  marginLeft: '0.65rem',
                                  fontSize: '0.76rem',
                                  padding: '2px 9px',
                                  borderRadius: '999px',
                                  background: '#fce7f3',
                                  color: '#be185d',
                                  fontWeight: 600,
                                }}
                              >
                                {count} producto(s)
                              </span>
                            </div>

                            {customCategories.length > 1 && (
                              <button
                                type="button"
                                className="admin-btn-delete"
                                style={{ flex: '0 0 auto', padding: '0.45rem 0.9rem' }}
                                onClick={() => {
                                  if (deleteCategory(catName)) {
                                    showToast(`Categoría "${catName}" eliminada`)
                                  }
                                }}
                              >
                                🗑️ Quitar
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PESTAÑA DE SEGURIDAD Y CAMBIO DE CLAVE ── */}
            {activeTab === 'cloud' && (
              <div className="admin-section">
                <div className="admin-section__toolbar">
                  <div>
                    <h3>🔐 Seguridad del Panel y Cambio de Clave</h3>
                    <p>
                      Administra tu clave de acceso y las opciones de protección de la tienda.
                    </p>
                  </div>
                </div>

                <div className="admin-cloud-grid">
                  <div className="admin-cloud-card">
                    <h3>🔑 Cambiar Clave de Administrador</h3>
                    <p>
                      Escribe una nueva clave (mínimo 4 caracteres) para reemplazar la clave actual. Tu clave se guarda cifrada de forma segura.
                    </p>

                    <div className="admin-field" style={{ marginTop: '1.25rem' }}>
                      <label>Nueva Clave de Administrador</label>
                      <div className="admin-shades-adder">
                        <input
                          type="password"
                          placeholder="Escribe tu nueva clave (mín. 4 caracteres)"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                        />
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={async () => {
                            if (await updateAdminPin(newPinValue)) {
                              setNewPinValue('')
                              showToast('✓ Nueva clave guardada con éxito')
                            } else {
                              showToast('La clave debe tener al menos 4 caracteres')
                            }
                          }}
                        >
                          Guardar Nueva Clave
                        </button>
                      </div>
                    </div>

                    <hr style={{ margin: '1.5rem 0', opacity: 0.15 }} />

                    <h4>Cerrar Sesión o Respaldar</h4>
                    <div className="admin-toolbar-btns" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="admin-btn-delete"
                        onClick={() => {
                          setIsAdminAuthenticated(false)
                          sessionStorage.removeItem('oasis_admin_unlocked')
                          closeAdminPanel()
                        }}
                      >
                        🔒 Cerrar Sesión y Salir Ahora
                      </button>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={handleExportJson}
                      >
                        💾 Descargar Copia de Seguridad
                      </button>
                    </div>
                  </div>

                  <div className="admin-cloud-card">
                    <h3>🛡️ Reglas de Protección Activas</h3>
                    <p>
                      Tu panel cuenta con medidas automáticas para que ningún visitante de la tienda pueda entrar sin autorización:
                    </p>
                    <ul className="admin-secret-list">
                      <li>
                        <strong>Entrada secreta:</strong> El panel solo se abre haciendo <strong>5 clics seguidos</strong> sobre el logo <em>OASIS MAKEUP</em> al final de la página (pie de página).
                      </li>
                      <li>
                        <strong>Cierre automático:</strong> Cada vez que sales del panel o pasan <strong>5 minutos sin actividad</strong>, la sesión se bloquea automáticamente y vuelve a pedir la clave.
                      </li>
                      <li>
                        <strong>Bloqueo por intentos fallidos:</strong> Si alguien se equivoca de clave 5 veces seguidas, el acceso se bloquea temporalmente por seguridad.
                      </li>
                    </ul>

                    <hr style={{ margin: '1.5rem 0', opacity: 0.15 }} />

                    <h4>Mantenimiento de Catálogo</h4>
                    <div className="admin-toolbar-btns" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => {
                          refreshFromCloud()
                          showToast('✓ Catálogo actualizado desde la nube')
                        }}
                      >
                        🔄 Recargar Datos de la Tienda
                      </button>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => {
                          restoreDefaultCatalog()
                          showToast('Catálogo de demostración restaurado')
                        }}
                      >
                        Restaurar Productos de Ejemplo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

