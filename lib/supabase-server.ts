import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  email: string
  name: string | null
  role: 'admin' | 'national' | 'provincial'
  province_id: string | null
  province_name: string | null
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
    email: user.email ?? '',
    name: profile.name,
    role: profile.dashboard_role as 'admin' | 'national' | 'provincial',
    province_id: profile.province_id,
    province_name,
  }
})
