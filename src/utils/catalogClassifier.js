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
 * Detecta nombres genéricos de cámara o WhatsApp (ej. "WhatsApp Image 2026...", "IMG_1234.jpg")
 * para no confundir la fecha/hora con el precio ni dejar nombres basura.
 */
export function parseFilenameMetadata(filename, fallbackIndex = 1, visualHint = null) {
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim()

  // Detectar si es un nombre genérico de cámara, celular o WhatsApp
  const isGenericPattern =
    /^(?:whatsapp\s*(?:image|img|video)|img|dsc|dcim|pxl|photo|foto|imagen|image|screenshot|captura|cam|pic|untitled|sin\s*t[íi]tulo)[\s_-]*\d*/i.test(
      withoutExt
    ) ||
    /^[0-9a-f]{8,}(?:-[0-9a-f]{4,})+$/i.test(withoutExt) ||
    /^\d{5,}$/.test(withoutExt.replace(/[\s_-]/g, '')) ||
    /^\d{4}[-_]\d{2}[-_]\d{2}/.test(withoutExt)

  if (isGenericPattern) {
    const suggestedName = visualHint?.suggestedName
      ? `${visualHint.suggestedName} #${fallbackIndex}`
      : `Cosmético Oasis #${fallbackIndex}`
    return {
      name: suggestedName,
      price: visualHint?.suggestedPrice || 28.0,
      isGeneric: true,
    }
  }

  let working = withoutExt.replace(/[_]+/g, ' ').trim()

  // Quitar fechas tipo 2026-11-02 o horas tipo 10.15.30 PM antes de buscar precios
  working = working
    .replace(/\b20\d{2}[-_.]\d{1,2}[-_.]\d{1,2}\b/g, ' ')
    .replace(/\bat\s+\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\s*(?:am|pm)?\b/gi, ' ')

  // Buscar precio explícito en el nombre del archivo (ej. $18.50 o 18.50$ o USD 18.50)
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
      const val = parseFloat(tailNum[1].replace(',', '.'))
      if (val > 1 && val < 500) {
        price = val
        working = working.replace(tailNum[0], ' ')
      }
    }
  }

  // Quitar numeración entre paréntesis al final tipo "(1)" si hay más texto
  const strippedParens = working.replace(/\(\d+\)\s*$/, '').trim()
  if (strippedParens.length >= 3) {
    working = strippedParens
  }

  // Limpiar separadores sobrantes
  const cleanName = working
    .replace(/\s*[-–|]\s*$/g, '')
    .replace(/^\s*[-–|]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Capitalizar bonito
  const formattedName = (cleanName || visualHint?.suggestedName || `Cosmético Oasis #${fallbackIndex}`)
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')

  return {
    name: formattedName,
    price: price !== null && !Number.isNaN(price) ? price : visualHint?.suggestedPrice || 28.0,
    isGeneric: false,
  }
}

