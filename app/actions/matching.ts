'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { eisPermissie } from '@/lib/eis-permissie'
import { revalidatePath } from 'next/cache'

export type MatchingInstellingen = {
  match_weekdays: number[]
  check_in_start_hour: number
  check_in_end_hour: number
  match_hour: number
  finalize_hour: number
  interesse_gewicht_pct: number
  min_groep: number
  fallback_groepsgrootte: number
  min_acceptaties: number
  herinnering_minuten_voor_match: number
  attendance_hour: number
  trust_hour: number
  updated_at: string
}

export type MatchingRun = {
  id: string
  function_name: string
  started_at: string
  finished_at: string | null
  status: string
  message: string | null
}

export type MatchingCronJob = {
  jobname: string
  schedule: string
  active: boolean
}

const DEFAULT_INSTELLINGEN: MatchingInstellingen = {
  match_weekdays: [4],
  check_in_start_hour: 8,
  check_in_end_hour: 20,
  match_hour: 20,
  finalize_hour: 21,
  interesse_gewicht_pct: 70,
  min_groep: 2,
  fallback_groepsgrootte: 4,
  min_acceptaties: 2,
  herinnering_minuten_voor_match: 15,
  attendance_hour: 8,
  trust_hour: 12,
  updated_at: new Date(0).toISOString(),
}

function alsGetalArray(waarde: unknown): number[] {
  if (!Array.isArray(waarde)) return []
  return waarde.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
}

function alsGetal(waarde: unknown, fallback: number): number {
  const n = Number(waarde)
  return Number.isFinite(n) ? n : fallback
}

export async function getMatchingPagina(): Promise<{
  instellingen: MatchingInstellingen
  runs: MatchingRun[]
  cron: MatchingCronJob[]
}> {
  await eisPermissie('matching', 'zien')

  const [settingsRes, runsRes, cronRes] = await Promise.all([
    supabaseAdmin
      .from('matching_settings')
      .select('match_weekdays, check_in_start_hour, check_in_end_hour, match_hour, finalize_hour, interesse_gewicht_pct, min_groep, fallback_groepsgrootte, min_acceptaties, herinnering_minuten_voor_match, attendance_hour, trust_hour, updated_at')
      .eq('id', 1)
      .maybeSingle(),
    supabaseAdmin
      .from('matching_runs')
      .select('id, function_name, started_at, finished_at, status, message')
      .order('started_at', { ascending: false })
      .limit(40),
    supabaseAdmin.rpc('matching_cron_overzicht'),
  ])

  if (settingsRes.error) throw new Error(settingsRes.error.message)
  if (runsRes.error) throw new Error(runsRes.error.message)

  const rij = settingsRes.data
  const instellingen: MatchingInstellingen = rij
    ? {
        match_weekdays: alsGetalArray(rij.match_weekdays),
        check_in_start_hour: alsGetal(rij.check_in_start_hour, DEFAULT_INSTELLINGEN.check_in_start_hour),
        check_in_end_hour: alsGetal(rij.check_in_end_hour, DEFAULT_INSTELLINGEN.check_in_end_hour),
        match_hour: alsGetal(rij.match_hour, DEFAULT_INSTELLINGEN.match_hour),
        finalize_hour: alsGetal(rij.finalize_hour, DEFAULT_INSTELLINGEN.finalize_hour),
        interesse_gewicht_pct: alsGetal(rij.interesse_gewicht_pct, DEFAULT_INSTELLINGEN.interesse_gewicht_pct),
        min_groep: alsGetal(rij.min_groep, DEFAULT_INSTELLINGEN.min_groep),
        fallback_groepsgrootte: alsGetal(rij.fallback_groepsgrootte, DEFAULT_INSTELLINGEN.fallback_groepsgrootte),
        min_acceptaties: alsGetal(rij.min_acceptaties, DEFAULT_INSTELLINGEN.min_acceptaties),
        herinnering_minuten_voor_match: alsGetal(rij.herinnering_minuten_voor_match, DEFAULT_INSTELLINGEN.herinnering_minuten_voor_match),
        attendance_hour: alsGetal(rij.attendance_hour, DEFAULT_INSTELLINGEN.attendance_hour),
        trust_hour: alsGetal(rij.trust_hour, DEFAULT_INSTELLINGEN.trust_hour),
        updated_at: rij.updated_at,
      }
    : DEFAULT_INSTELLINGEN

  const cron: MatchingCronJob[] = cronRes.error || !cronRes.data
    ? []
    : (cronRes.data as MatchingCronJob[])

  return {
    instellingen,
    runs: (runsRes.data ?? []) as MatchingRun[],
    cron,
  }
}

