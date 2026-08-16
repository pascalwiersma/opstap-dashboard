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
  updated_at: new Date(0).toISOString(),
}

function alsGetalArray(waarde: unknown): number[] {
  if (!Array.isArray(waarde)) return []
  return waarde.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
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
      .select('match_weekdays, check_in_start_hour, check_in_end_hour, match_hour, finalize_hour, updated_at')
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
        check_in_start_hour: Number(rij.check_in_start_hour),
        check_in_end_hour: Number(rij.check_in_end_hour),
        match_hour: Number(rij.match_hour),
        finalize_hour: Number(rij.finalize_hour),
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

export async function updateMatchingInstellingen(input: {
  match_weekdays: number[]
  check_in_start_hour: number
  check_in_end_hour: number
  match_hour: number
  finalize_hour: number
}): Promise<void> {
  await eisPermissie('matching', 'bewerken')

  const weekdays = [...new Set(alsGetalArray(input.match_weekdays))].sort((a, b) => a - b)
  if (weekdays.length === 0) throw new Error('Kies minstens één matchdag.')

  const start = Number(input.check_in_start_hour)
  const eind = Number(input.check_in_end_hour)
  const match = Number(input.match_hour)
  const finalize = Number(input.finalize_hour)

  if (![start, eind, match, finalize].every(n => Number.isInteger(n) && n >= 0 && n <= 23)) {
    throw new Error('Uren moeten hele getallen tussen 0 en 23 zijn.')
  }
  if (start >= eind) throw new Error('Inchecken moet vóór het sluituur beginnen.')
  if (match < eind) throw new Error('Matchen kan pas als het inchecken dicht is (of op hetzelfde uur).')
  if (finalize <= match) throw new Error('Bevestigen moet ná het matchen.')

  const { error } = await supabaseAdmin
    .from('matching_settings')
    .update({
      match_weekdays: weekdays,
      check_in_start_hour: start,
      check_in_end_hour: eind,
      match_hour: match,
      finalize_hour: finalize,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  const { error: cronError } = await supabaseAdmin.rpc('sync_matching_cron')
  if (cronError) throw new Error(`Instellingen opgeslagen, maar cron bijwerken mislukte: ${cronError.message}`)

  revalidatePath('/matching')
}
