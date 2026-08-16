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
  const [interesse, setInteresse] = useState(String(initial.interesse_gewicht_pct))
  const [minGroep, setMinGroep] = useState(String(initial.min_groep))
  const [fallback, setFallback] = useState(String(initial.fallback_groepsgrootte))
  const [minAcceptaties, setMinAcceptaties] = useState(String(initial.min_acceptaties))
  const [herinnering, setHerinnering] = useState(String(initial.herinnering_minuten_voor_match))
  const [attendance, setAttendance] = useState(String(initial.attendance_hour))
  const [trust, setTrust] = useState(String(initial.trust_hour))
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
        interesse_gewicht_pct: Number(interesse),
        min_groep: Number(minGroep),
        fallback_groepsgrootte: Number(fallback),
        min_acceptaties: Number(minAcceptaties),
        herinnering_minuten_voor_match: Number(herinnering),
        attendance_hour: Number(attendance),
        trust_hour: Number(trust),
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
          Alles hieronder gaat naar de database en wordt gelezen door matcher, finalize en cron.
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
          Op andere dagen draait match-users niet. Attendance en trust blijven de ochtend ná
          een matchdag draaien, allemaal op de Amsterdam-klok.
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
        Alle tijden zijn Europe/Amsterdam, zomer- en wintertijd. De cron volgt die klok.
      </p>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <label className="block text-sm text-gray-300">
          Interesse-gewicht %
          <input
            type="number"
            min={0}
            max={100}
            disabled={!kanBewerken}
            value={interesse}
            onChange={e => setInteresse(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
          <span className="block text-xs text-gray-500 mt-1">Venues = {100 - (Number(interesse) || 0)}%</span>
        </label>
        <label className="block text-sm text-gray-300">
          Min. groep
          <input
            type="number"
            min={2}
            max={12}
            disabled={!kanBewerken}
            value={minGroep}
            onChange={e => setMinGroep(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Fallback groepsgrootte
          <input
            type="number"
            min={2}
            max={12}
            disabled={!kanBewerken}
            value={fallback}
            onChange={e => setFallback(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Min. acceptaties
          <input
            type="number"
            min={1}
            max={12}
            disabled={!kanBewerken}
            value={minAcceptaties}
            onChange={e => setMinAcceptaties(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Herinnering (min vóór match)
          <input
            type="number"
            min={0}
            max={180}
            disabled={!kanBewerken}
            value={herinnering}
            onChange={e => setHerinnering(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Attendance-uur (ochtend erna)
          <input
            type="number"
            min={0}
            max={23}
            disabled={!kanBewerken}
            value={attendance}
            onChange={e => setAttendance(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
        <label className="block text-sm text-gray-300">
          Trust-uur (ochtend erna)
          <input
            type="number"
            min={0}
            max={23}
            disabled={!kanBewerken}
            value={trust}
            onChange={e => setTrust(e.target.value)}
            className={`${invoerKlasse} mt-1.5`}
          />
        </label>
      </div>

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
