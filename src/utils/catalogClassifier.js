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
      'benetint', 'fat oil', 'lip oil', 'drip', 'terciopelo', 'mate', 'matte', 'rouge',
      'labios', 'delineador de labios', 'velvet', 'plumper', 'voluminizador',
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
      'compacto', 'primer', 'bb cream', 'cc cream', 'piel', 'fijador', 'setting',
      'hidratante facial', 'crema con color',
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
      'rubor', 'blush', 'colorete', 'mejillas', 'cheek', 'melocotón',
      'peach', 'rosado', 'terracota', 'bronzer', 'bronceador', 'sculpt',
      'sun sculpt', 'contorno', 'contour', 'iluminador', 'highlighter',
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
 * Une líneas partidas de catálogos PDF (ej. Marca + Nombre + renglones cortos de descripción + Precio)
 * para que no se convierta cada renglón suelto ("Brillo efecto", "espejo de larga", "Formula", "duración")
 * en un producto separado.
 */
function consolidateWrappedCatalogLines(rawLines) {
  if (rawLines.length <= 1) return rawLines

  // Si es un CSV/TSV estructurado (con tabuladores, punto y coma, o varias comas en la mayoría de líneas), no agrupar
  const tabularCount = rawLines.filter(
    (l) => l.includes('\t') || l.split(';').length >= 3 || l.split(',').length >= 3
  ).length
  if (tabularCount >= Math.ceil(rawLines.length * 0.5)) {
    return rawLines
  }

  // Si la mayoría de líneas ya vienen completas con guiones y precio en la misma línea
  const completeLineCount = rawLines.filter(
    (l) => l.includes('-') && /\$\s*\d+|\b\d+[.,]\d{2}\b/.test(l)
  ).length
  if (completeLineCount >= Math.ceil(rawLines.length * 0.6)) {
    return rawLines
  }

  const consolidated = []
  let buffer = []

  const flushBuffer = () => {
    if (buffer.length === 0) return
    if (buffer.length === 1) {
      consolidated.push(buffer[0])
    } else {
      // Buscar si hay precio en alguna parte del bloque
      let pricePart = ''
      const textParts = []
      for (const part of buffer) {
        const priceOnly = /^\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:usd|\$)?$/i.test(part.trim())
        if (priceOnly) {
          pricePart = part.includes('$') ? part.trim() : `$${part.trim()}`
        } else {
          textParts.push(part.trim())
        }
      }

      if (textParts.length >= 2) {
        // Si la primera línea es una marca conocida o corta y la segunda es el nombre del producto, unirlas como nombre
        const first = textParts[0]
        const second = textParts[1]
        const isFirstBrandOnly =
          /^(?:nyx(?:\s+professional\s+makeup)?|maybelline|l'or[eé]al|loreal|mac|dior|chanel|fenty|rare\s+beauty|charlotte|nars|milani|elf|e\.l\.f\.|essence|catrice|revlon|covergirl|clinique|est[eé]e|lancome|lanc[oô]me|ysl|sephora|oasis|huda|anastasia|benefit|too\s+faced|urban\s+decay|tarte|morphe|kiko|bissu|vogue|samy|ruby\s+rose|italia\s+deluxe|beauty\s+creations|pink\s+up)$/i.test(
            first.trim()
          )

        let title = first
        let descStartIdx = 1
        if (isFirstBrandOnly && textParts.length >= 2) {
          title = `${first} ${second}`
          descStartIdx = 2
        }

        const desc = textParts.slice(descStartIdx).join(' ').replace(/\s{2,}/g, ' ').trim()
        const finalLine = [title, desc, pricePart].filter(Boolean).join(' - ')
        consolidated.push(finalLine)
      } else if (textParts.length === 1) {
        consolidated.push(pricePart ? `${textParts[0]} - ${pricePart}` : textParts[0])
      }
    }
    buffer = []
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim()
    if (!line) continue

    // Ignorar encabezados o pies de página sueltos de catálogos
    if (/^(?:p[áa]gina|page)\s*\d+/i.test(line)) continue
    if (/^\d+\s*$/.test(line) && buffer.length === 0) continue

    const isPriceOnly = /^\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:usd|\$)?$/i.test(line)
    const hasInlinePrice = /\$\s*\d+(?:[.,]\d{1,2})?|\b(?:usd|pvp|precio)\s*\d+/i.test(line)
    const startsLowercase = /^[a-záéíóúñü]/.test(line)
    const wordCount = line.split(/\s+/).length
    const isContinuationWord =
      startsLowercase ||
      wordCount <= 2 ||
      /^(?:brillo|efecto|espejo|f[óo]rmula|duraci[óo]n|acabado|cobertura|textura|hidratante|resistente|agua|larga|horas|tono|tonos|color|colores|mate|satinado|luminoso|natural|vegano|cruelty|contenido|neto|ml|gr|oz)\b/i.test(
        line
      )

    if (isPriceOnly) {
      const hasNonPriceText = buffer.some(
        (b) => !/^\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:usd|\$)?$/i.test(b.trim())
      )
      const alreadyHasPrice = buffer.some((b) =>
        /^\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:usd|\$)?$/i.test(b.trim())
      )

      if (hasNonPriceText && alreadyHasPrice) {
        // El precio anterior era del producto actual; cerramos el producto actual e iniciamos el siguiente con este nuevo precio
        flushBuffer()
        buffer.push(line)
      } else if (hasNonPriceText && !alreadyHasPrice) {
        // El precio estaba al final del producto actual
        buffer.push(line)
        flushBuffer()
      } else {
        // El precio viene al inicio del producto (arriba del título): guardarlo y esperar el título y descripción
        buffer.push(line)
      }
      continue
    }

    if (hasInlinePrice && buffer.length > 0) {
      buffer.push(line)
      flushBuffer()
      continue
    }

    if (buffer.length === 0) {
      buffer.push(line)
      if (hasInlinePrice && line.includes('-')) {
        flushBuffer()
      }
      continue
    }

    // Si la línea actual es continuación de descripción o aún solo llevamos la marca en el buffer
    if (isContinuationWord || buffer.length < 2 || buffer.length < 8) {
      // Pero si ya tenemos >= 3 líneas en el buffer y aparece una nueva Marca o Producto en mayúsculas claro, cerramos el anterior
      const isNewBrandHeader =
        buffer.length >= 3 &&
        !startsLowercase &&
        /^(?:nyx|maybelline|l'or[eé]al|loreal|mac|dior|chanel|fenty|rare\s+beauty|nars|milani|elf|essence|catrice|revlon|covergirl|clinique|sephora|oasis|huda|benefit|urban\s+decay|tarte|morphe|kiko|bissu|vogue|ruby\s+rose|italia\s+deluxe|beauty\s+creations)/i.test(
          line
        )

      if (isNewBrandHeader) {
        flushBuffer()
        buffer.push(line)
      } else {
        buffer.push(line)
      }
    } else {
      flushBuffer()
      buffer.push(line)
    }
  }

  flushBuffer()
  return consolidated
}

