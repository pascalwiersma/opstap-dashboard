'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { eisPermissie } from '@/lib/eis-permissie'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type BugStatus = 'nieuw' | 'in_behandeling' | 'afgehandeld' | 'ingetrokken'
export type BugCategory = 'crash' | 'onjuiste_data' | 'traag' | 'anders'

export type BugReport = {
  id: string
  category: BugCategory
  description: string
  app_version: string | null
  build_number: string | null
  platform: string | null
  os_version: string | null
  device_name: string | null
  screen: string | null
  screenshot_url: string | null
  status: BugStatus
  created_at: string
  melder: { id: string; name: string | null; username: string | null }
}

const SCREENSHOT_URL_TTL_SECONDS = 60 * 10

export async function getBugReports(status?: BugStatus): Promise<BugReport[]> {
  await eisPermissie('meldingen', 'zien')
  const db = adminClient()

  let query = db
    .from('bug_reports')
    .select(`
      id, category, description, app_version, build_number, platform, os_version, device_name, screen, screenshot_url, status, created_at,
      melder:profiles!bug_reports_user_id_fkey(id, name, username)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const bugs = data as unknown as BugReport[]

  // screenshot_url slaat het pad in de privé bucket op, niet een bruikbare URL —
  // hier omzetten naar tijdelijke signed URLs voor weergave in het dashboard.
  const paden = bugs.map(b => b.screenshot_url).filter((p): p is string => !!p)
  if (paden.length === 0) return bugs

  const { data: signed } = await db.storage
    .from('bug-screenshots')
    .createSignedUrls(paden, SCREENSHOT_URL_TTL_SECONDS)

  const urlPerPad = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))
  return bugs.map(b => ({
    ...b,
    screenshot_url: b.screenshot_url ? urlPerPad.get(b.screenshot_url) ?? null : null,
  }))
}

export async function updateBugStatus(id: string, status: BugStatus) {
  await eisPermissie('meldingen', 'bewerken')
  const { error } = await adminClient()
    .from('bug_reports')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/meldingen')
}
