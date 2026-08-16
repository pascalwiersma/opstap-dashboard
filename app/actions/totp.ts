'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase-server'
import { eisPermissie } from '@/lib/eis-permissie'
import { authSessionId } from '@/lib/auth-session'
import { nieuwTotpGeheim, totpGeldig, totpIsIngeschakeld, totpQrDataUrl, totpUri } from '@/lib/totp'
import { revalidatePath } from 'next/cache'

export type TotpEnrollment = {
  secret: string
  qrDataUrl: string
  otpauthUrl: string
}

export type TotpLoginStatus = 'setup' | 'code' | 'ok'

type TotpRij = {
  secret: string
  verified: boolean
  enabled: boolean
  verified_session_id: string | null
}

function totpTabelOntbreekt(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || error.message.toLowerCase().includes('does not exist')
}

async function eisAdmin() {
  const user = await eisPermissie('gebruikers', 'bewerken')
  return user
}

async function qrVoor(secret: string, label: string): Promise<TotpEnrollment> {
  const otpauthUrl = totpUri(secret, label)
  const qrDataUrl = await totpQrDataUrl(otpauthUrl)
  return { secret, qrDataUrl, otpauthUrl }
}

async function totpLabel(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('phone, name')
    .eq('id', userId)
    .single()
  return data?.phone || data?.name || userId
}

async function haalTotpRij(userId: string): Promise<TotpRij | null> {
  const { data, error } = await supabaseAdmin
    .from('dashboard_totp')
    .select('secret, verified, enabled, verified_session_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (totpTabelOntbreekt(error)) return null
    throw new Error(error.message)
  }
  if (!data?.secret || typeof data.secret !== 'string') return null
  return {
    secret: data.secret,
    verified: data.verified === true,
    enabled: data.enabled === true,
    verified_session_id: typeof data.verified_session_id === 'string' ? data.verified_session_id : null,
  }
}

async function enrollmentVoor(userId: string, label: string): Promise<TotpEnrollment> {
  const secret = nieuwTotpGeheim()
  const enrollment = await qrVoor(secret, label)

  const { error } = await supabaseAdmin
    .from('dashboard_totp')
    .upsert({
      user_id: userId,
      secret,
      enrolled_at: new Date().toISOString(),
      verified_session_id: null,
      verified: false,
      enabled: false,
    })

  if (error) throw new Error(error.message)
  return enrollment
}

function revalidateGebruiker(userId: string) {
  revalidatePath('/gebruikers')
  revalidatePath(`/gebruikers/${userId}`)
}

async function bevestigGeheim(userId: string, code: string, bindSession: boolean): Promise<void> {
  const rij = await haalTotpRij(userId)
  if (!rij) throw new Error('Er is nog geen 2FA-geheim. Scan eerst de QR-code.')

  if (!totpGeldig(rij.secret, code)) {
    throw new Error('Ongeldige of verlopen code.')
  }

  const update: {
    verified: boolean
    enabled: boolean
    enrolled_at: string
    verified_session_id?: string
  } = {
    verified: true,
    enabled: true,
    enrolled_at: new Date().toISOString(),
  }

  if (bindSession) {
    const supabase = await createSupabaseServerClient()
    const sessionId = await authSessionId(supabase)
    if (!sessionId) throw new Error('Sessie ontbreekt. Log opnieuw in.')
    update.verified_session_id = sessionId
  }

  const { error } = await supabaseAdmin
    .from('dashboard_totp')
    .update(update)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidateGebruiker(userId)
}

export async function enrollTotp(userId: string): Promise<TotpEnrollment> {
  await eisAdmin()
  const enrollment = await enrollmentVoor(userId, await totpLabel(userId))
  revalidateGebruiker(userId)
  return enrollment
}

export async function resetTotp(userId: string): Promise<TotpEnrollment> {
  await eisAdmin()
  const enrollment = await enrollmentVoor(userId, await totpLabel(userId))
  revalidateGebruiker(userId)
  return enrollment
}

export async function bevestigTotpVoorGebruiker(userId: string, code: string): Promise<void> {
  await eisAdmin()
  await bevestigGeheim(userId, code, false)
}

export async function disableTotp(userId: string): Promise<void> {
  await eisAdmin()
  const { error } = await supabaseAdmin
    .from('dashboard_totp')
    .delete()
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  revalidateGebruiker(userId)
}

export async function startTotpSetup(): Promise<TotpEnrollment | { alIngeschakeld: true }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Niet ingelogd.')

  const rij = await haalTotpRij(user.id)
  if (totpIsIngeschakeld(rij)) return { alIngeschakeld: true }

  const label = user.phone || user.name || user.id
  if (rij?.secret && !rij.verified && !rij.enabled) {
    return qrVoor(rij.secret, label)
  }

  return enrollmentVoor(user.id, label)
}

export async function bevestigTotpSetup(code: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Niet ingelogd.')
  await bevestigGeheim(user.id, code, true)
}

export async function totpStatusVoorHuidigeSessie(): Promise<TotpLoginStatus> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ok'

  const rij = await haalTotpRij(user.id)
  if (!totpIsIngeschakeld(rij)) return 'setup'

  const sessionId = await authSessionId(supabase)
  return !sessionId || rij?.verified_session_id !== sessionId ? 'code' : 'ok'
}

export async function verifieerTotpLogin(code: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')

  const rij = await haalTotpRij(user.id)
  if (!totpIsIngeschakeld(rij) || !rij) {
    throw new Error('2FA is nog niet ingesteld voor dit account.')
  }

  if (!totpGeldig(rij.secret, code)) {
    throw new Error('Ongeldige of verlopen code.')
  }

  const sessionId = await authSessionId(supabase)
  if (!sessionId) throw new Error('Sessie ontbreekt. Log opnieuw in.')

  const { error: updateError } = await supabaseAdmin
    .from('dashboard_totp')
    .update({ verified_session_id: sessionId })
    .eq('user_id', user.id)

  if (updateError) throw new Error(updateError.message)
}
