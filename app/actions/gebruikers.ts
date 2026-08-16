'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { voegNaamSamen } from '@/lib/naam'
import { eisPermissie } from '@/lib/eis-permissie'
import { revalidatePath } from 'next/cache'

const MIN_WACHTWOORD = 8

export type Gebruiker = {
  id: string
  phone: string | null
  name: string | null
  dashboard_role: string
  dashboard_role_name: string
  totp_ingeschakeld: boolean
}

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-]/g, '')
  if (/^06\d{8}$/.test(cleaned)) return '+31' + cleaned.slice(1)
  if (/^\+316\d{8}$/.test(cleaned)) return cleaned
  return null
}

function valideerWachtwoord(wachtwoord: string, bevestiging: string): string | null {
  if (!wachtwoord && !bevestiging) return null
  if (wachtwoord !== bevestiging) return 'Wachtwoorden komen niet overeen.'
  if (wachtwoord.length < MIN_WACHTWOORD) {
    return `Wachtwoord moet minimaal ${MIN_WACHTWOORD} tekens zijn.`
  }
  return null
}

function totpTabelOntbreekt(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || error.message.toLowerCase().includes('does not exist')
}

async function totpIds(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('dashboard_totp')
    .select('user_id, verified, enabled')
  if (error) {
    if (totpTabelOntbreekt(error)) return new Set()
    throw new Error(error.message)
  }
  return new Set((data ?? []).flatMap(rij => {
    if (typeof rij.user_id !== 'string') return []
    if (rij.verified !== true || rij.enabled !== true) return []
    return [rij.user_id]
  }))
}

async function rolNamen(): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin.from('dashboard_roles').select('slug, name')
  if (error || !data) return new Map()
  return new Map(data.map(r => [r.slug, r.name]))
}

function naarGebruiker(
  rij: { id: string; phone: string | null; name: string | null; dashboard_role: string },
  totp: Set<string>,
  namen: Map<string, string>,
): Gebruiker {
  return {
    id: rij.id,
    phone: rij.phone,
    name: rij.name,
    dashboard_role: rij.dashboard_role,
    dashboard_role_name: namen.get(rij.dashboard_role) ?? rij.dashboard_role,
    totp_ingeschakeld: totp.has(rij.id),
  }
}

export async function getGebruiker(id: string): Promise<Gebruiker | null> {
  await eisPermissie('gebruikers', 'zien')
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, phone, name, dashboard_role')
    .eq('id', id)
    .single()

  if (error || !data?.dashboard_role) return null
  const totp = await totpIds()
  const namen = await rolNamen()
  return naarGebruiker(data, totp, namen)
}

export async function getGebruikers(): Promise<Gebruiker[]> {
  await eisPermissie('gebruikers', 'zien')
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, phone, name, dashboard_role')
    .not('dashboard_role', 'is', null)
    .order('name')

  if (error) throw new Error(error.message)
  const totp = await totpIds()
  const namen = await rolNamen()
  return (data ?? []).map(rij => naarGebruiker(rij, totp, namen))
}

export async function addGebruiker(input: {
  voornaam: string
  achternaam: string
  phone: string
  role: string
  wachtwoord: string
  wachtwoordBevestiging: string
}): Promise<string> {
  await eisPermissie('gebruikers', 'toevoegen')
  const normalized = normalizePhone(input.phone)
  if (!normalized) {
    throw new Error('Ongeldig telefoonnummer. Gebruik een Nederlands mobiel nummer, bijv. 06 12345678.')
  }
  const naam = voegNaamSamen(input.voornaam, input.achternaam)
  if (!naam) throw new Error('Voornaam of achternaam is verplicht.')

  const wachtwoordFout = valideerWachtwoord(input.wachtwoord, input.wachtwoordBevestiging)
  if (wachtwoordFout) throw new Error(wachtwoordFout)

  const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: normalized,
    phone_confirm: true,
    ...(input.wachtwoord ? { password: input.wachtwoord } : {}),
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
      name: naam,
      dashboard_role: input.role,
      is_admin: false,
    })

  if (profileError) throw new Error(profileError.message)
  revalidatePath('/gebruikers')
  return data.user.id
}

export async function updateGebruiker(input: {
  id: string
  voornaam: string
  achternaam: string
  phone: string
  role: string
  wachtwoord: string
  wachtwoordBevestiging: string
}) {
  await eisPermissie('gebruikers', 'bewerken')
  const normalized = normalizePhone(input.phone)
  if (!normalized) {
    throw new Error('Ongeldig telefoonnummer. Gebruik een Nederlands mobiel nummer, bijv. 06 12345678.')
  }
  const naam = voegNaamSamen(input.voornaam, input.achternaam)
  if (!naam) throw new Error('Voornaam of achternaam is verplicht.')

  const wachtwoordFout = valideerWachtwoord(input.wachtwoord, input.wachtwoordBevestiging)
  if (wachtwoordFout) throw new Error(wachtwoordFout)

  const authUpdate: { phone: string; phone_confirm: true; password?: string } = {
    phone: normalized,
    phone_confirm: true,
  }
  if (input.wachtwoord) authUpdate.password = input.wachtwoord

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(input.id, authUpdate)
  if (authError) throw new Error(authError.message)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      dashboard_role: input.role,
      phone: normalized,
      name: naam,
    })
    .eq('id', input.id)

  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
  revalidatePath(`/gebruikers/${input.id}`)
}

export async function removeGebruiker(id: string) {
  await eisPermissie('gebruikers', 'verwijderen')
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ dashboard_role: null })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}