/**
 * Convierte un color RGB al nombre de tono cosmético más cercano en español
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

const COSMETIC_SHADE_PALETTE = [
  { name: 'Rojo Carmesí', hex: '#9b1b30', categoryHint: 'Labiales' },
  { name: 'Rojo Rubí', hex: '#b81d33', categoryHint: 'Labiales' },
  { name: 'Borgoña Intenso', hex: '#6b1d3a', categoryHint: 'Labiales' },
  { name: 'Vino Terciopelo', hex: '#5e1931', categoryHint: 'Labiales' },
  { name: 'Fucsia Oasis', hex: '#d91e75', categoryHint: 'Labiales' },
  { name: 'Rosa Seda', hex: '#c9877f', categoryHint: 'Labiales' },
  { name: 'Rosa Pétalo', hex: '#e07a96', categoryHint: 'Rubor' },
  { name: 'Coral Cálido', hex: '#e06050', categoryHint: 'Rubor' },
  { name: 'Melocotón Suave', hex: '#e8946a', categoryHint: 'Rubor' },
  { name: 'Malva Rosado', hex: '#b56576', categoryHint: 'Labiales' },
  { name: 'Nude Cálido', hex: '#b57266', categoryHint: 'Labiales' },
  { name: 'Terracota', hex: '#b85a40', categoryHint: 'Rubor' },
  { name: 'Porcelana', hex: '#f2dfc8', categoryHint: 'Base' },
  { name: 'Marfil Luminoso', hex: '#e6cfa8', categoryHint: 'Base' },
  { name: 'Arena Natural', hex: '#d4b58c', categoryHint: 'Base' },
  { name: 'Beige Dorado', hex: '#c69f70', categoryHint: 'Base' },
  { name: 'Caramelo', hex: '#b38252', categoryHint: 'Base' },
  { name: 'Canela', hex: '#966138', categoryHint: 'Base' },
  { name: 'Oro Rosa', hex: '#d4956b', categoryHint: 'Sombras' },
  { name: 'Bronce Satinado', hex: '#a86832', categoryHint: 'Sombras' },
  { name: 'Ciruela Místico', hex: '#6b2d5b', categoryHint: 'Sombras' },
  { name: 'Trufa Café', hex: '#5c3c2e', categoryHint: 'Sombras' },
  { name: 'Negro Absoluto', hex: '#1c191b', categoryHint: 'Máscara' },
]

function findClosestCosmeticShade(r, g, b) {
  let best = COSMETIC_SHADE_PALETTE[0]
  let bestDist = Infinity
  for (const item of COSMETIC_SHADE_PALETTE) {
    const [pr, pg, pb] = hexToRgb(item.hex)
    const dist =
      (r - pr) * (r - pr) * 0.3 +
      (g - pg) * (g - pg) * 0.59 +
      (b - pb) * (b - pb) * 0.11
    if (dist < bestDist) {
      bestDist = dist
      best = item
    }
  }
  return best
}

/**
 * Infiere una sugerencia visual de categoría y nombre de producto según los tonos reales de la foto
 */
function inferVisualProductHint(dominantColors) {
  if (!dominantColors || dominantColors.length === 0) {
    return {
      category: 'Labiales',
      suggestedName: 'Labial Velvet Oasis',
      suggestedPrice: 24.0,
    }
  }

  const counts = {}
  for (const col of dominantColors) {
    const cat = col.categoryHint || 'Labiales'
    counts[cat] = (counts[cat] || 0) + 1
  }

  // Si hay 3 o más tonos muy distintos entre sí, suele ser una paleta de sombras o rubores
  let topCat = 'Labiales'
  let maxCount = 0
  for (const [cat, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c
      topCat = cat
    }
  }

  const primaryShadeName = dominantColors[0]?.name || 'Edición Especial'
  const suggestions = {
    Labiales: {
      category: 'Labiales',
      suggestedName: `Labial Oasis ${primaryShadeName}`,
      suggestedPrice: 22.0,
    },
    Base: {
      category: 'Base',
      suggestedName: `Base & Polvo Oasis ${primaryShadeName}`,
      suggestedPrice: 32.0,
    },
    Rubor: {
      category: 'Rubor',
      suggestedName: `Rubor Seda ${primaryShadeName}`,
      suggestedPrice: 26.0,
    },
    Sombras: {
      category: 'Sombras',
      suggestedName: `Paleta de Sombras ${primaryShadeName}`,
      suggestedPrice: 38.0,
    },
    Máscara: {
      category: 'Máscara',
      suggestedName: `Máscara & Delineador ${primaryShadeName}`,
      suggestedPrice: 20.0,
    },
  }

  return suggestions[topCat] || suggestions.Labiales
}

/**
 * Comprime una imagen en el navegador a DataURL optimizado y extrae sus colores dominantes reales
 */
