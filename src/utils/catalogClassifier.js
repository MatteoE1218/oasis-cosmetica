/**
 * Motor inteligente de clasificación y extracción automática de catálogo para Oasis Makeup.
 * Soporta:
 * 1. Archivos CSV / TSV / Texto tabulado o pegado desde Excel
 * 2. Bloques de texto libre / catálogos copiados de PDF o WhatsApp
 * 3. Subida de múltiples fotos sueltas (extrae nombre, precio, categoría y colores dominantes reales del canvas)
 */

const CATEGORY_RULES = [
  {
    category: 'Labiales',
    icon: '💄',
    gradient: 'linear-gradient(135deg, #9b1b30, #d4637a)',
    keywords: [
      'labial', 'lip', 'lipstick', 'gloss', 'brillo', 'bálsamo', 'balsamo', 'tinta',
      'terciopelo', 'mate', 'matte', 'rouge', 'labios', 'delineador de labios', 'velvet',
    ],
    defaultShades: [
      { name: 'Carmesí', hex: '#9b1b30' },
      { name: 'Rosa Seda', hex: '#c9877f' },
      { name: 'Nude Cálido', hex: '#b57266' },
      { name: 'Borgoña', hex: '#6b1d3a' },
    ],
  },
  {
    category: 'Base',
    icon: '✨',
    gradient: 'linear-gradient(135deg, #f5e6d3, #c49a6c)',
    keywords: [
      'base', 'sérum', 'serum', 'foundation', 'corrector', 'concealer', 'polvo',
      'compacto', 'primer', 'bb cream', 'cc cream', 'piel', 'contorno', 'contour',
      'iluminador', 'highlighter', 'fijador',
    ],
    defaultShades: [
      { name: 'Porcelana', hex: '#f5e6d3' },
      { name: 'Marfil', hex: '#e8d5b7' },
      { name: 'Arena', hex: '#d4b896' },
      { name: 'Caramelo', hex: '#c49a6c' },
    ],
  },
  {
    category: 'Sombras',
    icon: '🎨',
    gradient: 'linear-gradient(135deg, #d4956b, #6b2d5b)',
    keywords: [
      'sombra', 'sombras', 'paleta', 'palette', 'eyeshadow', 'glitter', 'pigmento',
      'shimmer', 'ojos', 'mirada', 'dúo', 'trio', 'cuarteto',
    ],
    defaultShades: [
      { name: 'Champaña', hex: '#e8c99b' },
      { name: 'Oro Rosa', hex: '#d4956b' },
      { name: 'Bronce', hex: '#b87333' },
      { name: 'Ciruela', hex: '#6b2d5b' },
    ],
  },
  {
    category: 'Rubor',
    icon: '🌸',
    gradient: 'linear-gradient(135deg, #e8946a, #b56576)',
    keywords: [
      'rubor', 'blush', 'colorete', 'mejillas', 'cheek', 'tint', 'melocotón',
      'peach', 'rosado', 'terracota', 'bronzer', 'bronceador',
    ],
    defaultShades: [
      { name: 'Pétalo', hex: '#e6b8a2' },
      { name: 'Melocotón', hex: '#e8946a' },
      { name: 'Rosa Vibrante', hex: '#e06088' },
      { name: 'Malva', hex: '#b56576' },
    ],
  },
  {
    category: 'Máscara',
    icon: '👁️',
    gradient: 'linear-gradient(135deg, #1a1a2e, #4a1942)',
    keywords: [
      'máscara', 'mascara', 'pestañas', 'pestanas', 'rímel', 'rimel', 'lash',
      'cejas', 'brow', 'delineador', 'eyeliner', 'plumón', 'plumon', 'kajal', 'gel de cejas',
    ],
    defaultShades: [
      { name: 'Negro Absoluto', hex: '#0a0a0a' },
      { name: 'Marrón Oscuro', hex: '#3b2218' },
    ],
  },
]

