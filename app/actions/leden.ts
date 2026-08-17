'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { eisPermissie } from '@/lib/eis-permissie'
import { stuurExpoPushNaarToken } from '@/lib/expo-push'
import { revalidatePath } from 'next/cache'

export type LidSamenvatting = {
  id: string
  name: string
  username: string | null
  age: number | null
  avatar_url: string | null
  trust_score: number | null
  is_banned: boolean
  identity_verified: boolean | null
  verification_status: string
  last_seen_at: string | null
  created_at: string | null
  gender: string | null
  dashboard_role: string | null
  provincie: string | null
}

export type LidFoto = { id: string; photo_url: string; position: number }
export type LidInteresse = { id: string; name: string }
export type LidRapport = {
  id: string
  reason: string
  status: string
  created_at: string
  kant: 'gemeld' | 'melder'
  andere: { id: string; name: string | null; username: string | null }
}
export type LidWaarschuwing = {
  id: string
  reason: string
  detail: string | null
  created_at: string
  read_at: string | null
}
export type LidBlok = {
  id: string
  created_at: string | null
  kant: 'heeft_geblokkeerd' | 'geblokkeerd_door'
  andere: { id: string; name: string | null; username: string | null }
}
export type LidCheckIn = {
  id: string
  date: string
  status: string | null
  checked_in_at: string | null
  gebied: string | null
  event: string | null
}
export type LidMatch = {
  id: string
  date: string
  status: string
  response: string | null
  verified_attendance: boolean | null
}

export type LidDetail = {
  id: string
  name: string
  username: string | null
  username_changed_at: string | null
  avatar_url: string | null
  bio: string | null
  age: number | null
  birth_date: string | null
  email: string | null
  auth_email: string | null
  phone: string | null
  gender: string | null
  smoking: string | null
  preferred_group_size: number | null
  preferred_travel_radius_km: number
  provincie: string | null
  onboarding_completed_at: string | null
  created_at: string | null
  last_seen_at: string | null
  trust_score: number | null
  role: string
  is_admin: boolean
  dashboard_role: string | null
  is_banned: boolean
  is_test_account: boolean
  identity_verified: boolean | null
  identity_verified_at: string | null
  verification_status: string
  heeft_push_token: boolean
  fotos: LidFoto[]
  interesses: LidInteresse[]
  rapporten: LidRapport[]
  waarschuwingen: LidWaarschuwing[]
  blokken: LidBlok[]
  checkIns: LidCheckIn[]
  matches: LidMatch[]
}

function naamRelatie(row: unknown): { id: string; name: string | null; username: string | null } {
  const r = row as { id?: string; name?: string | null; username?: string | null } | null
  return { id: r?.id ?? '', name: r?.name ?? null, username: r?.username ?? null }
}

export async function getLeden(): Promise<LidSamenvatting[]> {
  await eisPermissie('gebruikers', 'zien')

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, age, avatar_url, trust_score, is_banned, identity_verified, verification_status, last_seen_at, created_at, gender, dashboard_role, provinces(name)')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) throw new Error(error.message)

  return (data ?? []).map(rij => {
    const provincie = Array.isArray(rij.provinces) ? rij.provinces[0] : rij.provinces
    return {
      id: rij.id,
      name: rij.name,
      username: rij.username,
      age: rij.age,
      avatar_url: rij.avatar_url,
      trust_score: rij.trust_score,
      is_banned: rij.is_banned,
      identity_verified: rij.identity_verified,
      verification_status: rij.verification_status,
      last_seen_at: rij.last_seen_at,
      created_at: rij.created_at,
      gender: rij.gender,
      dashboard_role: rij.dashboard_role,
      provincie: (provincie as { name?: string } | null)?.name ?? null,
    }
  })
}

