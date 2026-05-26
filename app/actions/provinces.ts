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

export type Province = {
  id: string
  name: string
  polygon: [number, number][] | null
  center_lat: number
  center_lng: number
  created_at: string
}

export async function getProvinces(): Promise<Province[]> {
  const { data, error } = await adminClient()
    .from('provinces')
    .select('id, name, polygon, center_lat, center_lng, created_at')
    .order('name')

  if (error) throw new Error(error.message)
  return data as Province[]
}

export async function createProvince(naam: string, polygon: [number, number][]): Promise<Province> {
  const lngs = polygon.map(p => p[0])
  const lats = polygon.map(p => p[1])
  const center_lng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const center_lat = (Math.min(...lats) + Math.max(...lats)) / 2

  const { data, error } = await adminClient()
    .from('provinces')
    .insert({ name: naam, polygon, center_lat, center_lng })
    .select('id, name, polygon, center_lat, center_lng, created_at')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/provincies')
  return data as Province
}

export async function updateProvince(id: string, naam: string, polygon: [number, number][]) {
  const lngs = polygon.map(p => p[0])
  const lats = polygon.map(p => p[1])
  const center_lng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const center_lat = (Math.min(...lats) + Math.max(...lats)) / 2

  const { error } = await adminClient()
    .from('provinces')
    .update({ name: naam, polygon, center_lat, center_lng })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/provincies')
}

export async function deleteProvince(id: string) {
  const { error } = await adminClient().from('provinces').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/provincies')
}
