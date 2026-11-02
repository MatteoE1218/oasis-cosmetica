/**
 * Cliente ligero nativo de Supabase (REST PostgREST + Auth GoTrue + Storage)
 * No requiere dependencias pesadas externas y funciona tanto con variables .env
 * como con credenciales configuradas desde el Panel de Administrador.
 */

const DEFAULT_SUPABASE_URL = 'https://sbhtmqctxvaxtflzwndm.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_4pjeRjnSG0ACDxO6k6qbpg_N4-Gzgip'

const CONFIG_STORAGE_KEY = 'oasis_supabase_config_v2'
const SESSION_STORAGE_KEY = 'oasis_supabase_session'

export function getSupabaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.url && parsed.anonKey && !parsed.url.includes('sbhtmqctvaxtfzlzwndm')) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  }
}

export function saveSupabaseConfig(url, anonKey) {
  const cleanKey = (anonKey || DEFAULT_SUPABASE_ANON_KEY).trim()
  let cleanUrl = (url || DEFAULT_SUPABASE_URL).trim().replace(/\/$/, '')
  if (cleanUrl.includes('sbhtmqctvaxtfzlzwndm')) {
    cleanUrl = DEFAULT_SUPABASE_URL
  }
  const dashMatch = cleanUrl.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i)
  if (dashMatch) {
    cleanUrl = `https://${dashMatch[1]}.supabase.co`
  }
  const clean = {
    url: cleanUrl,
    anonKey: cleanKey,
  }
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(clean))
  return clean
}

export function getSupabaseSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session
  } catch {
    return null
  }
}

function getHeaders(extra = {}) {
  const { anonKey } = getSupabaseConfig()
  const session = getSupabaseSession()
  const token = session?.access_token
  const headers = {
    apikey: anonKey,
    'Content-Type': 'application/json',
    ...extra,
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else if (anonKey && anonKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${anonKey}`
  }
  return headers
}

/* ── Auth (Supabase GoTrue) ── */
export async function supabaseSignIn(email, password) {
  const { url, anonKey } = getSupabaseConfig()
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || 'Credenciales inválidas en Supabase')
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
  return data
}

export async function supabaseSignUp(email, password) {
  const { url, anonKey } = getSupabaseConfig()
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || 'No se pudo registrar el administrador')
  }
  if (data.access_token) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
  }
  return data
}

export async function supabaseSignOut() {
  const { url } = getSupabaseConfig()
  const session = getSupabaseSession()
  localStorage.removeItem(SESSION_STORAGE_KEY)
  if (session?.access_token) {
    try {
      await fetch(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: getHeaders(),
      })
    } catch {
      // ignore network error on logout
    }
  }
}

/* ── Database (PostgREST: tabla `products`) ── */
export async function fetchProductsFromSupabase() {
  const { url } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/products?select=*&order=created_at.asc`, {
    method: 'GET',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Error HTTP ${res.status}`)
  }
  const rows = await res.json()
  return rows.map(mapDbRowToProduct)
}

export async function upsertProductToSupabase(product) {
  const { url } = getSupabaseConfig()
  const payload = mapProductToDbRow(product)
  const res = await fetch(`${url}/rest/v1/products`, {
    method: 'POST',
    headers: getHeaders({
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Error guardando producto (${res.status})`)
  }
  const data = await res.json()
  return data?.[0] ? mapDbRowToProduct(data[0]) : product
}

export async function upsertManyProductsToSupabase(productsList) {
  const { url } = getSupabaseConfig()
  const payload = productsList.map(mapProductToDbRow)
  const res = await fetch(`${url}/rest/v1/products`, {
    method: 'POST',
    headers: getHeaders({
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Error en subida masiva (${res.status})`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data.map(mapDbRowToProduct) : productsList
}

export async function deleteProductFromSupabase(productId) {
  const { url } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Error eliminando producto (${res.status})`)
  }
  return true
}

/* ── Storage (Bucket `catalog-images`) ── */
export async function uploadImageToSupabase(file) {
  const { url, anonKey } = getSupabaseConfig()
  const session = getSupabaseSession()
  const token = session?.access_token
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const bucket = 'catalog-images'

  const uploadHeaders = {
    apikey: anonKey,
    'Content-Type': file.type || 'image/jpeg',
    'x-upsert': 'true',
  }
  if (token) {
    uploadHeaders.Authorization = `Bearer ${token}`
  } else if (anonKey && anonKey.startsWith('eyJ')) {
    uploadHeaders.Authorization = `Bearer ${anonKey}`
  }

  const res = await fetch(`${url}/storage/v1/object/${bucket}/${safeName}`, {
    method: 'POST',
    headers: uploadHeaders,
    body: file,
  })

  if (!res.ok) {
    throw new Error('Bucket no disponible, usando imagen optimizada embebida')
  }

  return `${url}/storage/v1/object/public/${bucket}/${safeName}`
}

/* ── Mappers entre formato Frontend y Tabla Postgres ── */
export function mapDbRowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'Labiales',
    price: Number(row.price ?? 0),
    stock: row.stock !== undefined && row.stock !== null ? Number(row.stock) : 25,
    tagline: row.tagline || '',
    description: row.description || '',
    shades: Array.isArray(row.shades) && row.shades.length > 0
      ? row.shades
      : [{ name: 'Tono Único', hex: '#d4637a' }],
    defaultShade: Number(row.default_shade ?? 0),
    badge: row.badge || null,
    icon: row.icon || '💄',
    gradient: row.gradient || 'linear-gradient(135deg, #9b1b30, #d4637a)',
    image: row.image_url || row.image || '',
    images: Array.isArray(row.images) ? row.images : (row.image_url ? [row.image_url] : []),
    includeInPack: row.include_in_pack !== false,
  }
}

export function mapProductToDbRow(product) {
  return {
    id: String(product.id),
    name: product.name,
    category: product.category || 'Labiales',
    price: Number(product.price || 0),
    stock: product.stock !== undefined && product.stock !== null ? Number(product.stock) : 25,
    tagline: product.tagline || '',
    description: product.description || '',
    shades: Array.isArray(product.shades) && product.shades.length > 0
      ? product.shades
      : [{ name: 'Tono Único', hex: '#d4637a' }],
    default_shade: Number(product.defaultShade || 0),
    badge: product.badge || null,
    icon: product.icon || '💄',
    gradient: product.gradient || 'linear-gradient(135deg, #9b1b30, #d4637a)',
    image_url: product.image || (product.images && product.images[0]) || null,
    images: Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []),
    include_in_pack: product.includeInPack !== false,
  }
}

