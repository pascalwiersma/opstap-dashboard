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

export type Stad = {
  id: string
  naam: string
  provincie: string
  lat: number
  lng: number
  radius_km: number
  actief: boolean
  created_at: string
}

export type StadInput = {
  naam: string
  provincie: string
  lat: number
  lng: number
  radius_km: number
  actief: boolean
}

export async function getSteden(): Promise<Stad[]> {
  const { data, error } = await adminClient()
    .from('supported_cities')
    .select('id, naam, provincie, lat, lng, radius_km, actief, created_at')
    .order('naam')
  if (error) throw new Error(error.message)
  return data as Stad[]
}

export async function createStad(input: StadInput): Promise<Stad> {
  const { data, error } = await adminClient()
    .from('supported_cities')
    .insert(input)
    .select('id, naam, provincie, lat, lng, radius_km, actief, created_at')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/steden')
  return data as Stad
}

export async function updateStad(id: string, input: Partial<StadInput>) {
  const { error } = await adminClient()
    .from('supported_cities')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/steden')
}

export async function deleteStad(id: string) {
  const { error } = await adminClient()
    .from('supported_cities')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/steden')
}
