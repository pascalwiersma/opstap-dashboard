'use server'

import { supabaseAdmin } from '@/lib/supabase'

function dagLabels(days = 30) {
  const labels: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    labels[d.toISOString().slice(0, 10)] = 0
  }
  return labels
}

function toChartData(counts: Record<string, number>) {
  return Object.entries(counts).map(([iso, count]) => {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      count,
    }
  })
}

// ── Admin: globale statistieken ───────────────────────────────────────────────

export async function getAdminStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date().toISOString().slice(0, 10)

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { count: checkinsVandaag },
    { count: checkinsWeek },
    { count: matchesWeek },
    { count: confirmedMatches },
    { count: venues },
    { count: events },
    { count: areas },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).is('dashboard_role', null),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).is('dashboard_role', null).gte('created_at', weekAgo),
    supabaseAdmin.from('check_ins').select('*', { count: 'exact', head: true }).eq('date', todayStart),
    supabaseAdmin.from('check_ins').select('*', { count: 'exact', head: true }).gte('checked_in_at', weekAgo),
    supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', weekAgo),
    supabaseAdmin.from('venues').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('city_events').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('meeting_areas').select('*', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    newUsersWeek: newUsersWeek ?? 0,
    checkinsVandaag: checkinsVandaag ?? 0,
    checkinsWeek: checkinsWeek ?? 0,
    matchesWeek: matchesWeek ?? 0,
    confirmedMatches: confirmedMatches ?? 0,
    venues: venues ?? 0,
    events: events ?? 0,
    areas: areas ?? 0,
  }
}

export async function getAdminChartData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: users }, { data: checkins }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('created_at')
      .is('dashboard_role', null)
      .gte('created_at', thirtyDaysAgo),
    supabaseAdmin
      .from('check_ins')
      .select('checked_in_at')
      .gte('checked_in_at', thirtyDaysAgo),
  ])

  const userCounts = dagLabels()
  for (const row of users ?? []) {
    const key = row.created_at.slice(0, 10)
    if (key in userCounts) userCounts[key]++
  }

  const checkinCounts = dagLabels()
  for (const row of checkins ?? []) {
    const key = row.checked_in_at.slice(0, 10)
    if (key in checkinCounts) checkinCounts[key]++
  }

  return {
    gebruikers: toChartData(userCounts),
    checkins: toChartData(checkinCounts),
  }
}

// ── Vertegenwoordiger: provincie-statistieken ─────────────────────────────────

export async function getProvincieStats(province_id: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: venues },
    { count: events },
    { count: areas },
    { count: registratiesTotal },
    { count: registratiesWeek },
  ] = await Promise.all([
    supabaseAdmin.from('venues').select('*', { count: 'exact', head: true }).eq('province_id', province_id),
    supabaseAdmin.from('city_events').select('*', { count: 'exact', head: true }).eq('province_id', province_id),
    supabaseAdmin.from('meeting_areas').select('*', { count: 'exact', head: true }).eq('province_id', province_id),
    supabaseAdmin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .in(
        'event_id',
        await supabaseAdmin
          .from('city_events')
          .select('id')
          .eq('province_id', province_id)
          .then(r => (r.data ?? []).map(e => e.id))
      ),
    supabaseAdmin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .in(
        'event_id',
        await supabaseAdmin
          .from('city_events')
          .select('id')
          .eq('province_id', province_id)
          .then(r => (r.data ?? []).map(e => e.id))
      ),
  ])

  return {
    venues: venues ?? 0,
    events: events ?? 0,
    areas: areas ?? 0,
    registratiesTotal: registratiesTotal ?? 0,
    registratiesWeek: registratiesWeek ?? 0,
  }
}

export async function getProvincieChartData(province_id: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: eventIds } = await supabaseAdmin
    .from('city_events')
    .select('id')
    .eq('province_id', province_id)

  const ids = (eventIds ?? []).map(e => e.id)

  const counts = dagLabels()

  if (ids.length > 0) {
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('created_at')
      .in('event_id', ids)
      .gte('created_at', thirtyDaysAgo)

    for (const row of data ?? []) {
      const key = row.created_at.slice(0, 10)
      if (key in counts) counts[key]++
    }
  }

  return toChartData(counts)
}
