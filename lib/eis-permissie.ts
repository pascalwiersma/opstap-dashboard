import { getCurrentUser, type CurrentUser } from '@/lib/supabase-server'
import { kan, type Action, type Resource } from '@/lib/permissions'

export async function eisPermissie(resource: Resource, action: Action): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user || !kan(user, resource, action)) {
    throw new Error('Geen toegang.')
  }
  return user
}
