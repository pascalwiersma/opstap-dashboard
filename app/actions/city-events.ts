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

export type CityEventType =
  | 'kermis'
  | 'festival'
  | 'markt'
  | 'concert'
  | 'sport'
  | 'overig'

export type CityEvent = {
  id: string
  name: string
  description: string | null
  event_type: CityEventType | null
  location_type: 'point' | 'region'
  lat: number | null
  lng: number | null
  polygon: [number, number][] | null
  start_date: string
  end_date: string
  color: string
  photo_url: string | null
  active: boolean
  created_at: string
}

export type CityEventInput = {
  province_id?: string | null
  name: string
  description: string | null
  event_type: CityEventType | null
  location_type: 'point' | 'region'
  lat: number | null
  lng: number | null
  polygon: [number, number][] | null
  start_date: string
  end_date: string
  color: string
  photo_url: string | null
  active: boolean
}

export async function getCityEvents(province_id?: string): Promise<CityEvent[]> {
  let query = adminClient()
    .from('city_events')
    .select('*')
    .order('start_date', { ascending: true })
  if (province_id) query = query.eq('province_id', province_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as CityEvent[]
}

export async function createCityEvent(input: CityEventInput): Promise<CityEvent> {
  const { data, error } = await adminClient()
    .from('city_events')
    .insert(input)
    .select('id, name, description, event_type, location_type, lat, lng, polygon, start_date, end_date, color, photo_url, active, created_at')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
  return data as CityEvent
}

export async function updateCityEvent(id: string, input: CityEventInput) {
  const { error } = await adminClient()
    .from('city_events')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
}

export async function deleteCityEvent(id: string) {
  const { error } = await adminClient().from('city_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kaart')
}

export async function uploadEventPhoto(eventId: string, formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file) throw new Error('Geen bestand gevonden.')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await adminClient()
    .storage
    .from('event-photos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data } = adminClient().storage.from('event-photos').getPublicUrl(path)

  await adminClient()
    .from('city_events')
    .update({ photo_url: data.publicUrl })
    .eq('id', eventId)

  revalidatePath('/kaart')
  return data.publicUrl
}

export async function deleteEventPhoto(eventId: string, photoUrl: string) {
  const url = new URL(photoUrl)
  const parts = url.pathname.split('/event-photos/')
  const storagePath = parts[1]
  if (storagePath) {
    await adminClient().storage.from('event-photos').remove([storagePath])
  }
  await adminClient().from('city_events').update({ photo_url: null }).eq('id', eventId)
  revalidatePath('/kaart')
}