function inBereik(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max
}

export async function updateMatchingInstellingen(input: {
  match_weekdays: number[]
  check_in_start_hour: number
  check_in_end_hour: number
  match_hour: number
  finalize_hour: number
  interesse_gewicht_pct: number
  min_groep: number
  fallback_groepsgrootte: number
  min_acceptaties: number
  herinnering_minuten_voor_match: number
  attendance_hour: number
  trust_hour: number
}): Promise<void> {
  await eisPermissie('matching', 'bewerken')

  const weekdays = [...new Set(alsGetalArray(input.match_weekdays))].sort((a, b) => a - b)
  if (weekdays.length === 0) throw new Error('Kies minstens één matchdag.')

  const start = Number(input.check_in_start_hour)
  const eind = Number(input.check_in_end_hour)
  const match = Number(input.match_hour)
  const finalize = Number(input.finalize_hour)
  const interesse = Number(input.interesse_gewicht_pct)
  const minGroep = Number(input.min_groep)
  const fallback = Number(input.fallback_groepsgrootte)
  const minAcceptaties = Number(input.min_acceptaties)
  const herinnering = Number(input.herinnering_minuten_voor_match)
  const attendance = Number(input.attendance_hour)
  const trust = Number(input.trust_hour)

  if (![start, eind, match, finalize, attendance, trust].every(n => inBereik(n, 0, 23))) {
    throw new Error('Uren moeten hele getallen tussen 0 en 23 zijn.')
  }
  if (start >= eind) throw new Error('Inchecken moet vóór het sluituur beginnen.')
  if (match < eind) throw new Error('Matchen kan pas als het inchecken dicht is (of op hetzelfde uur).')
  if (finalize <= match) throw new Error('Bevestigen moet ná het matchen.')
  if (!inBereik(interesse, 0, 100)) throw new Error('Interesse-gewicht moet tussen 0 en 100 liggen.')
  if (!inBereik(minGroep, 2, 12)) throw new Error('Minimale groep moet tussen 2 en 12 liggen.')
  if (!inBereik(fallback, 2, 12)) throw new Error('Fallback-groepsgrootte moet tussen 2 en 12 liggen.')
  if (!inBereik(minAcceptaties, 1, 12)) throw new Error('Minimale acceptaties moet tussen 1 en 12 liggen.')
  if (!inBereik(herinnering, 0, 180)) throw new Error('Herinnering moet tussen 0 en 180 minuten liggen.')

  const { error } = await supabaseAdmin
    .from('matching_settings')
    .update({
      match_weekdays: weekdays,
      check_in_start_hour: start,
      check_in_end_hour: eind,
      match_hour: match,
      finalize_hour: finalize,
      interesse_gewicht_pct: interesse,
      min_groep: minGroep,
      fallback_groepsgrootte: fallback,
      min_acceptaties: minAcceptaties,
      herinnering_minuten_voor_match: herinnering,
      attendance_hour: attendance,
      trust_hour: trust,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  const { error: cronError } = await supabaseAdmin.rpc('sync_matching_cron')
  if (cronError) throw new Error(`Instellingen opgeslagen, maar cron bijwerken mislukte: ${cronError.message}`)

  revalidatePath('/matching')
}
