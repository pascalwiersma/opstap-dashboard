'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { type MarketingPeriod, PERIOD_DAYS, periodSinceIso } from '@/lib/marketing-period'
import { computeFunnelSteps, computeActivationRate, type FunnelStep, type EventActorRow, type Kpi } from '@/lib/marketing-calculations'
import { eisPermissie } from '@/lib/eis-permissie'

// Alle marketingevents die de RN-app logt via lib/analytics.ts (trackEvent).
// store_page_view ontbreekt bewust: dat gebeurt op de App Store/Play Store zelf,
// buiten onze systemen — niet te loggen vanuit de app of Supabase.
const OVERVIEW_EVENTS = [
  'install',
  'first_open',
  'social_link_click',
  'account_created',
  'verification_started',
  'verification_completed',
  'push_opt_in',
  'onboarding_completed',
  'check_in',
  'match_received',
  'group_chat_opened',
  'attendance_confirmed',
  'feedback_submitted',
  'second_check_in',
] as const

const FUNNEL_EVENTS = ['install', 'account_created', 'verification_completed', 'check_in', 'second_check_in'] as const

const FUNNEL_LABELS: Record<(typeof FUNNEL_EVENTS)[number], string> = {
  install: 'Installaties',
  account_created: 'Accounts aangemaakt',
  verification_completed: 'Verificatie voltooid',
  check_in: 'Eerste check-in',
  second_check_in: 'Tweede check-in',
}

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
    return { date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }), count }
  })
}

export async function getMarketingFunnel(period: MarketingPeriod = 'all'): Promise<FunnelStep[]> {
  await eisPermissie('marketing', 'zien')
  let query = supabaseAdmin
    .from('analytics_events')
    .select('event_name, user_id, session_id')
    .in('event_name', FUNNEL_EVENTS)

  const since = periodSinceIso(period)
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return computeFunnelSteps(data as EventActorRow[] ?? [], FUNNEL_EVENTS, FUNNEL_LABELS)
}

export async function getMarketingTotals(period: MarketingPeriod = 'all'): Promise<Record<string, number>> {
  await eisPermissie('marketing', 'zien')
  let query = supabaseAdmin
    .from('analytics_events')
    .select('event_name')
    .in('event_name', OVERVIEW_EVENTS)

  const since = periodSinceIso(period)
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const event of OVERVIEW_EVENTS) counts[event] = 0
  for (const row of data ?? []) counts[row.event_name] = (counts[row.event_name] ?? 0) + 1
  return counts
}

export async function getMarketingChartData(period: MarketingPeriod = '30') {
  await eisPermissie('marketing', 'zien')
  const days = PERIOD_DAYS[period]
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('event_name, created_at')
    .in('event_name', ['install', 'check_in'])
    .gte('created_at', since)

  if (error) throw new Error(error.message)

  const installCounts = dagLabels(days)
  const checkinCounts = dagLabels(days)

  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10)
    if (row.event_name === 'install' && key in installCounts) installCounts[key]++
    if (row.event_name === 'check_in' && key in checkinCounts) checkinCounts[key]++
  }

  return {
    installs: toChartData(installCounts),
    checkins: toChartData(checkinCounts),
  }
}

// ── North-star: wekelijks geactiveerde OpStappers ────────────────────────────
// Unieke geverifieerde gebruikers die in dezelfde week incheckten, een match
// ontvingen én de groepschat openden.

const NORTH_STAR_EVENTS = ['check_in', 'match_received', 'group_chat_opened'] as const

function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const isoDay = d.getUTCDay() || 7 // zondag telt als 7, niet 0
  if (isoDay !== 1) d.setUTCDate(d.getUTCDate() - (isoDay - 1))
  return d
}

function weekKeyFor(date: Date): string {
  return startOfIsoWeek(date).toISOString().slice(0, 10)
}