const COLOR_DICTIONARY = {
  rojo: '#b81d33',
  carmesí: '#9b1b30',
  carmesi: '#9b1b30',
  borgoña: '#6b1d3a',
  borgona: '#6b1d3a',
  vino: '#5e1931',
  coral: '#e06050',
  rosa: '#e06b8b',
  rosado: '#e888a4',
  fucsia: '#f72585',
  magenta: '#d91e75',
  malva: '#b56576',
  nude: '#c99582',
  durazno: '#e8946a',
  melocotón: '#e8946a',
  melocoton: '#e8946a',
  pétalo: '#e6b8a2',
  petalo: '#e6b8a2',
  champaña: '#e8c99b',
  champana: '#e8c99b',
  dorado: '#d4a54c',
  oro: '#d4956b',
  bronce: '#b87333',
  cobre: '#b56338',
  trufa: '#5c4033',
  ciruela: '#6b2d5b',
  uva: '#8b5090',
  morado: '#6c3082',
  violeta: '#7f3f98',
  porcelana: '#f5e6d3',
  marfil: '#e8d5b7',
  arena: '#d4b896',
  beige: '#dcc1a0',
  caramelo: '#c49a6c',
  canela: '#a87548',
  café: '#6b4226',
  cafe: '#6b4226',
  marrón: '#4a2c18',
  marron: '#4a2c18',
  chocolate: '#4e2e1e',
  negro: '#121212',
  cristal: '#f0d0e0',
  transparente: '#f7e6ef',
  fresa: '#e85d80',
  cereza: '#9e1932',
  terracota: '#b85a40',
}

/**
 * Clasifica automáticamente un producto a partir de su nombre y descripción
 */
export function autoClassifyProduct(rawName = '', rawDesc = '', rawCategory = '') {
  const combined = `${rawName} ${rawDesc} ${rawCategory}`.toLowerCase()

  // Si ya viene una categoría explícita que coincide
  for (const rule of CATEGORY_RULES) {
    if (rawCategory && rule.category.toLowerCase() === rawCategory.trim().toLowerCase()) {
      return rule
    }
  }

  let bestRule = CATEGORY_RULES[0]
  let bestScore = 0

  for (const rule of CATEGORY_RULES) {
    let score = 0
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        score += rawName.toLowerCase().includes(kw) ? 3 : 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestRule = rule
    }
  }

  return bestRule
}

/**
 * Genera automáticamente un tagline y descripción atractiva si faltan
 */
export function autoGenerateCopy(name, category) {
  const cleanName = name || 'Cosmético Oasis'
  const copyByCategory = {
    Labiales: {
      tagline: 'Pigmento intenso y textura aterciopelada',
      description: `${cleanName} con fórmula hidratante de larga duración, color vibrante y acabado sedoso que realza tus labios todo el día.`,
    },
    Base: {
      tagline: 'Acabado luminoso de segunda piel',
      description: `${cleanName} de cobertura modulable y textura ligera que perfecciona, hidrata y deja un efecto radiante natural.`,
    },
    Sombras: {
      tagline: 'Pigmentación profesional de alta fijación',
      description: `${cleanName} con tonos versátiles en acabados mate, satinado y brillante que se difuminan suavemente.`,
    },
    Rubor: {
      tagline: 'Rubor natural con efecto piel fresca',
      description: `${cleanName} de textura ultra suave que aporta luminosidad e intensidad modulable a tus mejillas.`,
    },
    Máscara: {
      tagline: 'Definición, alargamiento y volumen extremo',
      description: `${cleanName} de larga duración a prueba de manchas para una mirada impactante y definida desde la primera pasada.`,
    },
  }

  return copyByCategory[category] || copyByCategory.Labiales
}

/**
 * Convierte texto de colores/tonos (ej. "Rojo:#9b1b30, Nude, Rosa") en array de shades
 */
export function parseShadesString(rawShades, fallbackShades) {
  if (Array.isArray(rawShades) && rawShades.length > 0) return rawShades
  if (!rawShades || typeof rawShades !== 'string' || !rawShades.trim()) {
    return fallbackShades || CATEGORY_RULES[0].defaultShades
  }

  const parts = rawShades
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (parts.length === 0) return fallbackShades || CATEGORY_RULES[0].defaultShades

  return parts.map((part, idx) => {
    const hexMatch = part.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/)
    const namePart = part.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/, '').replace(/[:()-]/g, '').trim()
    const cleanName = namePart || `Tono ${idx + 1}`

    if (hexMatch) {
      return { name: cleanName, hex: hexMatch[0] }
    }

    // Buscar en diccionario de colores en español
    const lower = cleanName.toLowerCase()
    for (const [key, hex] of Object.entries(COLOR_DICTIONARY)) {
      if (lower.includes(key)) {
        return { name: cleanName, hex }
      }
    }

    const fallbackHex = fallbackShades?.[idx % (fallbackShades.length || 1)]?.hex || '#d4637a'
    return { name: cleanName, hex: fallbackHex }
  })
}

