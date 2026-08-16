'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase-server'
import { authSessionId } from '@/lib/auth-session'
import { nieuwTotpGeheim, totpGeldig, totpQrDataUrl, totpUri } from '@/lib/totp'
import { revalidatePath } from 'next/cache'

export type TotpEnrollment = {
  secret: string
  qrDataUrl: string
  otpauthUrl: string
}

async function eisAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Geen toegang.')
  }
  return user
}

async function enrollmentVoor(userId: string, label: string): Promise<TotpEnrollment> {
  const secret = nieuwTotpGeheim()
  const otpauthUrl = totpUri(secret, label)
  const qrDataUrl = await totpQrDataUrl(otpauthUrl)

  const { error } = await supabaseAdmin
    .from('dashboard_totp')
    .upsert({
      user_id: userId,
      secret,
      enrolled_at: new Date().toISOString(),
      verified_session_id: null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/gebruikers')
  revalidatePath(`/gebruikers/${userId}`)
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

export async function enrollTotp(userId: string): Promise<TotpEnrollment> {
  await eisAdmin()
  return enrollmentVoor(userId, await totpLabel(userId))
}

export async function resetTotp(userId: string): Promise<TotpEnrollment> {
  await eisAdmin()
  return enrollmentVoor(userId, await totpLabel(userId))
}

export async function totpVereistVoorHuidigeSessie(): Promise<{ vereist: boolean }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { vereist: false }

  const { data, error } = await supabaseAdmin
    .from('dashboard_totp')
    .select('verified_session_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01' || error.message.toLowerCase().includes('does not exist')) {
      return { vereist: false }
    }
    throw new Error(error.message)
  }
  if (!data) return { vereist: false }

  const sessionId = await authSessionId(supabase)
  return { vereist: !sessionId || data.verified_session_id !== sessionId }
}

export async function verifieerTotpLogin(code: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')

  const { data, error } = await supabaseAdmin
    .from('dashboard_totp')
    .select('secret')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.secret) throw new Error('2FA is niet ingesteld voor dit account.')

  if (!totpGeldig(data.secret as string, code)) {
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
