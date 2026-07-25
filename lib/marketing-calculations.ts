// Pure berekeningslogica voor de marketingpagina — los van app/actions/marketing.ts
// (dat heeft 'use server' en haalt de rijen op) zodat dit met bekende
// testdata getest kan worden zonder Supabase te hoeven mocken.

export type EventActorRow = { event_name: string; user_id: string | null; session_id: string | null }

// Vóór login werkt session_id als identifier, daarna user_id — samen geven ze
// per event het aantal unieke "actoren", zonder ooit losse rijen te tonen.
function actorKey(row: { user_id: string | null; session_id: string | null }): string | null {
  return row.user_id ?? row.session_id ?? null
}

export type FunnelStep = {
  event: string
  label: string
  actors: number
  conversionFromFirst: number
  conversionFromPrevious: number
}

export function computeFunnelSteps(
  rows: EventActorRow[],
  events: readonly string[],
  labels: Record<string, string>,
): FunnelStep[] {
  const actorsByEvent: Record<string, Set<string>> = {}
  for (const event of events) actorsByEvent[event] = new Set()

  for (const row of rows) {
    const key = actorKey(row)
    if (!key) continue
    actorsByEvent[row.event_name]?.add(key)
  }

  const firstStepActors = actorsByEvent[events[0]]?.size ?? 0

  return events.map((event, i) => {
    const actors = actorsByEvent[event].size
    const previousActors = i === 0 ? actors : actorsByEvent[events[i - 1]].size
    return {
      event,
      label: labels[event] ?? event,
      actors,
      conversionFromFirst: firstStepActors > 0 ? Math.round((actors / firstStepActors) * 1000) / 10 : 0,
      conversionFromPrevious: i === 0 ? 100 : (previousActors > 0 ? Math.round((actors / previousActors) * 1000) / 10 : 0),
    }
  })
}

export type TimestampedUserRow = { user_id: string | null; created_at: string }

// % gebruikers bij wie targetRows voor het eerst optreedt binnen `windowDays`
// ná hun eerste referenceRows-moment — een per-user tijdsvergelijking, dus los
// van de simpele actor-telling die computeFunnelSteps gebruikt.
export function computeActivationRate(
  referenceRows: TimestampedUserRow[],
  targetRows: TimestampedUserRow[],
  windowDays: number,
): number {
  const firstReferenceByUser = new Map<string, number>()
  for (const row of referenceRows) {
    if (!row.user_id) continue
    const ts = new Date(row.created_at).getTime()
    const existing = firstReferenceByUser.get(row.user_id)
    if (existing === undefined || ts < existing) firstReferenceByUser.set(row.user_id, ts)
  }

  const targetsByUser = new Map<string, number[]>()
  for (const row of targetRows) {
    if (!row.user_id) continue
    const list = targetsByUser.get(row.user_id) ?? []
    list.push(new Date(row.created_at).getTime())
    targetsByUser.set(row.user_id, list)
  }

  const referenceUserIds = [...firstReferenceByUser.keys()]
  if (referenceUserIds.length === 0) return 0

  const windowMs = windowDays * 24 * 60 * 60 * 1000
  let activated = 0
  for (const userId of referenceUserIds) {
    const referenceAt = firstReferenceByUser.get(userId)!
    const activatedInTime = (targetsByUser.get(userId) ?? []).some(
      ts => ts >= referenceAt && ts <= referenceAt + windowMs
    )
    if (activatedInTime) activated++
  }

  return Math.round((activated / referenceUserIds.length) * 1000) / 10
}
