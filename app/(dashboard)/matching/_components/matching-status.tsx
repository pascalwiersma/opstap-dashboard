import type { MatchingCronJob, MatchingRun } from '@/app/actions/matching'

const FUNCTIES: { naam: string; jobname: string; uitleg: string }[] = [
  { naam: 'match-users', jobname: 'match-users-dagelijks', uitleg: 'Maakt groepen van ingecheckte gebruikers' },
  { naam: 'finalize-matches', jobname: 'finalize-matches-dagelijks', uitleg: 'Bevestigt of annuleert voorstellen' },
  { naam: 'stuur-herinnering', jobname: 'herinnering-dagelijks', uitleg: 'Push vóór het matchen' },
  { naam: 'stuur-attendance-reminder', jobname: 'stuur-attendance-reminder', uitleg: 'Aanwezigheid de ochtend erna' },
  { naam: 'bereken-trust-scores', jobname: 'bereken-trust-scores', uitleg: 'Trust scores na de matchavond' },
]

const STATUS_KLEUR: Record<string, string> = {
  geslaagd: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  overgeslagen: 'text-yellow-300 bg-yellow-950/40 border-yellow-800/50',
  mislukt: 'text-red-400 bg-red-950/40 border-red-800/50',
  gestart: 'text-sky-300 bg-sky-950/40 border-sky-800/50',
}

function formatTijd(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function laatsteRun(runs: MatchingRun[], naam: string): MatchingRun | undefined {
  return runs.find(r => r.function_name === naam)
}

export function MatchingStatus({ runs, cron }: { runs: MatchingRun[]; cron: MatchingCronJob[] }) {
  const cronPerJob = new Map(cron.map(j => [j.jobname, j]))

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-sm font-semibold text-white mb-1">Status van de edge functions</h2>
      <p className="text-xs text-gray-500 mb-5">
        Planning in Europe/Amsterdam, uit <code className="text-gray-400">matching_settings</code>.
        Laatste run komt uit <code className="text-gray-400">matching_runs</code>.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
              <th className="pb-2 pr-4 font-medium">Functie</th>
              <th className="pb-2 pr-4 font-medium">Planning</th>
              <th className="pb-2 pr-4 font-medium">Laatste run</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {FUNCTIES.map(fn => {
              const job = cronPerJob.get(fn.jobname)
              const run = laatsteRun(runs, fn.naam)
              const statusKlasse = run ? (STATUS_KLEUR[run.status] ?? 'text-gray-400 bg-gray-800 border-gray-700') : 'text-gray-500 bg-gray-800/50 border-gray-800'
              return (
                <tr key={fn.naam} className="border-b border-gray-800/80 last:border-0">
                  <td className="py-3 pr-4 align-top">
                    <p className="text-white font-medium">{fn.naam}</p>
                    <p className="text-xs text-gray-500">{fn.uitleg}</p>
                  </td>
                  <td className="py-3 pr-4 align-top text-gray-300">
                    {job ? (
                      <>
                        <p className="font-mono text-xs">{job.schedule}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.active ? 'actief' : 'gepauzeerd'} · {job.timezone || 'Europe/Amsterdam'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Cron niet leesbaar</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top text-gray-300">
                    {run ? formatTijd(run.started_at) : 'Nog niet gedraaid'}
                  </td>
                  <td className="py-3 align-top">
                    {run ? (
                      <div className="space-y-1">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded border ${statusKlasse}`}>
                          {run.status}
                        </span>
                        {run.message && <p className="text-xs text-gray-500">{run.message}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
