import { getCurrentUser } from '@/lib/supabase-server'
import { kan, type Action, type Resource } from '@/lib/permissions'

export async function eisPermissie(resource: Resource, action: Action) {
  const user = await getCurrentUser()
  if (!kan(user, resource, action)) {
    throw new Error('Geen toegang.')
  }
  return user
}