export function processImageFile(file, maxWidth = 850) {
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.86)
        const dominantColors = extractDominantColorsFromContext(ctx, width, height)
        const visualHint = inferVisualProductHint(dominantColors)

        resolve({
          dataUrl,
          dominantColors,
          visualHint,
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

export function extractDominantColorsFromContext(ctx, width, height) {
  try {
    // Muestrear una cuadrícula de 6x6 en la zona central (evitando bordes de fondo blanco/transparente)
    const buckets = []
    const steps = 6
    for (let gx = 0; gx < steps; gx++) {
      for (let gy = 0; gy < steps; gy++) {
        const rx = 0.2 + (gx / (steps - 1)) * 0.6
        const ry = 0.2 + (gy / (steps - 1)) * 0.6
        const x = Math.min(width - 1, Math.max(0, Math.floor(width * rx)))
        const y = Math.min(height - 1, Math.max(0, Math.floor(height * ry)))
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data

        // Ignorar píxeles transparentes, fondos blancos/grises claros o sombras casi negras sin saturación
        if (a < 128) continue
        if (r > 235 && g > 235 && b > 235) continue
        const maxC = Math.max(r, g, b)
        const minC = Math.min(r, g, b)
        const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC
        // Ignorar grises neutros de estudio (baja saturación y luminosidad media/alta)
        if (saturation < 0.14 && maxC > 75) continue

        // Agrupar colores similares (distancia RGB < 38)
        let existing = buckets.find(
          (bkt) =>
            Math.hypot(bkt.r - r, bkt.g - g, bkt.b - b) < 38
        )
        if (existing) {
          existing.count += 1 + saturation * 2
          existing.r = Math.round((existing.r + r) / 2)
          existing.g = Math.round((existing.g + g) / 2)
          existing.b = Math.round((existing.b + b) / 2)
        } else {
          buckets.push({
            r,
            g,
            b,
            count: 1 + saturation * 2,
          })
        }
      }
    }

    buckets.sort((a, b) => b.count - a.count)
    const topBuckets = buckets.slice(0, 4)

    const usedNames = new Set()
    const colors = []

    topBuckets.forEach((bkt, idx) => {
      const hex = `#${[bkt.r, bkt.g, bkt.b]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')}`
      const closest = findClosestCosmeticShade(bkt.r, bkt.g, bkt.b)
      let shadeName = closest.name
      if (usedNames.has(shadeName)) {
        shadeName = `${closest.name} ${idx + 1}`
      }
      usedNames.add(shadeName)

      colors.push({
        name: shadeName,
        hex,
        categoryHint: closest.categoryHint,
      })
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

/**
 * Carga PDF.js bajo demanda en el navegador para extraer texto estructurado por líneas y páginas
 */
let pdfJsPromise = null
function loadPdfJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  if (pdfJsPromise) return pdfJsPromise

  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      } else {
        reject(new Error('PDF.js no disponible'))
      }
    }
    script.onerror = () => reject(new Error('No se pudo cargar PDF.js'))
    document.head.appendChild(script)
  })
  return pdfJsPromise
}

/**
 * Extrae imágenes JPEG incrustadas directamente desde el binario de un archivo PDF
 */
async function extractEmbeddedJpegsFromPdfBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const rawBlobs = []
  let i = 0

  while (i < bytes.length - 4) {
    // Buscar inicio de JPEG (FF D8 FF)
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      let end = i + 3
      let foundEnd = false
      while (end < bytes.length - 1) {
        if (bytes[end] === 0xff && bytes[end + 1] === 0xd9) {
          end += 2
          foundEnd = true
          break
        }
        end++
      }
      if (foundEnd) {
        const length = end - i
        // Ignorar miniaturas muy pequeñas (< 2.5 KB)
        if (length > 2500 && length < 8 * 1024 * 1024) {
          const slice = bytes.slice(i, end)
          rawBlobs.push(new Blob([slice], { type: 'image/jpeg' }))
        }
        i = end
        if (rawBlobs.length >= 60) break
        continue
      }
    }
    i++
  }

  const processedImages = []
  for (const blob of rawBlobs) {
    try {
      const processed = await processImageFile(blob, 700)
      if (processed.width >= 60 && processed.height >= 60) {
        processedImages.push(processed)
      }
    } catch {
      // ignorar segmento corrupto
    }
  }
  return processedImages
}

/**
 * Fallback nativo (sin librerías externas) para extraer texto de streams PDF (incluyendo FlateDecode)
 */