/* ── SQL de Configuración Automática para Supabase SQL Editor ── */
export const SUPABASE_SETUP_SQL = `-- 1. Crear tabla de productos del catálogo Oasis Makeup
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'Labiales',
  price numeric(10,2) not null default 0,
  stock integer not null default 25,
  tagline text default '',
  description text default '',
  shades jsonb not null default '[{"name":"Tono Único","hex":"#d4637a"}]'::jsonb,
  default_shade integer not null default 0,
  badge text,
  icon text default '💄',
  gradient text default 'linear-gradient(135deg, #9b1b30, #d4637a)',
  image_url text,
  images jsonb default '[]'::jsonb,
  include_in_pack boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Activar Row Level Security (RLS) y permisos de API
alter table public.products enable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;

-- 3. Políticas de lectura pública y gestión desde el panel
drop policy if exists "Lectura publica del catalogo" on public.products;
create policy "Lectura publica del catalogo"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Gestion del catalogo desde admin" on public.products;
create policy "Gestion del catalogo desde admin"
  on public.products for all
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Crear Bucket público para fotos de productos
insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Fotos publicas catalogo" on storage.objects;
create policy "Fotos publicas catalogo"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'catalog-images');

drop policy if exists "Subida fotos catalogo" on storage.objects;
create policy "Subida fotos catalogo"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'catalog-images');

drop policy if exists "Actualizar fotos catalogo" on storage.objects;
create policy "Actualizar fotos catalogo"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'catalog-images');

-- 5. Recargar caché de esquema de la API de Supabase
NOTIFY pgrst, 'reload schema';
`

