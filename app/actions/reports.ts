'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type RapportStatus = 'nieuw' | 'in_behandeling' | 'afgehandeld'

export type Rapport = {
  id: string
  reason: string
  status: RapportStatus
  created_at: string
  reporter: { id: string; name: string | null; username: string | null }
  reported: { id: string; name: string | null; username: string | null; push_token: string | null }
}

export async function getRapporten(status?: RapportStatus): Promise<Rapport[]> {
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

export async function waarschuwGebruiker(reportId: string, reportedId: string, pushToken: string | null) {
  const db = adminClient()

  await db.from('reports').update({ status: 'in_behandeling' }).eq('id', reportId)

  if (pushToken?.startsWith('ExponentPushToken[') || pushToken?.startsWith('ExpoPushToken[')) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([{
        to: pushToken,
        title: 'Waarschuwing van OpStap',
        body: 'Je hebt een waarschuwing ontvangen van OpStap. Houd je aan de community richtlijnen.',
        sound: 'default',
      }]),
    })
  }

  revalidatePath('/rapporten')
}

export async function banGebruiker(reportId: string, reportedId: string) {
  const db = adminClient()

  await Promise.all([
    db.from('profiles').update({ is_banned: true }).eq('id', reportedId),
    db.from('reports').update({ status: 'afgehandeld' }).eq('id', reportId),
  ])

  revalidatePath('/rapporten')
}

export async function sluitRapport(reportId: string) {
  await adminClient().from('reports').update({ status: 'afgehandeld' }).eq('id', reportId)
  revalidatePath('/rapporten')
}
