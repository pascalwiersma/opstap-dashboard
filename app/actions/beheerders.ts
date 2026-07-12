'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type Beheerder = {
  id: string
  phone: string | null
  name: string | null
  dashboard_role: 'admin' | 'national' | 'provincial'
  province_id: string | null
  province_name: string | null
}

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-]/g, '')
  if (/^06\d{8}$/.test(cleaned)) return '+31' + cleaned.slice(1)
  if (/^\+316\d{8}$/.test(cleaned)) return cleaned
  return null
}

export async function getBeheerder(id: string): Promise<Beheerder | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, phone, name, dashboard_role, province_id, provinces(name)')
    .eq('id', id)
    .single()

  if (error) return null
  return {
    id: data.id,
    phone: data.phone,
    name: data.name,
    dashboard_role: data.dashboard_role as 'admin' | 'national' | 'provincial',
    province_id: data.province_id,
    province_name: (data.provinces as unknown as { name: string } | null)?.name ?? null,
  }
}

export async function getBeheerders(): Promise<Beheerder[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, phone, name, dashboard_role, province_id, provinces(name)')
    .not('dashboard_role', 'is', null)
    .order('name')

  if (error) throw new Error(error.message)

  return (data ?? []).map(p => ({
    id: p.id,
    phone: p.phone,
    name: p.name,
    dashboard_role: p.dashboard_role as 'admin' | 'national' | 'provincial',
    province_id: p.province_id,
    province_name: (p.provinces as unknown as { name: string } | null)?.name ?? null,
  }))
}

export async function addBeheerder(
  phone: string,
  name: string,
  role: 'admin' | 'national' | 'provincial',
  province_id?: string
) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new Error('Ongeldig telefoonnummer. Gebruik een Nederlands mobiel nummer, bijv. 06 12345678.')

  const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: normalized,
    phone_confirm: true,
  })
  if (createError) {
    throw new Error(
      createError.message.includes('already been registered')
        ? 'Dit telefoonnummer heeft al een account. Neem contact op als dit een bestaande gebruiker betreft.'
        : createError.message
    )
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: data.user.id,
      phone: normalized,
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
