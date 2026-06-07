'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
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

export async function createMeetingArea(
  naam: string,
  categorie: ZoneCategorie,
  polygon: [number, number][],
  province_id?: string | null,
): Promise<MeetingArea> {
  const lngs = polygon.map(p => p[0])
  const lats = polygon.map(p => p[1])
  const center_lng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const center_lat = (Math.min(...lats) + Math.max(...lats)) / 2

  const { data, error } = await adminClient()
    .from('meeting_areas')
    .insert({ naam, categorie, polygon, center_lat, center_lng, radius_m: 200, ...(province_id ? { province_id } : {}) })
    .select('id, naam, categorie, active, polygon, center_lat, center_lng, radius_m, created_at')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
  return data as MeetingArea
}

export async function updateMeetingArea(
  id: string,
  naam: string,
  categorie: ZoneCategorie,
  polygon: [number, number][],
  active: boolean,
) {
  const lngs = polygon.map(p => p[0])
  const lats = polygon.map(p => p[1])
  const center_lng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const center_lat = (Math.min(...lats) + Math.max(...lats)) / 2

  const { error } = await adminClient()
    .from('meeting_areas')
    .update({ naam, categorie, polygon, center_lat, center_lng, active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
}

export async function deleteMeetingArea(id: string) {
  const { error } = await adminClient().from('meeting_areas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
}

export async function toggleMeetingArea(id: string, active: boolean) {
  const { error } = await adminClient()
    .from('meeting_areas')
    .update({ active })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
}