/**
 * Parsea texto CSV / TSV (Excel copiado o archivo .csv) o listado de texto libre
 * y clasifica todos los productos automáticamente.
 */
export function parseBulkCatalogText(rawText) {
  if (!rawText || !rawText.trim()) return []

  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (rawLines.length === 0) return []

  const lines = consolidateWrappedCatalogLines(rawLines)

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
    // Si la línea contiene separadores " - " y no tiene encabezados CSV, procesarla por bloques de guiones
    // (así evitamos partir precios con coma decimal como "$3,50" en columnas separadas)
    const isDashFormatted = !hasHeader && /\s+[-–|]\s+/.test(line) && !line.includes('\t')
    const cells = isDashFormatted ? [line] : splitLine(line)

    let rawName = ''
    let rawDesc = ''
    let rawPrice = ''
    let rawCategory = ''
    let rawStock = '25'
    let rawShades = ''
    let rawImage = ''
    let rawBadge = ''

    if (isDashFormatted || (!hasHeader && cells.length === 1 && line.includes('-'))) {
      const dashParts = line
        .split(/\s+[-–|]\s+/)
        .map((p) => p.trim())
        .filter(Boolean)

      // Detectar cuál(es) segmento(s) son precios puros (ej. "$4", "$3,50", "USD 12")
      const isPurePricePart = (p) =>
        /^(?:\$\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*\$|(?:usd|pvp|precio)\s*\$?\s*\d+(?:[.,]\d{1,2})?)$/i.test(
          p.trim()
        )

      const priceParts = dashParts.filter(isPurePricePart)
      const textOnlyParts = dashParts.filter((p) => !isPurePricePart(p))

      if (priceParts.length > 0) {
        rawPrice = priceParts[0]
      } else {
        const inlinePricePart = dashParts.find((p) => /\$\s*\d+(?:[.,]\d{1,2})?/.test(p))
        if (inlinePricePart) {
          const m = inlinePricePart.match(/\$\s*\d+(?:[.,]\d{1,2})?/)
          if (m) rawPrice = m[0]
        }
      }

      // Si el primer segmento de texto tenía un precio pegado al inicio (ej. "$4 NYX Professional Makeup"), limpiarlo
      const cleanedTextParts = textOnlyParts
        .map((p) => p.replace(/^\$\s*\d+(?:[.,]\d{1,2})?\s*[-–:]?\s*/i, '').trim())
        .filter(Boolean)

      rawName = cleanedTextParts[0] || ''
      rawDesc = cleanedTextParts.slice(1).join(' • ')
      if (!rawPrice) rawPrice = '25'
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
        try {
          const workerBlob = new Blob(
            [
              `importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');`,
            ],
            { type: 'application/javascript' }
          )
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob)
        } catch {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
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

const KNOWN_BRAND_REGEX =
  /^(?:nyx(?:\s+professional\s+makeup)?|maybelline(?:\s+new\s+york)?|l'or[eé]al(?:\s+paris)?|loreal|mac|dior|chanel|fenty(?:\s+beauty)?|rare\s+beauty|charlotte(?:\s+tilbury)?|nars|milani|elf|e\.l\.f\.|essence|catrice|revlon|covergirl|clinique|est[eé]e\s+lauder|lancome|lanc[oô]me|ysl|sephora|oasis|huda(?:\s+beauty)?|anastasia|benefit|too\s+faced|urban\s+decay|tarte|morphe|kiko|bissu|vogue|samy|ruby\s+rose|italia\s+deluxe|beauty\s+creations|pink\s+up|sheglam|pixi|glossier|milk(?:\s+makeup)?|pat\s+mcgrath|kosas|saie|tower\s+28|ilia|haus\s+labs|kylie|rhode|colourpop)$/i

function isStandalonePriceString(str) {
  return /^(?:\$\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*\$|(?:usd|pvp|precio)\s*\$?\s*\d+(?:[.,]\d{1,2})?)$/i.test(
    str.trim()
  )
}

/**
 * Construye bloques de texto 2D respetando columnas (no mezcla columna izquierda con columna derecha)
 */
function buildColumnAwareTextBlocks(textContent, viewport, scale, pdfjsLib) {
  const rawItems = []
  const textBoxesCanvas = []

  for (const item of textContent.items) {
    const str = (item.str || '').trim()
    if (!str) continue
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
    const x = tx[4]
    const y = tx[5]
    const w = Math.max(10, (item.width || str.length * 5.2) * scale)
    const h = Math.max(10, Math.abs(tx[3]) || 14)

    textBoxesCanvas.push({ x, y: y - h, w, h: h * 1.3 })
    rawItems.push({ str, x, endX: x + w, y, w, h })
  }

  // 1. Agrupar por renglón horizontal, pero PARTIR si hay un hueco horizontal (> 26px) entre columnas
  rawItems.sort((a, b) => (Math.abs(a.y - b.y) <= 6 ? a.x - b.x : a.y - b.y))

  const lineSegments = []
  for (const it of rawItems) {
    // Buscar si existe un segmento en la misma línea Y y cercano en X (misma columna)
    let seg = lineSegments.find(
      (s) =>
        Math.abs(s.y - it.y) <= 6.5 &&
        it.x - s.endX <= Math.max(26, s.h * 1.6) &&
        it.x >= s.x - 10
    )
    if (!seg) {
      seg = {
        x: it.x,
        endX: it.endX,
        y: it.y,
        h: it.h,
        parts: [it.str],
      }
      lineSegments.push(seg)
    } else {
      seg.parts.push(it.str)
      seg.endX = Math.max(seg.endX, it.endX)
      seg.h = Math.max(seg.h, it.h)
    }
  }

  const segments = lineSegments
    .map((s) => {
      const text = s.parts.join(' ').replace(/\s{2,}/g, ' ').trim()
      return {
        text,
        x: s.x,
        endX: s.endX,
        cx: (s.x + s.endX) / 2,
        y: s.y,
        h: s.h,
        isPrice: isStandalonePriceString(text),
      }
    })
    .filter((s) => {
      if (!s.text || s.text.length < 2) return false
      if (/^p[áa]gina\s+\d+/i.test(s.text)) return false
      if (/^(?:cat[áa]logo|lista de precios|índice|indice)\s*$/i.test(s.text)) return false
      return true
    })

  // 2. Unir verticalmente los segmentos que pertenecen al mismo párrafo/columna (misma X izquierda o centro X cercano)
  segments.sort((a, b) => a.y - b.y)
  const paragraphs = []

  for (const seg of segments) {
    if (seg.isPrice) {
      paragraphs.push({
        lines: [seg.text],
        x: seg.x,
        endX: seg.endX,
        cx: seg.cx,
        topY: seg.y,
        bottomY: seg.y,
        cy: seg.y,
        maxH: seg.h,
        isPrice: true,
      })
      continue
    }

    // Buscar párrafo abierto en la misma columna justo arriba de este segmento
    const candidate = paragraphs.find((p) => {
      if (p.isPrice) return false
      const dy = seg.y - p.bottomY
      const maxAllowedDy = Math.max(24, p.maxH * 1.85)
      if (dy < -2 || dy > maxAllowedDy) return false

      // No unir si hay mucha diferencia de tamaño de fuente (ej. Título grande vs descripción pequeña)
      const fontRatio = Math.max(seg.h, p.maxH) / Math.max(1, Math.min(seg.h, p.maxH))
      if (fontRatio > 1.32) return false

      // No unir si el párrafo anterior era una marca sola
      if (p.lines.length === 1 && KNOWN_BRAND_REGEX.test(p.lines[0])) return false

      const alignedLeft = Math.abs(seg.x - p.x) <= 42
      const alignedCenter = Math.abs(seg.cx - p.cx) <= 48
      return alignedLeft || alignedCenter
    })

    if (candidate) {
      candidate.lines.push(seg.text)
      candidate.x = Math.min(candidate.x, seg.x)
      candidate.endX = Math.max(candidate.endX, seg.endX)
      candidate.cx = (candidate.x + candidate.endX) / 2
      candidate.bottomY = seg.y
      candidate.cy = (candidate.topY + candidate.bottomY) / 2
      candidate.maxH = Math.max(candidate.maxH, seg.h)
    } else {
      paragraphs.push({
        lines: [seg.text],
        x: seg.x,
        endX: seg.endX,
        cx: seg.cx,
        topY: seg.y,
        bottomY: seg.y,
        cy: seg.y,
        maxH: seg.h,
        isPrice: false,
      })
    }
  }

  const finalBlocks = paragraphs.map((p) => ({
    text: p.lines.join(' ').replace(/\s{2,}/g, ' ').trim(),
    x: p.x,
    cx: p.cx,
    topY: p.topY,
    bottomY: p.bottomY,
    cy: p.cy,
    maxH: p.maxH,
    isPrice: p.isPrice,
  }))

  return { blocks: finalBlocks, textBoxesCanvas }
}

/**
 * Agrupa fotos que están en la misma franja horizontal de la página (ej. foto principal + círculo de tono/detalle)
 * para que pertenezcan al MISMO producto como galería y NO clonen el producto en 2 filas.
 */
function clusterPagePhotosIntoBands(pagePhotos, pageHeight) {
  if (!pagePhotos || pagePhotos.length === 0) return []
  const sorted = [...pagePhotos].sort((a, b) => a.cy - b.cy)
  const bands = []
  const bandThresholdY = pageHeight * 0.22

  for (const photo of sorted) {
    const existingBand = bands.find((b) => Math.abs(b.cy - photo.cy) <= bandThresholdY)
    if (existingBand) {
      existingBand.photos.push(photo)
      // Ordenar fotos de la franja por área de mayor a menor para que la foto principal sea la portada
      existingBand.photos.sort((a, b) => b.width * b.height - a.width * a.height)
      existingBand.mainPhoto = existingBand.photos[0]
      existingBand.cy =
        existingBand.photos.reduce((acc, p) => acc + p.cy, 0) / existingBand.photos.length
      existingBand.cx = existingBand.mainPhoto.cx
    } else {
      bands.push({
        mainPhoto: photo,
        photos: [photo],
        cx: photo.cx,
        cy: photo.cy,
      })
    }
  }
  return bands
}

/**
 * A partir de los bloques de texto 2D y las franjas de fotos de una página, construye los productos completos
 */
function assemblePageProducts(textBlocks, pageHeight, photoBands) {
  if (textBlocks.length === 0 && photoBands.length === 0) return []

  // Si hay franjas de fotos en la página (ej. 1, 2, 3 o 4 productos por página), asignar cada bloque de texto a su franja
  let numBands = photoBands.length
  if (numBands > 0) {
    const buckets = photoBands.map((band) => ({
      band,
      blocks: [],
    }))

    for (const blk of textBlocks) {
      let bestBucket = buckets[0]
      let bestDist = Infinity
      for (const bkt of buckets) {
        // Priorizar cercanía vertical (misma franja horizontal de producto)
        const dy = Math.abs(bkt.band.cy - blk.cy)
        const dx = Math.abs(bkt.band.cx - blk.cx)
        const dist = dy + dx * 0.18
        if (dist < bestDist) {
          bestDist = dist
          bestBucket = bkt
        }
      }
      bestBucket.blocks.push(blk)
    }

    const results = []
    for (const bkt of buckets) {
      if (bkt.blocks.length === 0 && bkt.band.photos.length === 0) continue
      const built = buildSingleProductFromBlocks(bkt.blocks, bkt.band.photos)
      if (built) results.push(built)
    }
    return results
  }

  // Si no hubo fotos detectadas, agrupar bloques por precios o distancia vertical
  const consolidated = consolidateWrappedCatalogLines(textBlocks.map((b) => b.text))
  return consolidated.map((lineText) => ({
    lineText,
    photos: [],
    explicitName: null,
    explicitDesc: null,
    explicitPrice: null,
  }))
}

function buildSingleProductFromBlocks(blocks, photos = []) {
  const priceBlocks = []
  const contentBlocks = []

  for (const blk of blocks) {
    if (blk.isPrice || isStandalonePriceString(blk.text)) {
      priceBlocks.push(blk)
    } else {
      // Verificar si el texto empieza o termina con un precio pegado (ej. "$4 NYX Professional Makeup")
      const leadingPrice = blk.text.match(/^\$\s*(\d+(?:[.,]\d{1,2})?)\s+(.+)$/)
      if (leadingPrice) {
        priceBlocks.push({ ...blk, text: `$${leadingPrice[1]}` })
        contentBlocks.push({ ...blk, text: leadingPrice[2].trim() })
      } else {
        contentBlocks.push(blk)
      }
    }
  }

  let extractedPrice = null
  if (priceBlocks.length > 0) {
    extractedPrice = extractPriceFromText(priceBlocks[0].text, 25.0)
  } else {
    for (const cb of contentBlocks) {
      if (/\$\s*\d+(?:[.,]\d{1,2})?/.test(cb.text)) {
        extractedPrice = extractPriceFromText(cb.text, 25.0)
        cb.text = cb.text.replace(/\$\s*\d+(?:[.,]\d{1,2})?/g, '').trim()
      }
    }
  }

  const cleanContent = contentBlocks.filter((b) => b.text && b.text.length >= 2)
  if (cleanContent.length === 0 && photos.length === 0) return null

  // Ordenar los bloques de contenido de arriba hacia abajo (topY)
  cleanContent.sort((a, b) => (Math.abs(a.topY - b.topY) <= 10 ? a.x - b.x : a.topY - b.topY))

  let productName = ''
  let descBlocks = []

  if (cleanContent.length > 0) {
    const first = cleanContent[0]
    const second = cleanContent[1]

    // Si el primer bloque es una marca o línea muy corta y hay un segundo bloque de título arriba
    if (
      second &&
      (KNOWN_BRAND_REGEX.test(first.text) ||
        (first.text.split(/\s+/).length <= 3 && second.topY - first.bottomY <= 36))
    ) {
      // Evitar unir si el segundo bloque ya es una oración larga de descripción (> 6 palabras)
      if (second.text.split(/\s+/).length <= 6) {
        productName = `${first.text} ${second.text}`.replace(/\s{2,}/g, ' ').trim()
        descBlocks = cleanContent.slice(2)
      } else {
        productName = first.text
        descBlocks = cleanContent.slice(1)
      }
    } else {
      productName = first.text
      descBlocks = cleanContent.slice(1)
    }
  }

  // Ordenar los bloques de descripción por columna (izquierda primero de arriba a abajo, luego derecha de arriba a abajo)
  descBlocks.sort((a, b) => (Math.abs(a.topY - b.topY) <= 14 ? a.x - b.x : a.topY - b.topY))
  const descriptionText = descBlocks
    .map((b) => b.text)
    .join(' • ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const finalPrice = extractedPrice !== null ? extractedPrice : 25.0
  const lineText = [
    productName || 'Producto Oasis',
    descriptionText,
    `$${finalPrice}`,
  ]
    .filter(Boolean)
    .join(' - ')

  return {
    lineText,
    photos,
    explicitName: productName,
    explicitDesc: descriptionText,
    explicitPrice: finalPrice,
  }
}

/**
 * Extrae el texto y las imágenes reales de productos desde un archivo .PDF renderizando cada página
 */
export async function extractCatalogFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const rawEmbeddedImages = await extractEmbeddedJpegsFromPdfBuffer(arrayBuffer)
  let allAssembledProducts = []
  let allPagePhotos = []

  try {
    const pdfjsLib = await loadPdfJs()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const scale = 1.6
      const viewport = page.getViewport({ scale })

      // 1. Renderizar la página en un canvas de alta nitidez
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = Math.floor(viewport.width)
      pageCanvas.height = Math.floor(viewport.height)
      const pageCtx = pageCanvas.getContext('2d')
      await page.render({ canvasContext: pageCtx, viewport }).promise

      // 2. Extraer bloques de texto 2D respetando columnas
      const textContent = await page.getTextContent()
      const { blocks: textBlocks, textBoxesCanvas } = buildColumnAwareTextBlocks(
        textContent,
        viewport,
        scale,
        pdfjsLib
      )

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

            const isFullPageBg = bw > viewport.width * 0.93 && bh > viewport.height * 0.93
            if (bw >= 48 && bh >= 48 && !isFullPageBg) {
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

      if (pagePhotos.length === 0) {
        pagePhotos = detectVisualPhotoRegionsOnPage(pageCanvas, textBoxesCanvas)
      }

      if (pagePhotos.length === 0 && textBlocks.length > 0) {
        const fallbackCrop = cropCanvasRegion(
          pageCanvas,
          viewport.width * 0.08,
          viewport.height * 0.06,
          viewport.width * 0.84,
          viewport.height * 0.55
        )
        if (fallbackCrop) pagePhotos.push(fallbackCrop)
      }

      // 4. Agrupar fotos de la misma franja horizontal en un único producto (para no clonar filas)
      const photoBands = clusterPagePhotosIntoBands(pagePhotos, viewport.height)

      // 5. Ensamblar productos de la página
      const pageProducts = assemblePageProducts(textBlocks, viewport.height, photoBands)
      allAssembledProducts.push(...pageProducts)
      allPagePhotos.push(...pagePhotos)
    }
  } catch {
    const nativeText = await extractTextFromPdfBufferNative(arrayBuffer)
    const rawLines = nativeText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 2 && !/^p[áa]gina\s+\d+/i.test(l))
    const consolidatedLines = consolidateWrappedCatalogLines(rawLines)
    allAssembledProducts = consolidatedLines.map((lineText, idx) => ({
      lineText,
      photos: rawEmbeddedImages[idx] ? [rawEmbeddedImages[idx]] : [],
      explicitName: null,
      explicitDesc: null,
      explicitPrice: null,
    }))
  }

  const textLinesForBox = []
  const finalItems = []
  const baseMeta = parseFilenameMetadata(file.name)

  allAssembledProducts.forEach((entry, idx) => {
    const photos =
      entry.photos && entry.photos.length > 0
        ? entry.photos
        : rawEmbeddedImages[idx]
          ? [rawEmbeddedImages[idx]]
          : []
    const mainPhoto = photos[0] || null
    const allPhotoUrls = photos.map((p) => p.dataUrl).filter(Boolean)

    if (entry.explicitName) {
      const rule = autoClassifyProduct(entry.explicitName, entry.explicitDesc || '')
      const autoCopy = autoGenerateCopy(entry.explicitName, rule.category)
      const finalDesc = entry.explicitDesc || autoCopy.description
      const finalPrice = entry.explicitPrice ?? 25.0
      const shades =
        mainPhoto?.dominantColors?.length >= 1
          ? mainPhoto.dominantColors
          : rule.defaultShades

      textLinesForBox.push(`${entry.explicitName} - ${finalDesc} - $${finalPrice}`)
      finalItems.push({
        id: `pdf-prod-${Date.now()}-${idx}`,
        name: entry.explicitName,
        category: rule.category,
        price: finalPrice,
        stock: 25,
        tagline: finalDesc.slice(0, 58),
        description: finalDesc,
        shades,
        defaultShade: 0,
        badge: 'Nuevo',
        icon: rule.icon,
        gradient: rule.gradient,
        image: allPhotoUrls[0] || '',
        images: allPhotoUrls,
        includeInPack: true,
      })
    } else if (entry.lineText) {
      textLinesForBox.push(entry.lineText)
      const parsed = parseBulkCatalogText(entry.lineText)[0]
      if (parsed) {
        const shades =
          mainPhoto?.dominantColors?.length >= 1 ? mainPhoto.dominantColors : parsed.shades
        finalItems.push({
          ...parsed,
          id: `pdf-prod-${Date.now()}-${idx}`,
          image: allPhotoUrls[0] || parsed.image || '',
          images: allPhotoUrls.length > 0 ? allPhotoUrls : parsed.images || [],
          shades,
        })
      }
    } else if (mainPhoto) {
      const hint = mainPhoto.visualHint || inferVisualProductHint(mainPhoto.dominantColors)
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
          mainPhoto.dominantColors?.length >= 1
            ? mainPhoto.dominantColors
            : rule.defaultShades,
        defaultShade: 0,
        badge: 'Nuevo',
        icon: rule.icon,
        gradient: rule.gradient,
        image: allPhotoUrls[0] || '',
        images: allPhotoUrls,
        includeInPack: true,
      })
    }
  })

  const photosAttachedCount = finalItems.reduce(
    (acc, it) => acc + (it.images?.length || (it.image ? 1 : 0)),
    0
  )

  return {
    text: textLinesForBox.join('\n'),
    items: finalItems,
    embeddedImagesCount: photosAttachedCount || allPagePhotos.length || rawEmbeddedImages.length,
  }
}


