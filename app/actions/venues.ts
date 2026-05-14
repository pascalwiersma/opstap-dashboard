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
  address: string
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
  address: string
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
    .select('id, name, address, lat, lng, type, description, photo_url, active, opening_hours, created_at')
    .order('name')

  if (error) throw new Error(error.message)
  return data as Venue[]
}

export async function createVenue(input: VenueInput) {
  const { error } = await adminClient().from('venues').insert({
    ...input,
    location: `POINT(${input.lng} ${input.lat})`,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/venues')
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
