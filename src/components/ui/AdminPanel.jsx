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

export default function AdminPanel() {
  const {
    products,
    categories,
    featuredSlots,
    updateFeaturedSlots,
    isAdminOpen,
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

    if (authMode === 'pin') {
      const ok = verifyAdminPin(pinInput)
      if (!ok) {
        setAuthError('Clave o PIN incorrecto. (Por defecto: oasis2026)')
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
                ? 'Supabase Conectado'
                : syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : 'Guardado Local + Nube'}
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
                Ingresa tu clave maestra o inicia sesión con tu cuenta de Supabase Auth para gestionar el catálogo de Oasis Makeup.
              </p>

              <div className="admin-login-tabs">
                <button
                  type="button"
                  className={authMode === 'pin' ? 'active' : ''}
                  onClick={() => setAuthMode('pin')}
                >
                  Clave Rápida (PIN)
                </button>
                <button
                  type="button"
                  className={authMode === 'supabase' ? 'active' : ''}
                  onClick={() => setAuthMode('supabase')}
                >
                  Supabase Auth (Email)
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="admin-login-form">
                {authMode === 'pin' ? (
                  <div className="admin-field">
                    <label htmlFor="admin-pin-input">Clave de Administrador:</label>
                    <input
                      id="admin-pin-input"
                      type="password"
                      placeholder="Ingresa tu clave (ej. oasis2026)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <div className="admin-field">
                      <label htmlFor="admin-email-input">Correo Electrónico:</label>
                      <input
                        id="admin-email-input"
                        type="email"
                        placeholder="admin@oasismakeup.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="admin-pass-input">Contraseña:</label>
                      <input
                        id="admin-pass-input"
                        type="password"
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {authError && <p className="admin-login-error">{authError}</p>}

                <button type="submit" className="admin-btn-primary" disabled={authLoading}>
                  {authLoading ? 'Verificando...' : 'Desbloquear Panel'}
                </button>

                {authMode === 'supabase' && (
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={handleRegisterAdmin}
                    disabled={authLoading}
                  >
                    Crear primer usuario Admin en Supabase
                  </button>
                )}
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
                className={`admin-tab ${activeTab === 'cloud' ? 'admin-tab--active' : ''}`}
                onClick={() => setActiveTab('cloud')}
              >
                ☁️ Base de Datos Supabase
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
                            <option value="Cuidado Facial">Cuidado Facial</option>
                            <option value="Accesorios">Accesorios</option>
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
                      placeholder={`Pega aquí tus productos (uno por línea o copiado de Excel). Ejemplo:\nLabial Mate Velvet - Rojo sedoso larga duración - $18.50\nBase Sérum Luminosa, Cobertura cristal con ácido hialurónico, $32.00, 20, Porcelana, Arena\nPaleta de 12 Sombras Sunset - Tonos cálidos y dorados - $45.00`}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
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
                              <td>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateBulkItem(idx, 'name', e.target.value)
                                  }
                                />
                              </td>
                              <td>
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
                              <td>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    handleUpdateBulkItem(idx, 'description', e.target.value)
                                  }
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

            {/* ── PESTAÑA 4: CONEXIÓN SUPABASE Y SEGURIDAD ── */}
            {activeTab === 'cloud' && (
              <div className="admin-section">
                <div className="admin-cloud-grid">
                  <div className="admin-cloud-card">
                    <h3>☁️ Proyecto Supabase Vinculado</h3>
                    <p>
                      Tu proyecto <code>sbhtmqctxvaxtflzwndm</code> ya está conectado. Para terminar de activar la tabla <code>products</code> y el bucket de fotos en tu cuenta de Supabase, copia este bloque SQL y ejecútalo una sola vez en el <strong>SQL Editor</strong> de tu panel de Supabase:
                    </p>

                    <div className="admin-sql-box">
                      <pre>{SUPABASE_SETUP_SQL}</pre>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleCopySql}
                      >
                        {copiedSql ? '✓ ¡SQL Copiado!' : '📋 Copiar SQL para Supabase'}
                      </button>
                    </div>

                    <div className="admin-field" style={{ marginTop: '1rem' }}>
                      <label>Project URL (o pega el link de tu navegador en Supabase)</label>
                      <input
                        type="text"
                        placeholder="https://xxxxxxxx.supabase.co"
                        value={sbUrl}
                        onChange={(e) => setSbUrl(e.target.value)}
                      />
                    </div>
                    <div className="admin-field">
                      <label>Anon / Public Key</label>
                      <input
                        type="password"
                        value={sbAnonKey}
                        onChange={(e) => {
                          const val = e.target.value
                          setSbAnonKey(val)
                          try {
                            if (val.startsWith('eyJ')) {
                              const payload = JSON.parse(
                                atob(val.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
                              )
                              if (payload.ref) {
                                setSbUrl(`https://${payload.ref}.supabase.co`)
                              }
                            }
                          } catch {
                            // ignore
                          }
                        }}
                      />
                    </div>
                    <div className="admin-toolbar-btns">
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => {
                          const saved = saveSupabaseConfig(sbUrl, sbAnonKey)
                          setSbUrl(saved.url)
                          refreshFromCloud()
                          showToast('Configuración de Supabase actualizada y sincronizada')
                        }}
                      >
                        🔄 Guardar y Sincronizar con Supabase
                      </button>
                    </div>
                    {syncMessage && (
                      <p
                        style={{
                          marginTop: '0.75rem',
                          fontSize: '0.8rem',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '10px',
                          background: syncStatus === 'cloud' ? '#e8f5e9' : '#fff3e0',
                          color: syncStatus === 'cloud' ? '#1b5e20' : '#b45309',
                          fontWeight: 600,
                        }}
                      >
                        Estado: {syncMessage}
                      </p>
                    )}
                  </div>

                  <div className="admin-cloud-card">
                    <h3>🔐 Seguridad del Panel Oculto</h3>
                    <p>
                      <strong>¿Cómo abrir este panel cuando está oculto?</strong>
                    </p>
                    <ul className="admin-secret-list">
                      <li>
                        <strong>Opción 1:</strong> Hacer <strong>5 clics seguidos</strong> sobre el logo de <em>OASIS MAKEUP</em> al final de la página (Footer).
                      </li>
                      <li>
                        <strong>Opción 2:</strong> Agregar <code>#admin</code> al final del link de tu página.
                      </li>
                      <li>
                        <strong>Opción 3:</strong> Presionar <code>Ctrl + Shift + A</code> en el teclado.
                      </li>
                    </ul>

                    <div className="admin-field" style={{ marginTop: '1.25rem' }}>
                      <label>Cambiar Clave / PIN de Administrador</label>
                      <div className="admin-shades-adder">
                        <input
                          type="password"
                          placeholder="Nueva clave (mín. 4 caracteres)"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                        />
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={() => {
                            if (updateAdminPin(newPinValue)) {
                              setNewPinValue('')
                              showToast('✓ Nueva clave de administrador guardada')
                            } else {
                              showToast('La clave debe tener al menos 4 caracteres')
                            }
                          }}
                        >
                          Guardar PIN
                        </button>
                      </div>
                    </div>

                    <hr style={{ margin: '1.5rem 0', opacity: 0.15 }} />

                    <h4>Acciones de Mantenimiento</h4>
                    <div className="admin-toolbar-btns" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => {
                          restoreDefaultCatalog()
                          showToast('Catálogo base restaurado')
                        }}
                      >
                        Restaurar 6 Productos de Demostración
                      </button>
                      <button
                        type="button"
                        className="admin-btn-delete"
                        onClick={() => {
                          setIsAdminAuthenticated(false)
                          sessionStorage.removeItem('oasis_admin_unlocked')
                          closeAdminPanel()
                        }}
                      >
                        🔒 Bloquear Sesión Admin
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