/**
 * Extrae precio numérico desde cualquier texto (ej. "$ 24,50", "USD 18.00", "15.99")
 */
export function extractPriceFromText(text, defaultPrice = 25.0) {
  if (typeof text === 'number' && !Number.isNaN(text)) return text
  if (!text) return defaultPrice
  const str = String(text)
  const explicitMatch = str.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/)
  if (explicitMatch) {
    return parseFloat(explicitMatch[1].replace(',', '.'))
  }
  const numMatch = str.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(',', '.'))
    if (val > 0 && val < 10000) return val
  }
  return defaultPrice
}

/**
 * Limpia el nombre de un archivo de foto y extrae nombre, precio y stock si están en el nombre
 * Ejemplo: "Labial Terciopelo Rosa - $18.50 - 15u.jpg" -> { name: "Labial Terciopelo Rosa", price: 18.5 }
 */
export function parseFilenameMetadata(filename) {
  const withoutExt = filename.replace(/\.[^/.]+$/, '')
  let working = withoutExt.replace(/[_]+/g, ' ').trim()

  // Buscar precio en el nombre del archivo (ej. $18.50 o 18.50$ o - 18.50)
  let price = null
  const priceRegex = /(?:\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*\$|(?:precio|usd|pvp)\s*(\d+(?:[.,]\d{1,2})?))/i
  const priceMatch = working.match(priceRegex)
  if (priceMatch) {
    const rawNum = priceMatch[1] || priceMatch[2] || priceMatch[3]
    price = parseFloat(rawNum.replace(',', '.'))
    working = working.replace(priceMatch[0], ' ')
  } else {
    // Si termina con "- 24.50"
    const tailNum = working.match(/[-–]\s*(\d+(?:[.,]\d{1,2})?)\s*$/)
    if (tailNum) {
      price = parseFloat(tailNum[1].replace(',', '.'))
      working = working.replace(tailNum[0], ' ')
    }
  }

  // Limpiar separadores sobrantes
  const cleanName = working
    .replace(/\s*[-–|]\s*$/g, '')
    .replace(/^\s*[-–|]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Capitalizar bonito
  const formattedName = (cleanName || 'Producto Oasis')
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')

  return {
    name: formattedName,
    price: price !== null && !Number.isNaN(price) ? price : 28.0,
  }
}

/**
 * Comprime una imagen en el navegador a DataURL optimizado y extrae sus colores dominantes reales
 */
export function processImageFile(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
        const dominantColors = extractDominantColorsFromContext(ctx, width, height)

        resolve({
          dataUrl,
          dominantColors,
          width,
          height,
        })
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function extractDominantColorsFromContext(ctx, width, height) {
  try {
    const samplePoints = [
      [0.5, 0.5],
      [0.35, 0.45],
      [0.65, 0.55],
      [0.5, 0.35],
    ]
    const colors = []
    samplePoints.forEach(([rx, ry], idx) => {
      const x = Math.min(width - 1, Math.max(0, Math.floor(width * rx)))
      const y = Math.min(height - 1, Math.max(0, Math.floor(height * ry)))
      const pixel = ctx.getImageData(x, y, 1, 1).data
      const [r, g, b] = pixel
      // Evitar blancos o grises muy lavados del fondo
      if (r > 240 && g > 240 && b > 240) return
      const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
      if (!colors.some((c) => c.hex === hex)) {
        colors.push({ name: `Tono ${idx + 1}`, hex })
      }
    })
    return colors
  } catch {
    return []
  }
}

/**
 * Parsea texto CSV / TSV (Excel copiado o archivo .csv) o listado de texto libre
 * y clasifica todos los productos automáticamente.
 */
export function parseBulkCatalogText(rawText) {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  // Detectar delimitador (tabulador de Excel, punto y coma, o coma)
  const firstLine = lines[0]
  let delimiter = ','
  if (firstLine.includes('\t')) delimiter = '\t'
  else if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';'

  const splitLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const firstCells = splitLine(firstLine).map((c) => c.toLowerCase())
  const hasHeader = firstCells.some((c) =>
    ['nombre', 'name', 'producto', 'precio', 'price', 'categoria', 'categoría', 'descripcion', 'descripción', 'stock', 'foto', 'imagen'].some((k) =>
      c.includes(k)
    )
  )

  const headerMap = {
    name: 0,
    description: 1,
    price: 2,
    category: -1,
    stock: -1,
    shades: -1,
    image: -1,
    badge: -1,
  }

  if (hasHeader) {
    firstCells.forEach((col, idx) => {
      if (col.includes('nombre') || col.includes('name') || col.includes('producto') || col.includes('titulo')) headerMap.name = idx
      else if (col.includes('desc') || col.includes('detalle') || col.includes('info')) headerMap.description = idx
      else if (col.includes('precio') || col.includes('price') || col.includes('valor') || col.includes('costo') || col.includes('pvp')) headerMap.price = idx
      else if (col.includes('cat') || col.includes('tipo') || col.includes('linea')) headerMap.category = idx
      else if (col.includes('stock') || col.includes('cant') || col.includes('disp') || col.includes('unidades')) headerMap.stock = idx
      else if (col.includes('color') || col.includes('tono') || col.includes('shade')) headerMap.shades = idx
      else if (col.includes('foto') || col.includes('img') || col.includes('imagen') || col.includes('url')) headerMap.image = idx
      else if (col.includes('badge') || col.includes('etiqueta') || col.includes('destacado')) headerMap.badge = idx
    })
  }

  const dataLines = hasHeader ? lines.slice(1) : lines
  const parsedProducts = []

  dataLines.forEach((line, index) => {
    const cells = splitLine(line)

    // Si es una línea de texto libre tipo "Labial Mate Velvet - Rojo sedoso de larga duración - $22.50"
    let rawName = ''
    let rawDesc = ''
    let rawPrice = ''
    let rawCategory = ''
    let rawStock = '25'
    let rawShades = ''
    let rawImage = ''
    let rawBadge = ''

    if (!hasHeader && cells.length === 1 && line.includes('-')) {
      const dashParts = line.split(/\s+[-–|]\s+/)
      rawName = dashParts[0] || ''
      const priceIdx = dashParts.findIndex((p) => /\$\s*\d+|\d+[.,]\d{2}/.test(p))
      if (priceIdx !== -1) {
        rawPrice = dashParts[priceIdx]
        rawDesc = dashParts.filter((_, i) => i !== 0 && i !== priceIdx).join('. ')
      } else {
        rawDesc = dashParts[1] || ''
        rawPrice = dashParts[2] || '25'
      }
    } else {
      rawName = cells[headerMap.name] || ''
      rawDesc = headerMap.description >= 0 ? cells[headerMap.description] || '' : ''
      rawPrice = headerMap.price >= 0 ? cells[headerMap.price] || '' : ''
      rawCategory = headerMap.category >= 0 ? cells[headerMap.category] || '' : ''
      rawStock = headerMap.stock >= 0 ? cells[headerMap.stock] || '25' : '25'
      rawShades = headerMap.shades >= 0 ? cells[headerMap.shades] || '' : ''
      rawImage = headerMap.image >= 0 ? cells[headerMap.image] || '' : ''
      rawBadge = headerMap.badge >= 0 ? cells[headerMap.badge] || '' : ''
    }

    if (!rawName.trim()) return

    const rule = autoClassifyProduct(rawName, rawDesc, rawCategory)
    const autoCopy = autoGenerateCopy(rawName.trim(), rule.category)
    const finalPrice = extractPriceFromText(rawPrice || rawDesc || rawName, 28.0)
    const finalStock = Math.max(0, parseInt(rawStock, 10) || 25)
    const shades = parseShadesString(rawShades, rule.defaultShades)

    parsedProducts.push({
      id: `prod-${Date.now()}-${index}`,
      name: rawName.trim(),
      category: rule.category,
      price: finalPrice,
      stock: finalStock,
      tagline: rawDesc ? rawDesc.slice(0, 58) : autoCopy.tagline,
      description: rawDesc || autoCopy.description,
      shades,
      defaultShade: 0,
      badge: rawBadge || 'Nuevo',
      icon: rule.icon,
      gradient: rule.gradient,
      image: rawImage || '',
      images: rawImage ? [rawImage] : [],
      includeInPack: true,
    })
  })

  return parsedProducts
}