export async function getWeeklyActivatedUsers(weeks = 12) {
  await eisPermissie('marketing', 'zien')
  const since = startOfIsoWeek(new Date(Date.now() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000)).toISOString()

  const [{ data: verifiedRows, error: vErr }, { data: eventRows, error: eErr }] = await Promise.all([
    supabaseAdmin
      .from('analytics_events')
      .select('user_id')
      .eq('event_name', 'verification_completed')
      .not('user_id', 'is', null),
    supabaseAdmin
      .from('analytics_events')
      .select('event_name, user_id, created_at')
      .in('event_name', NORTH_STAR_EVENTS)
      .not('user_id', 'is', null)
      .gte('created_at', since),
  ])

  if (vErr) throw new Error(vErr.message)
  if (eErr) throw new Error(eErr.message)

  const verifiedUserIds = new Set((verifiedRows ?? []).map(row => row.user_id as string))

  const weekKeys: string[] = []
  const eventsByWeek = new Map<string, Map<string, Set<string>>>()
  for (let i = weeks - 1; i >= 0; i--) {
    const key = weekKeyFor(new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000))
    weekKeys.push(key)
    eventsByWeek.set(key, new Map())
  }

  for (const row of eventRows ?? []) {
    if (!row.user_id) continue
    const usersInWeek = eventsByWeek.get(weekKeyFor(new Date(row.created_at)))
    if (!usersInWeek) continue
    const eventsForUser = usersInWeek.get(row.user_id) ?? new Set<string>()
    eventsForUser.add(row.event_name)
    usersInWeek.set(row.user_id, eventsForUser)
  }

  return weekKeys.map(key => {
    const usersInWeek = eventsByWeek.get(key)!
    let activated = 0
    for (const [userId, events] of usersInWeek) {
      if (!verifiedUserIds.has(userId)) continue
      if (NORTH_STAR_EVENTS.every(event => events.has(event))) activated++
    }
    return { date: new Date(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }), count: activated }
  })
}

// ── KPI's met doelwaarden uit het marketingplan ──────────────────────────────

// % gebruikers bij wie targetEvent voor het eerst optreedt binnen `windowDays`
// ná hun eerste referenceEvent — een echte per-user tijdsvergelijking, dus los
// van de simpele actor-telling die de funnel gebruikt. `since` filtert alleen
// het ankermoment (referenceEvent); het target-event mag ook net na de
// periodegrens vallen, anders zou een cohort aan het einde van de periode
// oneerlijk laag scoren.
async function getActivationRate(
  referenceEvent: string,
  targetEvent: string,
  windowDays: number,
  since: string | null,
): Promise<number> {
  let referenceQuery = supabaseAdmin
    .from('analytics_events')
    .select('user_id, created_at')
    .eq('event_name', referenceEvent)
    .not('user_id', 'is', null)
  if (since) referenceQuery = referenceQuery.gte('created_at', since)

  const [{ data: referenceRows, error: rErr }, { data: targetRows, error: tErr }] = await Promise.all([
    referenceQuery,
    supabaseAdmin
      .from('analytics_events')
      .select('user_id, created_at')
      .eq('event_name', targetEvent)
      .not('user_id', 'is', null),
  ])

  if (rErr) throw new Error(rErr.message)
  if (tErr) throw new Error(tErr.message)

  return computeActivationRate(referenceRows ?? [], targetRows ?? [], windowDays)
}

export async function getMarketingKpis(period: MarketingPeriod = 'all'): Promise<Kpi[]> {
  await eisPermissie('marketing', 'zien')
  const since = periodSinceIso(period)

  const [funnel, checkinWithin7d, secondCheckinWithin30d] = await Promise.all([
    getMarketingFunnel(period),
    getActivationRate('verification_completed', 'check_in', 7, since),
    getActivationRate('check_in', 'second_check_in', 30, since),
  ])

  const accountStep = funnel.find(step => step.event === 'account_created')
  const verificationStep = funnel.find(step => step.event === 'verification_completed')

  return [
    {
      id: 'install_to_account',
      label: 'Installs → account aangemaakt',
      description: '% installaties dat een account aanmaakt',
      value: accountStep?.conversionFromPrevious ?? 0,
      target: 60,
    },
    {
      id: 'account_to_verified',
      label: 'Account → verificatie voltooid',
      description: '% accounts dat verificatie voltooit',
      value: verificationStep?.conversionFromPrevious ?? 0,
      target: 45,
    },
    {
      id: 'verified_to_checkin_7d',
      label: 'Verificatie → eerste check-in (7 dagen)',
      description: '% geverifieerde gebruikers met een eerste check-in binnen 7 dagen na verificatie',
      value: checkinWithin7d,
      target: 30,
    },
    {
      id: 'activation_to_second_checkin_30d',
      label: 'Activatie → tweede check-in (30 dagen)',
      description: '% gebruikers met een eerste check-in dat een tweede check-in heeft binnen 30 dagen daarna',
      value: secondCheckinWithin30d,
      target: 20,
    },
  ]
}
