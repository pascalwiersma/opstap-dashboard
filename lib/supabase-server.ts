import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ALLE_PERMISSIES, legacyPermissies, type PermissieSleutel } from '@/lib/permissions'

export const PREVIEW_ROL_COOKIE = 'opstap_dashboard_preview_role'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components kunnen geen cookies schrijven — middleware handelt dit af
          }
        },
      },
    }
  )
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type CurrentUser = {
  id: string
  phone: string
  name: string | null
  role: string
  role_name: string
  echte_role: string
  echte_role_name: string
  preview_role: string | null
  permissions: ReadonlySet<PermissieSleutel>
  echte_permissions: ReadonlySet<PermissieSleutel>
  province_id: string | null
  province_name: string | null
}

type AdminDb = ReturnType<typeof adminClient>

async function laadRol(
  admin: AdminDb,
  slug: string,
): Promise<{ role_name: string; permissions: Set<PermissieSleutel> }> {
  const { data: rolRij, error: rolError } = await admin
    .from('dashboard_roles')
    .select('name, dashboard_role_permissions(resource, action)')
    .eq('slug', slug)
    .maybeSingle()

  const tabelOntbreekt = !!rolError && (
    rolError.code === 'PGRST205' ||
    rolError.code === '42P01' ||
    rolError.message.toLowerCase().includes('does not exist')
  )

  if (tabelOntbreekt || !rolRij) {
    return { role_name: slug, permissions: legacyPermissies(slug) }
  }

  const rijen = (rolRij.dashboard_role_permissions ?? []) as { resource: string; action: string }[]
  const permissions = slug === 'admin'
    ? new Set(ALLE_PERMISSIES)
    : new Set(rijen.map(p => `${p.resource}:${p.action}` as PermissieSleutel))
  return { role_name: rolRij.name, permissions }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = adminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('name, dashboard_role, province_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dashboard_role) return null

  const echteSlug = profile.dashboard_role
  const echteRol = await laadRol(admin, echteSlug)
  const magPreview = echteSlug === 'admin' || echteRol.permissions.has('rollen:bewerken')

  const cookieStore = await cookies()
  const previewSlugRaw = cookieStore.get(PREVIEW_ROL_COOKIE)?.value ?? ''
  const previewSlug = magPreview && previewSlugRaw && previewSlugRaw !== echteSlug
    ? previewSlugRaw
    : null

  let role = echteSlug
  let role_name = echteRol.role_name
  let permissions = echteRol.permissions

  if (previewSlug) {
    const previewRol = await laadRol(admin, previewSlug)
    role = previewSlug
    role_name = previewRol.role_name
    permissions = previewRol.permissions
  }

  let province_name: string | null = null
  if (profile.province_id) {
    const { data: prov } = await admin
      .from('provinces')
      .select('name')
      .eq('id', profile.province_id)
      .single()
    province_name = prov?.name ?? null
  }

  return {
    id: user.id,
    phone: user.phone ?? '',
    name: profile.name,
    role,
    role_name,
    echte_role: echteSlug,
    echte_role_name: echteRol.role_name,
    preview_role: previewSlug,
    permissions,
    echte_permissions: echteRol.permissions,
    province_id: profile.province_id,
    province_name,
  }
})
