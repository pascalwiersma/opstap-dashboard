'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type Beheerder = {
  id: string
  email: string | null
  name: string | null
  dashboard_role: 'admin' | 'national' | 'provincial'
  province_id: string | null
  province_name: string | null
}

export async function getBeheerder(id: string): Promise<Beheerder | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, dashboard_role, province_id, provinces(name)')
    .eq('id', id)
    .single()

  if (error) return null
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    dashboard_role: data.dashboard_role as 'admin' | 'national' | 'provincial',
    province_id: data.province_id,
    province_name: (data.provinces as unknown as { name: string } | null)?.name ?? null,
  }
}

export async function getBeheerders(): Promise<Beheerder[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, dashboard_role, province_id, provinces(name)')
    .not('dashboard_role', 'is', null)
    .order('name')

  if (error) throw new Error(error.message)

  return (data ?? []).map(p => ({
    id: p.id,
    email: p.email,
    name: p.name,
    dashboard_role: p.dashboard_role as 'admin' | 'national' | 'provincial',
    province_id: p.province_id,
    province_name: (p.provinces as unknown as { name: string } | null)?.name ?? null,
  }))
}

export async function inviteBeheerder(
  email: string,
  name: string,
  role: 'admin' | 'national' | 'provincial',
  province_id?: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=invite`,
  })
  if (inviteError) throw new Error(inviteError.message)

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      name,
      dashboard_role: role,
      province_id: province_id || null,
      is_admin: false,
    })

  if (profileError) throw new Error(profileError.message)
  revalidatePath('/beheerders')
}

export async function updateBeheerder(
  id: string,
  role: 'admin' | 'national' | 'provincial',
  province_id?: string | null
) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ dashboard_role: role, province_id: province_id ?? null })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/beheerders')
}

export async function removeBeheerder(id: string) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ dashboard_role: null, province_id: null })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/beheerders')
}
