'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { updateMatchingInstellingen, type MatchingInstellingen } from '@/app/actions/matching'

const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

const WEEKDAGEN: { value: number; label: string }[] = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' },
]

export function MatchingInstellingenForm({
  initial,
  kanBewerken,
}: {
  initial: MatchingInstellingen
  kanBewerken: boolean
}) {
  const router = useRouter()
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set(initial.match_weekdays))
  const [start, setStart] = useState(String(initial.check_in_start_hour))
  const [eind, setEind] = useState(String(initial.check_in_end_hour))
  const [match, setMatch] = useState(String(initial.match_hour))
  const [finalize, setFinalize] = useState(String(initial.finalize_hour))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [ok, setOk] = useState('')

  function toggleDag(dag: number) {
    if (!kanBewerken) return
    setWeekdays(prev => {
      const next = new Set(prev)
      if (next.has(dag)) next.delete(dag)
      else next.add(dag)
      return next
    })
  }

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    if (!kanBewerken) return
    setBezig(true)
    setFout('')
    setOk('')
    try {
      await updateMatchingInstellingen({
        match_weekdays: [...weekdays],
        check_in_start_hour: Number(start),
        check_in_end_hour: Number(eind),
        match_hour: Number(match),
        finalize_hour: Number(finalize),
      })
      setOk('Instellingen opgeslagen. Cron-jobs zijn meegenomen.')
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <form onSubmit={handleOpslaan} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Instellingen</h2>
        <p className="text-xs text-gray-500 mt-1">
          Deze waarden staan in de database en worden gelezen door de app, de check-in-trigger
          en de edge functions. Radius en batchgrootte staan er niet bij — het algoritme matcht
          per uitgaansgebied of evenement, niet op afstand of in batches.
        </p>
      </div>

      {fout && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
      )}
      {ok && (
        <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-4 py-3">{ok}</p>
      )}

      <fieldset disabled={!kanBewerken} className="space-y-3">
        <legend className="text-sm font-medium text-gray-300 mb-2">Matchdagen (Europe/Amsterdam)</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAGEN.map(dag => {
            const aan = weekdays.has(dag.value)
            return (
              <button
                key={dag.value}
                type="button"
                onClick={() => toggleDag(dag.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  aan
                    ? 'bg-opstap-orange-600/20 text-opstap-orange-300 border-opstap-orange-500/40'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                {dag.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">
          Op andere dagen draait match-users niet (cron + check in de functie). Attendance en
          trust-scores blijven de ochtend ná een matchdag draaien.
        </p>
      </fieldset>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <label className="block text-sm text-gray-300">
          Inchecken vanaf
          <input
            type="number"
            min={0}
            max={23}
            disabled={!kanBewerken}
            value={start}
            onChange={e => setStart(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Inchecken tot
          <input
            type="number"
            min={1}
            max={23}
            disabled={!kanBewerken}
            value={eind}
            onChange={e => setEind(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Matchen om
          <input
            type="number"
            min={0}
            max={23}
            disabled={!kanBewerken}
            value={match}
            onChange={e => setMatch(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Bevestigen om
          <input
            type="number"
            min={0}
            max={23}
            disabled={!kanBewerken}
            value={finalize}
            onChange={e => setFinalize(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Uren in Amsterdam. Cron gebruikt UTC (zomertijd: 2 uur eerder), dezelfde conventie als de
        bestaande jobs.
      </p>

      {kanBewerken && (
        <button
          type="submit"
          disabled={bezig}
          className="inline-flex items-center gap-2 bg-opstap-orange-600 hover:bg-opstap-orange-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Opslaan
        </button>
      )}
    </form>
  )
}
