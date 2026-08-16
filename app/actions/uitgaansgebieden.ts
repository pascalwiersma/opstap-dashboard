'use server'

import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type Uitgaansgebied = {
  id: string
  naam: string
  provincie: string
  centrum_lat: number
  centrum_lng: number
  radius_km: number
  actief: boolean
  created_at: string
}

export async function getUitgaansgebieden(): Promise<Uitgaansgebied[]> {
  const { data, error } = await adminClient()
    .from('uitgaansgebieden')
    .select('id, naam, provincie, centrum_lat, centrum_lng, radius_km, actief, created_at')
    .order('naam')
  if (error) throw new Error(error.message)
  return data as Uitgaansgebied[]
}