async function extractTextFromPdfBufferNative(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const latin1Decoder = new TextDecoder('latin1')
  const rawPdfStr = latin1Decoder.decode(bytes)

  const decodePdfLiteral = (str) =>
    str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')

  const decodePdfHex = (hexStr) => {
    const clean = hexStr.replace(/\s+/g, '')
    let out = ''
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.slice(i, i + 2), 16)
      if (!Number.isNaN(code) && code >= 32) {
        out += String.fromCharCode(code)
      }
    }
    return out
  }

  const parseContentStreamText = (content) => {
    const lines = []
    let currentLine = []

    const flushLine = () => {
      if (currentLine.length > 0) {
        const joined = currentLine.join(' ').replace(/\s{2,}/g, ' ').trim()
        if (joined) lines.push(joined)
        currentLine = []
      }
    }

    const tokenRegex = /\((?:\\.|[^\\()])*\)\s*Tj|<([0-9A-Fa-f\s]+)>\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ|\bTd\b|\bTD\b|\bT\*\b/g
    let match
    while ((match = tokenRegex.exec(content)) !== null) {
      const token = match[0]
      if (token === 'Td' || token === 'TD' || token === 'T*') {
        flushLine()
      } else if (match[1] !== undefined) {
        const t = decodePdfHex(match[1]).trim()
        if (t) currentLine.push(t)
      } else if (match[2] !== undefined) {
        const arrContent = match[2]
        const subMatches = arrContent.match(/\((?:\\.|[^\\()])*\)|<([0-9A-Fa-f\s]+)>/g) || []
        const parts = subMatches.map((sub) => {
          if (sub.startsWith('(')) return decodePdfLiteral(sub.slice(1, -1))
          return decodePdfHex(sub.slice(1, -1))
        })
        const joined = parts.join('').trim()
        if (joined) currentLine.push(joined)
      } else if (token.startsWith('(')) {
        const closeIdx = token.lastIndexOf(')')
        const lit = decodePdfLiteral(token.slice(1, closeIdx)).trim()
        if (lit) currentLine.push(lit)
      }
    }
    flushLine()
    return lines
  }

  const allLines = []
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let streamMatch

  while ((streamMatch = streamRegex.exec(rawPdfStr)) !== null) {
    const startOffset = streamMatch.index + streamMatch[0].indexOf('\n') + 1
    const streamBodyStr = streamMatch[1]
    const endOffset = startOffset + streamBodyStr.length
    const streamBytes = bytes.slice(startOffset, endOffset)

    let decodedContent = ''
    if (typeof DecompressionStream !== 'undefined') {
      for (const format of ['deflate', 'deflate-raw']) {
        try {
          const ds = new DecompressionStream(format)
          const writer = ds.writable.getWriter()
          writer.write(streamBytes)
          writer.close()
          const decompressedBuf = await new Response(ds.readable).arrayBuffer()
          decodedContent = latin1Decoder.decode(new Uint8Array(decompressedBuf))
          if (decodedContent.includes('Tj') || decodedContent.includes('TJ')) break
        } catch {
          // probar siguiente formato
        }
      }
    }

    if (!decodedContent) {
      decodedContent = streamBodyStr
    }

    if (decodedContent.includes('Tj') || decodedContent.includes('TJ')) {
      const extracted = parseContentStreamText(decodedContent)
      allLines.push(...extracted)
    }
  }

  return allLines.join('\n')
}

/**
 * Multiplica dos matrices de transformación 2D de PDF [a, b, c, d, e, f]
 */
function multiplyTransform(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

/**
 * Recorta una región de un canvas y devuelve su DataURL y colores dominantes
 */
function cropCanvasRegion(sourceCanvas, x, y, w, h) {
  const sx = Math.max(0, Math.floor(x))
  const sy = Math.max(0, Math.floor(y))
  const sw = Math.min(sourceCanvas.width - sx, Math.floor(w))
  const sh = Math.min(sourceCanvas.height - sy, Math.floor(h))
  if (sw < 40 || sh < 40) return null

  const cropCanvas = document.createElement('canvas')
  const maxDim = 650
  let outW = sw
  let outH = sh
  if (outW > maxDim || outH > maxDim) {
    const ratio = Math.min(maxDim / outW, maxDim / outH)
    outW = Math.round(outW * ratio)
    outH = Math.round(outH * ratio)
  }
  cropCanvas.width = outW
  cropCanvas.height = outH
  const ctx = cropCanvas.getContext('2d')
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, outW, outH)

  // Verificar que el recorte no sea un rectángulo 99% blanco o de un solo color plano vacío
  const dominantColors = extractDominantColorsFromContext(ctx, outW, outH)
  const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.86)
  return {
    dataUrl,
    dominantColors,
    visualHint: inferVisualProductHint(dominantColors),
    cx: sx + sw / 2,
    cy: sy + sh / 2,
    width: outW,
    height: outH,
  }
}

