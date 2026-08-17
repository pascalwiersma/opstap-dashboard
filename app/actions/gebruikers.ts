'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { voegNaamSamen } from '@/lib/naam'
import { eisPermissie } from '@/lib/eis-permissie'
import { getCurrentUser } from '@/lib/supabase-server'
import { totpTabelOntbreekt } from '@/lib/totp-status'
import { revalidatePath } from 'next/cache'

const MIN_WACHTWOORD = 8
const ADMIN_SLUG = 'admin'

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

function valideerNieuwWachtwoord(wachtwoord: string, bevestiging: string): string | null {
  if (!wachtwoord) return 'Wachtwoord is verplicht.'
  return valideerWachtwoord(wachtwoord, bevestiging)
}

async function huidigeRol(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('dashboard_role')
    .eq('id', userId)
    .single()
  return typeof data?.dashboard_role === 'string' ? data.dashboard_role : null
}

function magAdminToewijzen(actorRole: string): boolean {
  return actorRole === ADMIN_SLUG
}

import { totpTabelOntbreekt } from '@/lib/totp-status'

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
  const actor = await eisPermissie('gebruikers', 'toevoegen')
  if (input.role === ADMIN_SLUG && !magAdminToewijzen(actor.role)) {
    throw new Error('Alleen een admin kan de admin-rol toewijzen.')
  }
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
  const actor = await eisPermissie('gebruikers', 'bewerken')
  const bestaandeRol = await huidigeRol(input.id)
  if (!bestaandeRol) throw new Error('Gebruiker niet gevonden.')

  const zelf = actor.id === input.id
  if (zelf && input.role !== bestaandeRol) {
    throw new Error('Je kunt je eigen rol niet wijzigen.')
  }
  if (input.role === ADMIN_SLUG && !magAdminToewijzen(actor.role)) {
    throw new Error('Alleen een admin kan de admin-rol toewijzen.')
  }
  if (bestaandeRol === ADMIN_SLUG && !magAdminToewijzen(actor.role) && input.role !== bestaandeRol) {
    throw new Error('Alleen een admin kan de admin-rol wijzigen.')
  }
  const rol = zelf ? bestaandeRol : input.role
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
      dashboard_role: rol,
      phone: normalized,
      name: naam,
    })
    .eq('id', input.id)

  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
  revalidatePath(`/gebruikers/${input.id}`)
}

export async function removeGebruiker(id: string) {
  const actor = await eisPermissie('gebruikers', 'verwijderen')
  if (actor.id === id) {
    throw new Error('Je kunt jezelf niet verwijderen.')
  }
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ dashboard_role: null })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
}

export async function updateEigenWachtwoord(wachtwoord: string, bevestiging: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Niet ingelogd.')
  const fout = valideerNieuwWachtwoord(wachtwoord, bevestiging)
  if (fout) throw new Error(fout)

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: wachtwoord })
  if (error) throw new Error(error.message)
  revalidatePath('/account')
}

export async function eigenTotpIngeschakeld(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Niet ingelogd.')
  const totp = await totpIds()
  return totp.has(user.id)
}
