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

export type FeedbackStatus = 'nieuw' | 'in_behandeling' | 'afgehandeld' | 'ingetrokken'
export type FeedbackCategory = 'idee' | 'verbetering' | 'compliment' | 'anders'

export type Feedback = {
  id: string
  category: FeedbackCategory
  message: string
  app_version: string | null
  build_number: string | null
  platform: string | null
  os_version: string | null
  device_name: string | null
  screen: string | null
  status: FeedbackStatus
  created_at: string
  melder: { id: string; name: string | null; username: string | null }
}

export async function getFeedback(status?: FeedbackStatus): Promise<Feedback[]> {
  const db = adminClient()

  let query = db
    .from('feedback')
    .select(`
      id, category, message, app_version, build_number, platform, os_version, device_name, screen, status, created_at,
      melder:profiles!feedback_user_id_fkey(id, name, username)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Feedback[]
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const { error } = await adminClient()
    .from('feedback')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/meldingen')
}
