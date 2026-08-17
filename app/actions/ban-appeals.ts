'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { eisPermissie } from '@/lib/eis-permissie'
import { stuurExpoPushNaarToken } from '@/lib/expo-push'
import { revalidatePath } from 'next/cache'

export type BezwaarStatus = 'nieuw' | 'in_behandeling' | 'toegekend' | 'afgewezen'

export type BanAppeal = {
  id: string
  message: string
  status: BezwaarStatus
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
  user: {
    id: string
    name: string | null
    username: string | null
    phone: string | null
    is_banned: boolean
  }
}

async function stuurBezwaarPush(userId: string, status: 'toegekend' | 'afgewezen') {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle()

  const title = status === 'toegekend'
    ? 'Bezwaar toegekend'
    : 'Bezwaar afgewezen'
  const body = status === 'toegekend'
    ? 'Je account is weer actief. Open de app om verder te gaan.'
    : 'Je bezwaar is beoordeeld en afgewezen. Open de app voor details.'

  await stuurExpoPushNaarToken(data?.push_token, title, body, {
    type: 'ban_appeal',
    status,
  })
}

export async function getBanAppeals(status?: BezwaarStatus): Promise<BanAppeal[]> {
  await eisPermissie('meldingen', 'zien')

  let query = supabaseAdmin
    .from('ban_appeals')
    .select(`
      id, message, status, admin_note, created_at, reviewed_at,
      user:profiles!ban_appeals_user_id_fkey(id, name, username, phone, is_banned)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(rij => {
    const user = Array.isArray(rij.user) ? rij.user[0] : rij.user
    return {
      id: rij.id,
      message: rij.message,
      status: rij.status as BezwaarStatus,
      admin_note: rij.admin_note,
      created_at: rij.created_at,
      reviewed_at: rij.reviewed_at,
      user: {
        id: (user as { id: string }).id,
        name: (user as { name: string | null }).name,
        username: (user as { username: string | null }).username,
        phone: (user as { phone: string | null }).phone,
        is_banned: (user as { is_banned: boolean }).is_banned,
      },
    }
  })
}

export async function zetBezwaarInBehandeling(id: string): Promise<void> {
  await eisPermissie('meldingen', 'bewerken')
  const { error } = await supabaseAdmin
    .from('ban_appeals')
    .update({ status: 'in_behandeling' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/meldingen')
}

export async function wijsBezwaarAf(id: string, adminNote?: string): Promise<void> {
  await eisPermissie('meldingen', 'bewerken')

  const { data, error: fetchError } = await supabaseAdmin
    .from('ban_appeals')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw new Error(fetchError.message)
  if (!data) throw new Error('Bezwaar niet gevonden.')

  const { error } = await supabaseAdmin
    .from('ban_appeals')
    .update({
      status: 'afgewezen',
      admin_note: adminNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await stuurBezwaarPush(data.user_id, 'afgewezen')
  revalidatePath('/meldingen')
}

export async function kenBezwaarToe(id: string, adminNote?: string): Promise<void> {
  await eisPermissie('meldingen', 'bewerken')

  const { data, error } = await supabaseAdmin
    .from('ban_appeals')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Bezwaar niet gevonden.')

  const nu = new Date().toISOString()
  const [{ error: banError }, { error: appealError }] = await Promise.all([
    supabaseAdmin.from('profiles').update({ is_banned: false }).eq('id', data.user_id),
    supabaseAdmin
      .from('ban_appeals')
      .update({
        status: 'toegekend',
        admin_note: adminNote?.trim() || null,
        reviewed_at: nu,
      })
      .eq('id', id),
  ])
  if (banError) throw new Error(banError.message)
  if (appealError) throw new Error(appealError.message)

  await stuurBezwaarPush(data.user_id, 'toegekend')
  revalidatePath('/meldingen')
  revalidatePath('/leden')
  revalidatePath(`/leden/${data.user_id}`)
}
