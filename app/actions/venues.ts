'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type VenueType = 'bar' | 'club' | 'cafe'

export type Venue = {
  id: string
  name: string
  lat: number
  lng: number
  type: VenueType | null
  description: string | null
  photo_url: string | null
  active: boolean
  opening_hours: Record<string, string> | null
  created_at: string
}

export type VenueInput = {
  name: string
  lat: number
  lng: number
  type: VenueType | null
  description: string | null
  active: boolean
  opening_hours: Record<string, string> | null
}

export async function getVenues(): Promise<Venue[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, lat, lng, type, description, photo_url, active, opening_hours, created_at')
    .order('name')

  if (error) throw new Error(error.message)
  return data as Venue[]
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const { data, error } = await adminClient()
    .from('venues')
    .insert({ ...input, location: `POINT(${input.lng} ${input.lat})` })
    .select('id, name, lat, lng, type, description, photo_url, active, opening_hours, created_at')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/venues')
  return data as Venue
}

export async function updateVenue(id: string, input: VenueInput) {
  const { error } = await adminClient()
    .from('venues')
    .update({
      ...input,
      location: `POINT(${input.lng} ${input.lat})`,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/venues')
}

export async function deleteVenue(id: string) {
  const { error } = await adminClient().from('venues').delete().eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/venues')
}

export type VenuePhoto = {
  id: string
  venue_id: string
  photo_url: string
  sort_order: number
  created_at: string
}

export async function getVenuePhotos(venueId: string): Promise<VenuePhoto[]> {
  const { data, error } = await adminClient()
    .from('venue_photos')
    .select('id, venue_id, photo_url, sort_order, created_at')
    .eq('venue_id', venueId)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return data as VenuePhoto[]
}

export async function uploadVenuePhoto(venueId: string, formData: FormData): Promise<VenuePhoto> {
  const file = formData.get('file') as File
  if (!file) throw new Error('Geen bestand gevonden.')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await adminClient()
    .storage
    .from('venue-photos')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = adminClient().storage.from('venue-photos').getPublicUrl(path)

  const { count: existingCount } = await adminClient()
    .from('venue_photos')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .then(r => ({ count: r.count ?? 0 }))

  const { data, error } = await adminClient()
    .from('venue_photos')
    .insert({ venue_id: venueId, photo_url: urlData.publicUrl, sort_order: existingCount })
    .select('id, venue_id, photo_url, sort_order, created_at')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/venues')
  return data as VenuePhoto
}

export async function deleteVenuePhoto(photoId: string, photoUrl: string) {
  const url = new URL(photoUrl)
  const pathParts = url.pathname.split('/venue-photos/')
  const storagePath = pathParts[1]

  if (storagePath) {
    await adminClient().storage.from('venue-photos').remove([storagePath])
  }

  const { error } = await adminClient().from('venue_photos').delete().eq('id', photoId)
  if (error) throw new Error(error.message)
  revalidatePath('/venues')
}
