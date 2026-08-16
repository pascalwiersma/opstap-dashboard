'use server'

import { createSupabaseServerClient, PREVIEW_ROL_COOKIE } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOut() {
  const jar = await cookies()
  jar.delete(PREVIEW_ROL_COOKIE)
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