/**
 * Detecta regiones visuales de fotos en una página renderizada cuando el PDF usa gráficos/capas complejas
 */
function detectVisualPhotoRegionsOnPage(pageCanvas, textBoxesCanvasCoords) {
  const w = pageCanvas.width
  const h = pageCanvas.height
  const ctx = pageCanvas.getContext('2d')
  const imgData = ctx.getImageData(0, 0, w, h).data

  // Color de fondo estimado en las esquinas de la página
  const bgR = imgData[0]
  const bgG = imgData[1]
  const bgB = imgData[2]

  const gridCols = 36
  const gridRows = 48
  const cellW = w / gridCols
  const cellH = h / gridRows
  const activeGrid = Array.from({ length: gridRows }, () => Array(gridCols).fill(false))

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const cx = Math.floor((c + 0.5) * cellW)
      const cy = Math.floor((r + 0.5) * cellH)

      // Ignorar celdas que caen encima de texto conocido
      const insideText = textBoxesCanvasCoords.some(
        (tb) =>
          cx >= tb.x - 6 &&
          cx <= tb.x + tb.w + 6 &&
          cy >= tb.y - 6 &&
          cy <= tb.y + tb.h + 6
      )
      if (insideText) continue

      const idx = (cy * w + cx) * 4
      const pr = imgData[idx]
      const pg = imgData[idx + 1]
      const pb = imgData[idx + 2]
      const diffBg = Math.abs(pr - bgR) + Math.abs(pg - bgG) + Math.abs(pb - bgB)
      const diffWhite = Math.abs(pr - 255) + Math.abs(pg - 255) + Math.abs(pb - 255)

      if (diffBg > 28 && diffWhite > 24) {
        activeGrid[r][c] = true
      }
    }
  }

  // Encontrar componentes conectados en la cuadrícula
  const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false))
  const regions = []

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (!activeGrid[r][c] || visited[r][c]) continue
      const queue = [[r, c]]
      visited[r][c] = true
      let minR = r, maxR = r, minC = c, maxC = c
      let cellCount = 0

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()
        cellCount++
        if (cr < minR) minR = cr
        if (cr > maxR) maxR = cr
        if (cc < minC) minC = cc
        if (cc > maxC) maxC = cc

        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
          const nr = cr + dr
          const nc = cc + dc
          if (
            nr >= 0 &&
            nr < gridRows &&
            nc >= 0 &&
            nc < gridCols &&
            activeGrid[nr][nc] &&
            !visited[nr][nc]
          ) {
            visited[nr][nc] = true
            queue.push([nr, nc])
          }
        }
      }

      const rx = minC * cellW
      const ry = minR * cellH
      const rw = (maxC - minC + 1) * cellW
      const rh = (maxR - minR + 1) * cellH

      if (cellCount >= 6 && rw >= 55 && rh >= 55 && !(rw > w * 0.94 && rh > h * 0.94)) {
        const cropped = cropCanvasRegion(pageCanvas, rx, ry, rw, rh)
        if (cropped) regions.push(cropped)
      }
    }
  }

  return regions
}

/**
 * Agrupa las líneas de texto de una página de PDF en bloques de producto completos
 * (uniendo Título + Descripción + Precio de un mismo producto para no partirlo en filas sueltas)
 */
