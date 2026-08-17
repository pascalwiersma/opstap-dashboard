'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { eisPermissie } from '@/lib/eis-permissie'
import { formatOpgeslagenReden } from '@/lib/community-richtlijnen'
import { stuurExpoPushNaarToken } from '@/lib/expo-push'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type RapportStatus = 'nieuw' | 'in_behandeling' | 'afgehandeld' | 'ingetrokken'

export type Rapport = {
  id: string
  reason: string
  status: RapportStatus
  created_at: string
  reporter: { id: string; name: string | null; username: string | null }
  reported: { id: string; name: string | null; username: string | null; push_token: string | null }
}

export async function getRapporten(status?: RapportStatus): Promise<Rapport[]> {
  await eisPermissie('meldingen', 'zien')
  const db = adminClient()

  let query = db
    .from('reports')
    .select(`
      id, reason, status, created_at,
      reporter:profiles!reports_reporter_id_fkey(id, name, username),
      reported:profiles!reports_reported_id_fkey(id, name, username, push_token)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Rapport[]
}

export async function waarschuwGebruiker(
  reportId: string,
  reportedId: string,
  pushToken: string | null,
  reason: string,
  detail?: string,
) {
  await eisPermissie('meldingen', 'bewerken')
  const reden = reason.trim()
  if (!reden) throw new Error('Kies een regel uit de community richtlijnen.')
  const db = adminClient()

  await db.from('reports').update({ status: 'in_behandeling' }).eq('id', reportId)
  await db.from('user_warnings').insert({
    user_id: reportedId,
    reason: reden,
    detail: detail?.trim() || null,
  })

  await stuurExpoPushNaarToken(
    pushToken,
    'Waarschuwing van OpStap',
    formatOpgeslagenReden(reden, 'nl'),
    { type: 'warning' },
  )

  revalidatePath('/meldingen')
  revalidatePath('/leden')
  revalidatePath(`/leden/${reportedId}`)
}

export async function banGebruiker(reportId: string, reportedId: string) {
  await eisPermissie('meldingen', 'bewerken')
  const db = adminClient()

  await Promise.all([
    db.from('profiles').update({ is_banned: true }).eq('id', reportedId),
    db.from('reports').update({ status: 'afgehandeld' }).eq('id', reportId),
  ])

  revalidatePath('/meldingen')
  revalidatePath('/leden')
  revalidatePath(`/leden/${reportedId}`)
}

export async function sluitRapport(reportId: string) {
  await eisPermissie('meldingen', 'bewerken')
  await adminClient().from('reports').update({ status: 'afgehandeld' }).eq('id', reportId)
  revalidatePath('/meldingen')
}