export async function getLid(id: string): Promise<LidDetail | null> {
  await eisPermissie('gebruikers', 'zien')

  const [
    profielRes,
    fotosRes,
    interessesRes,
    rapportenGemeldRes,
    rapportenMelderRes,
    waarschuwingenRes,
    blokkenRes,
    checkInsRes,
    matchesRes,
    authRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, name, username, username_changed_at, avatar_url, bio, age, birth_date, email, phone, gender, smoking, preferred_group_size, preferred_travel_radius_km, onboarding_completed_at, created_at, last_seen_at, trust_score, role, is_admin, dashboard_role, is_banned, is_test_account, identity_verified, identity_verified_at, verification_status, push_token, provinces(name)')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('profile_photos')
      .select('id, photo_url, position')
      .eq('user_id', id)
      .order('position', { ascending: true }),
    supabaseAdmin
      .from('user_interests')
      .select('interest_id, interests(id, name)')
      .eq('user_id', id),
    supabaseAdmin
      .from('reports')
      .select('id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(id, name, username)')
      .eq('reported_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('reports')
      .select('id, reason, status, created_at, reported:profiles!reports_reported_id_fkey(id, name, username)')
      .eq('reporter_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('user_warnings')
      .select('id, reason, detail, created_at, read_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('blocks')
      .select('id, created_at, blocker_id, blocked_id, blocker:profiles!blocks_blocker_id_fkey(id, name, username), blocked:profiles!blocks_blocked_id_fkey(id, name, username)')
      .or(`blocker_id.eq.${id},blocked_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(40),
    supabaseAdmin
      .from('check_ins')
      .select('id, date, status, checked_in_at, uitgaansgebieden(naam), city_events(name)')
      .eq('user_id', id)
      .order('date', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('match_members')
      .select('id, response, verified_attendance, matches(id, date, status)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin.auth.admin.getUserById(id),
  ])

  if (profielRes.error) throw new Error(profielRes.error.message)
  const p = profielRes.data
  if (!p) return null

  const provincie = Array.isArray(p.provinces) ? p.provinces[0] : p.provinces

  const rapporten: LidRapport[] = [
    ...(rapportenGemeldRes.data ?? []).map(r => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      kant: 'gemeld' as const,
      andere: naamRelatie(r.reporter),
    })),
    ...(rapportenMelderRes.data ?? []).map(r => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      kant: 'melder' as const,
      andere: naamRelatie(r.reported),
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const blokken: LidBlok[] = (blokkenRes.data ?? []).map(b => {
    const zelfBlokkeert = b.blocker_id === id
    return {
      id: b.id,
      created_at: b.created_at,
      kant: zelfBlokkeert ? 'heeft_geblokkeerd' as const : 'geblokkeerd_door' as const,
      andere: naamRelatie(zelfBlokkeert ? b.blocked : b.blocker),
    }
  })

  return {
    id: p.id,
    name: p.name,
    username: p.username,
    username_changed_at: p.username_changed_at,
    avatar_url: p.avatar_url,
    bio: p.bio,
    age: p.age,
    birth_date: p.birth_date,
    email: p.email,
    auth_email: authRes.data.user?.email ?? null,
    phone: p.phone,
    gender: p.gender,
    smoking: p.smoking,
    preferred_group_size: p.preferred_group_size,
    preferred_travel_radius_km: p.preferred_travel_radius_km,
    provincie: (provincie as { name?: string } | null)?.name ?? null,
    onboarding_completed_at: p.onboarding_completed_at,
    created_at: p.created_at,
    last_seen_at: p.last_seen_at,
    trust_score: p.trust_score,
    role: p.role,
    is_admin: p.is_admin,
    dashboard_role: p.dashboard_role,
    is_banned: p.is_banned,
    is_test_account: p.is_test_account,
    identity_verified: p.identity_verified,
    identity_verified_at: p.identity_verified_at,
    verification_status: p.verification_status,
    heeft_push_token: Boolean(p.push_token),
    fotos: (fotosRes.data ?? []) as LidFoto[],
    interesses: (interessesRes.data ?? []).map(rij => {
      const tag = Array.isArray(rij.interests) ? rij.interests[0] : rij.interests
      return { id: (tag as { id?: string } | null)?.id ?? rij.interest_id, name: (tag as { name?: string } | null)?.name ?? '—' }
    }),
    rapporten,
    waarschuwingen: (waarschuwingenRes.data ?? []) as LidWaarschuwing[],
    blokken,
    checkIns: (checkInsRes.data ?? []).map(c => {
      const gebied = Array.isArray(c.uitgaansgebieden) ? c.uitgaansgebieden[0] : c.uitgaansgebieden
      const event = Array.isArray(c.city_events) ? c.city_events[0] : c.city_events
      return {
        id: c.id,
        date: c.date,
        status: c.status,
        checked_in_at: c.checked_in_at,
        gebied: (gebied as { naam?: string } | null)?.naam ?? null,
        event: (event as { name?: string } | null)?.name ?? null,
      }
    }),
    matches: (matchesRes.data ?? []).flatMap(m => {
      const match = Array.isArray(m.matches) ? m.matches[0] : m.matches
      if (!match) return []
      return [{
        id: (match as { id: string }).id,
        date: (match as { date: string }).date,
        status: (match as { status: string }).status,
        response: m.response,
        verified_attendance: m.verified_attendance,
      }]
    }),
  }
}

async function stuurWaarschuwingPush(userId: string, body: string) {
  const { data } = await supabaseAdmin.from('profiles').select('push_token').eq('id', userId).maybeSingle()
  await stuurExpoPushNaarToken(data?.push_token, 'Waarschuwing van OpStap', body, { type: 'warning' })
}

export async function waarschuwLid(userId: string, reason: string, detail?: string): Promise<void> {
  await eisPermissie('gebruikers', 'bewerken')
  const reden = reason.trim()
  if (!reden) throw new Error('Vul een reden in.')

  const { error } = await supabaseAdmin.from('user_warnings').insert({
    user_id: userId,
    reason: reden,
    detail: detail?.trim() || null,
  })
  if (error) throw new Error(error.message)

  await stuurWaarschuwingPush(userId, reden)
  revalidatePath('/leden')
  revalidatePath(`/leden/${userId}`)
}

export async function banLid(userId: string): Promise<void> {
  const actor = await eisPermissie('gebruikers', 'bewerken')
  if (actor.id === userId) throw new Error('Je kunt jezelf niet bannen.')

  const { error } = await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/leden')
  revalidatePath(`/leden/${userId}`)
}

export async function unbanLid(userId: string): Promise<void> {
  await eisPermissie('gebruikers', 'bewerken')
  const { error } = await supabaseAdmin.from('profiles').update({ is_banned: false }).eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/leden')
  revalidatePath(`/leden/${userId}`)
}

export async function verwijderLid(userId: string): Promise<void> {
  const actor = await eisPermissie('gebruikers', 'verwijderen')
  if (actor.id === userId) throw new Error('Je kunt jezelf niet verwijderen.')

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/leden')
}