function groupPdfLinesIntoProductBlocks(rowsWithCoords, pageHeight) {
  const filteredRows = rowsWithCoords.filter((r) => {
    const l = r.text.trim()
    if (!l || l.length < 2) return false
    if (/^p[áa]gina\s+\d+/i.test(l)) return false
    if (/^(?:cat[áa]logo|lista de precios|índice|indice|oasis makeup)\s*$/i.test(l)) return false
    return true
  })

  if (filteredRows.length === 0) return []

  // Si las líneas ya tienen formato de tabla o guiones con precio en la misma línea (ej. "Labial - Desc - $18")
  const linesWithInlinePrice = filteredRows.filter((r) =>
    /\$\s*\d+|\b(?:usd|pvp|precio)\s*\d+/i.test(r.text) && r.text.length > 12
  )
  if (linesWithInlinePrice.length >= Math.ceil(filteredRows.length * 0.6)) {
    return filteredRows.map((r) => ({
      lineText: r.text,
      cx: r.cx,
      cy: r.cy,
    }))
  }

  // Agrupar líneas cercanas verticalmente en tarjetas/bloques de producto
  const blocks = []
  let currentBlock = null

  for (const row of filteredRows) {
    const isPriceOnlyLine = /^\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:usd|\$)?$/i.test(row.text.trim())
    const hasPrice = /\$\s*\d+|\b(?:usd|pvp|precio)\s*\d+|\b\d+[.,]\d{2}\b/i.test(row.text)

    if (!currentBlock) {
      currentBlock = {
        lines: [row.text],
        cx: row.cx,
        cy: row.cy,
        lastY: row.cy,
        hasPrice,
      }
      continue
    }

    const verticalGap = Math.abs(row.cy - currentBlock.lastY)
    const maxGapForSameProduct = pageHeight * 0.065

    // Si es una línea de precio suelta (ej. "$24.00"), siempre pertenece al producto actual
    if (isPriceOnlyLine) {
      currentBlock.lines.push(row.text.includes('$') ? row.text : `$${row.text}`)
      currentBlock.lastY = row.cy
      currentBlock.hasPrice = true
      blocks.push(currentBlock)
      currentBlock = null
      continue
    }

    // Si está cerca verticalmente y el bloque actual aún no cerró con precio
    if (verticalGap <= maxGapForSameProduct && currentBlock.lines.length < 4 && !currentBlock.hasPrice) {
      currentBlock.lines.push(row.text)
      currentBlock.lastY = row.cy
      if (hasPrice) {
        currentBlock.hasPrice = true
        blocks.push(currentBlock)
        currentBlock = null
      }
    } else {
      blocks.push(currentBlock)
      currentBlock = {
        lines: [row.text],
        cx: row.cx,
        cy: row.cy,
        lastY: row.cy,
        hasPrice,
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock)
  }

  return blocks.map((b) => {
    const title = b.lines[0] || 'Producto Oasis'
    const rest = b.lines.slice(1).join(' - ')
    const combined = rest ? `${title} - ${rest}` : title
    return {
      lineText: combined,
      cx: b.cx,
      cy: b.cy,
    }
  })
}

/**
 * Extrae el texto y las imágenes reales de productos desde un archivo .PDF renderizando cada página
 */
