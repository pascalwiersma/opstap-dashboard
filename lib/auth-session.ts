import type { SupabaseClient } from '@supabase/supabase-js'

export async function authSessionId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  const sessionId = data?.claims?.session_id
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null
}
