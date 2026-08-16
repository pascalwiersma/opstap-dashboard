'use server'

import { createClient } from '@supabase/supabase-js'

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
  actief: boolean
  created_at: string
}

export async function getProvinces(): Promise<Province[]> {
  const { data, error } = await adminClient()
    .from('provinces')
    .select('id, name, polygon, center_lat, center_lng, actief, created_at')
    .order('name')

  if (error) throw new Error(error.message)
  return data as Province[]
}