export async function extractCatalogFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const rawEmbeddedImages = await extractEmbeddedJpegsFromPdfBuffer(arrayBuffer)
  let allProductBlocks = []
  let allPagePhotos = []

  try {
    const pdfjsLib = await loadPdfJs()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const scale = 1.6
      const viewport = page.getViewport({ scale })

      // 1. Renderizar la página en un canvas de alta nitidez para extraer cualquier tipo de foto (PNG, Flate, JPEG, Canva, etc.)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = Math.floor(viewport.width)
      pageCanvas.height = Math.floor(viewport.height)
      const pageCtx = pageCanvas.getContext('2d')
      await page.render({ canvasContext: pageCtx, viewport }).promise

      // 2. Extraer texto con coordenadas en el canvas
      const textContent = await page.getTextContent()
      const rows = []
      const textBoxesCanvas = []

      for (const item of textContent.items) {
        const str = (item.str || '').trim()
        if (!str) continue
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
        const x = tx[4]
        const y = tx[5]
        const w = (item.width || 40) * scale
        const h = Math.abs(tx[3]) || 14

        textBoxesCanvas.push({ x, y: y - h, w, h: h * 1.3 })

        let row = rows.find((r) => Math.abs(r.cy - y) <= 7)
        if (!row) {
          row = { cy: y, items: [] }
          rows.push(row)
        }
        row.items.push({ x, str })
      }

      // Ordenar de arriba hacia abajo (en coordenadas de canvas, Y crece hacia abajo)
      rows.sort((a, b) => a.cy - b.cy)
      const rowsWithCoords = rows.map((row) => {
        row.items.sort((a, b) => a.x - b.x)
        const text = row.items.map((it) => it.str).join(' ').replace(/\s{2,}/g, ' ').trim()
        const cx = row.items.reduce((acc, it) => acc + it.x, 0) / (row.items.length || 1)
        return { text, cx, cy: row.cy }
      })

      const pageBlocks = groupPdfLinesIntoProductBlocks(rowsWithCoords, viewport.height)

      // 3. Detectar las cajas exactas de las fotos dibujadas en esta página mediante getOperatorList()
      let pagePhotos = []
      try {
        const opList = await page.getOperatorList()
        const OPS = pdfjsLib.OPS
        const matrixStack = []
        let ctm = viewport.transform.slice()

        for (let i = 0; i < opList.fnArray.length; i++) {
          const fn = opList.fnArray[i]
          const args = opList.argsArray[i]

          if (fn === OPS.save) {
            matrixStack.push(ctm.slice())
          } else if (fn === OPS.restore) {
            if (matrixStack.length > 0) ctm = matrixStack.pop()
          } else if (fn === OPS.transform) {
            ctm = multiplyTransform(ctm, args)
          } else if (
            fn === OPS.paintImageXObject ||
            fn === OPS.paintJpegXObject ||
            fn === OPS.paintInlineImageXObject
          ) {
            // En PDF, las imágenes se dibujan en el cuadrado unitario [0,1]x[0,1] transformado por ctm
            const x0 = ctm[4]
            const y0 = ctm[5]
            const x1 = ctm[0] + ctm[4]
            const y1 = ctm[1] + ctm[5]
            const x2 = ctm[2] + ctm[4]
            const y2 = ctm[3] + ctm[5]
            const x3 = ctm[0] + ctm[2] + ctm[4]
            const y3 = ctm[1] + ctm[3] + ctm[5]

            const minX = Math.min(x0, x1, x2, x3)
            const maxX = Math.max(x0, x1, x2, x3)
            const minY = Math.min(y0, y1, y2, y3)
            const maxY = Math.max(y0, y1, y2, y3)
            const bw = maxX - minX
            const bh = maxY - minY

            // Descartar iconos diminutos o fondos que cubren el 95%+ de toda la hoja
            const isFullPageBg = bw > viewport.width * 0.93 && bh > viewport.height * 0.93
            if (bw >= 48 && bh >= 48 && !isFullPageBg) {
              // Evitar duplicados en la misma posición
              const isDuplicate = pagePhotos.some(
                (p) => Math.hypot(p.cx - (minX + bw / 2), p.cy - (minY + bh / 2)) < 25
              )
              if (!isDuplicate) {
                const cropped = cropCanvasRegion(pageCanvas, minX, minY, bw, bh)
                if (cropped) pagePhotos.push(cropped)
              }
            }
          }
        }
      } catch {
        // continuar con detector visual
      }

      // 4. Si el PDF tenía las fotos acopladas en el fondo o en vectores/grupos, usar el detector visual de regiones
      if (pagePhotos.length === 0) {
        pagePhotos = detectVisualPhotoRegionsOnPage(pageCanvas, textBoxesCanvas)
      }

      // 5. Si la página es una tarjeta de 1 solo producto y aún no hay recorte individual, tomar captura de la zona visual de la página
      if (pagePhotos.length === 0 && pageBlocks.length <= 2) {
        const fallbackCrop = cropCanvasRegion(
          pageCanvas,
          viewport.width * 0.08,
          viewport.height * 0.06,
          viewport.width * 0.84,
          viewport.height * 0.55
        )
        if (fallbackCrop) pagePhotos.push(fallbackCrop)
      }

      // Ordenar fotos de arriba hacia abajo, izquierda a derecha
      pagePhotos.sort((a, b) => (Math.abs(a.cy - b.cy) > 35 ? a.cy - b.cy : a.cx - b.cx))

      // 6. Emparejar cada bloque de producto de esta página con su foto más cercana en la misma página
      const usedPhotoIndices = new Set()
      for (const block of pageBlocks) {
        let bestPhoto = null
        let bestDist = Infinity
        let bestIdx = -1

        pagePhotos.forEach((photo, pIdx) => {
          if (usedPhotoIndices.has(pIdx)) return
          const dist = Math.hypot((photo.cx - block.cx) * 0.7, photo.cy - block.cy)
          if (dist < bestDist) {
            bestDist = dist
            bestPhoto = photo
            bestIdx = pIdx
          }
        })

        if (bestIdx !== -1) {
          usedPhotoIndices.add(bestIdx)
        }
        allProductBlocks.push({
          lineText: block.lineText,
          photo: bestPhoto,
        })
      }

      // Si era una página puramente fotográfica sin texto seleccionable, crear productos a partir de las fotos de la página
      if (pageBlocks.length === 0 && pagePhotos.length > 0) {
        for (const photo of pagePhotos) {
          allProductBlocks.push({
            lineText: '',
            photo,
          })
        }
      }

      allPagePhotos.push(...pagePhotos)
    }
  } catch {
    // Fallback offline nativo si falla PDF.js
    const nativeText = await extractTextFromPdfBufferNative(arrayBuffer)
    const lines = nativeText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 3 && !/^p[áa]gina\s+\d+/i.test(l))
    allProductBlocks = lines.map((lineText, idx) => ({
      lineText,
      photo: rawEmbeddedImages[idx] || null,
    }))
  }

  // Construir los productos finales combinando texto extraído + foto emparejada
  const textLinesForBox = []
  const finalItems = []
  const baseMeta = parseFilenameMetadata(file.name)

  allProductBlocks.forEach((entry, idx) => {
    const photo = entry.photo || rawEmbeddedImages[idx] || null
    if (entry.lineText) {
      textLinesForBox.push(entry.lineText)
      const parsed = parseBulkCatalogText(entry.lineText)[0]
      if (parsed) {
        const shades =
          photo?.dominantColors?.length >= 2 ? photo.dominantColors : parsed.shades
        finalItems.push({
          ...parsed,
          id: `pdf-prod-${Date.now()}-${idx}`,
          image: photo?.dataUrl || parsed.image || '',
          images: photo?.dataUrl ? [photo.dataUrl] : parsed.images || [],
          shades,
        })
      }
    } else if (photo) {
      const hint = photo.visualHint || inferVisualProductHint(photo.dominantColors)
      const itemName = `${hint.suggestedName || baseMeta.name} #${idx + 1}`
      const rule = autoClassifyProduct(itemName, '', hint.category)
      const copy = autoGenerateCopy(itemName, rule.category)
      textLinesForBox.push(`${itemName} - ${copy.description} - $${hint.suggestedPrice}`)
      finalItems.push({
        id: `pdf-img-${Date.now()}-${idx}`,
        name: itemName,
        category: rule.category,
        price: hint.suggestedPrice || baseMeta.price,
        stock: 25,
        tagline: copy.tagline,
        description: copy.description,
        shades:
          photo.dominantColors?.length >= 2
            ? photo.dominantColors
            : rule.defaultShades,
        defaultShade: 0,
        badge: 'Nuevo',
        icon: rule.icon,
        gradient: rule.gradient,
        image: photo.dataUrl,
        images: [photo.dataUrl],
        includeInPack: true,
      })
    }
  })

  const photosAttachedCount = finalItems.filter((it) => Boolean(it.image)).length

  return {
    text: textLinesForBox.join('\n'),
    items: finalItems,
    embeddedImagesCount: photosAttachedCount || allPagePhotos.length || rawEmbeddedImages.length,
  }
}


