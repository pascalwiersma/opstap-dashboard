'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { eisPermissie } from '@/lib/eis-permissie'
import { getCurrentUser } from '@/lib/supabase-server'
import { kan } from '@/lib/permissions'
import {
  ACTIONS,
  ALLE_PERMISSIES,
  RESOURCES,
  slugVanNaam,
  type Action,
  type PermissieSleutel,
  type Resource,
} from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export type DashboardRol = {
  id: string
  slug: string
  name: string
  is_system: boolean
  gebruiker_count: number
  permissions: PermissieSleutel[]
}

function tabelOntbreekt(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || error.message.toLowerCase().includes('does not exist')
}

async function uniekeSlug(basis: string, skipId?: string): Promise<string> {
  let slug = basis
  let n = 2
  for (;;) {
    let q = supabaseAdmin.from('dashboard_roles').select('id').eq('slug', slug)
    if (skipId) q = q.neq('id', skipId)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return slug
    slug = `${basis}-${n}`
    n += 1
  }
}

export async function getRollen(): Promise<DashboardRol[]> {
  await eisPermissie('rollen', 'zien')
  const { data: rollen, error } = await supabaseAdmin
    .from('dashboard_roles')
    .select('id, slug, name, is_system, dashboard_role_permissions(resource, action)')
    .order('name')
  if (error) {
    if (tabelOntbreekt(error)) throw new Error('Rollen-tabellen ontbreken. Pas de migratie lokaal toe.')
    throw new Error(error.message)
  }

  const { data: profielen, error: pError } = await supabaseAdmin
    .from('profiles')
    .select('dashboard_role')
    .not('dashboard_role', 'is', null)
  if (pError) throw new Error(pError.message)

  const counts = new Map<string, number>()
  for (const rij of profielen ?? []) {
    const slug = rij.dashboard_role as string
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }

  return (rollen ?? []).map(rol => {
    const perms = (rol.dashboard_role_permissions ?? []) as { resource: string; action: string }[]
    return {
      id: rol.id,
      slug: rol.slug,
      name: rol.name,
      is_system: rol.is_system,
      gebruiker_count: counts.get(rol.slug) ?? 0,
      permissions: perms.map(p => `${p.resource}:${p.action}` as PermissieSleutel),
    }
  })
}

export async function getRolOpties(): Promise<{ slug: string; name: string }[]> {
  const user = await getCurrentUser()
  if (!user || !(kan(user, 'gebruikers', 'zien') || kan(user, 'gebruikers', 'toevoegen') || kan(user, 'gebruikers', 'bewerken'))) {
    throw new Error('Geen toegang.')
  }
  const { data, error } = await supabaseAdmin
    .from('dashboard_roles')
    .select('slug, name')
    .order('name')
  if (error) {
    if (tabelOntbreekt(error)) {
      return [
        { slug: 'admin', name: 'Admin' },
        { slug: 'national', name: 'Vertegenwoordiger (landelijk)' },
        { slug: 'provincial', name: 'Vertegenwoordiger (provincie)' },
        { slug: 'marketing', name: 'Marketing' },
      ]
    }
    throw new Error(error.message)
  }
  return data ?? []
}

export async function createRol(naam: string): Promise<{ id: string; slug: string }> {
  await eisPermissie('rollen', 'toevoegen')
  const name = naam.trim()
  if (!name) throw new Error('Naam is verplicht.')
  const slug = await uniekeSlug(slugVanNaam(name))
  const { data, error } = await supabaseAdmin
    .from('dashboard_roles')
    .insert({ slug, name, is_system: false })
    .select('id, slug')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/rollen')
  revalidatePath('/gebruikers')
  return { id: data.id, slug: data.slug }
}

export async function updateRol(input: {
  id: string
  name: string
  permissions: PermissieSleutel[]
}) {
  await eisPermissie('rollen', 'bewerken')
  const name = input.name.trim()
  if (!name) throw new Error('Naam is verplicht.')

  const { data: bestaande, error: getError } = await supabaseAdmin
    .from('dashboard_roles')
    .select('id, slug, is_system')
    .eq('id', input.id)
    .single()
  if (getError || !bestaande) throw new Error('Rol niet gevonden.')

  const geldig = new Set(ALLE_PERMISSIES)
  let permissions = input.permissions.filter(p => geldig.has(p))
  if (bestaande.slug === 'admin') {
    permissions = [...ALLE_PERMISSIES]
  }

  const { error: nameError } = await supabaseAdmin
    .from('dashboard_roles')
    .update({ name })
    .eq('id', input.id)
  if (nameError) throw new Error(nameError.message)

  const { error: delError } = await supabaseAdmin
    .from('dashboard_role_permissions')
    .delete()
    .eq('role_id', input.id)
  if (delError) throw new Error(delError.message)

  if (permissions.length > 0) {
    const rijen = permissions.map(sleutel => {
      const [resource, action] = sleutel.split(':') as [Resource, Action]
      return { role_id: input.id, resource, action }
    }).filter(rij => RESOURCES.includes(rij.resource) && ACTIONS.includes(rij.action))

    const { error: insError } = await supabaseAdmin
      .from('dashboard_role_permissions')
      .insert(rijen)
    if (insError) throw new Error(insError.message)
  }

  revalidatePath('/rollen')
  revalidatePath('/gebruikers')
}

export async function deleteRol(id: string) {
  await eisPermissie('rollen', 'verwijderen')
  const { data: bestaande, error: getError } = await supabaseAdmin
    .from('dashboard_roles')
    .select('id, slug, is_system')
    .eq('id', id)
    .single()
  if (getError || !bestaande) throw new Error('Rol niet gevonden.')
  if (bestaande.is_system) throw new Error('Deze rol kan niet worden verwijderd.')

  const { count, error: countError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('dashboard_role', bestaande.slug)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    throw new Error('Er zitten nog gebruikers op deze rol. Wijs ze eerst een andere rol toe.')
  }

  const { error } = await supabaseAdmin.from('dashboard_roles').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/rollen')
  revalidatePath('/gebruikers')
}
