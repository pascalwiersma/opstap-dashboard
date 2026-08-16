'use server'

import { createClient } from '@supabase/supabase-js'
export type { ZoneCategorie } from '@/app/lib/zone-utils'
import type { ZoneCategorie } from '@/app/lib/zone-utils'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type MeetingArea = {
  id: string
  naam: string
  categorie: ZoneCategorie
  active: boolean
  polygon: [number, number][] | null
  center_lat: number
  center_lng: number
  radius_m: number
  created_at: string
}

export async function getMeetingAreas(province_id?: string): Promise<MeetingArea[]> {
  let query = adminClient()
    .from('meeting_areas')
    .select('id, naam, categorie, active, polygon, center_lat, center_lng, radius_m, created_at')
    .order('naam')
  if (province_id) query = query.eq('province_id', province_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as MeetingArea[]
}
