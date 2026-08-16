import type { MatchingInstellingen } from '@/app/actions/matching'

const WEEKDAGEN_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

function dagenLabel(weekdays: number[]): string {
  const namen = [...weekdays]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => WEEKDAGEN_KORT[d])
    .filter(Boolean)
  if (namen.length === 0) return 'do'
  if (namen.length === 1) return namen[0]
  if (namen.length === 2) return `${namen[0]}+${namen[1]}`
  return namen.join(', ')
}

function uur(n: number): string {
  return `${String(n).padStart(2, '0')}:00`
}

function Box({ titel, tekst }: { titel: string; tekst: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 min-h-[6.5rem]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-opstap-orange-400 mb-1.5">{titel}</p>
      <p className="text-xs text-gray-300 leading-snug">{tekst}</p>
    </div>
  )
}

export function MatchingDiagram({ instellingen }: { instellingen: MatchingInstellingen }) {
  const dagen = dagenLabel(instellingen.match_weekdays)
  const venuePct = 100 - instellingen.interesse_gewicht_pct

  const stappen = [
    {
      titel: 'Inchecken',
      tekst: `${dagen} ${uur(instellingen.check_in_start_hour)}–${uur(instellingen.check_in_end_hour)} · gebied of event`,
    },
    {
      titel: 'Pools',
      tekst: `Zelfde gebied of event. Minder dan ${instellingen.min_groep}: overslaan`,
    },
    {
      titel: 'Score',
      tekst: `${instellingen.interesse_gewicht_pct}% interesses + ${venuePct}% venues. Blokken eruit`,
    },
    {
      titel: 'Groepen',
      tekst: `Doel = gemiddelde voorkeur (fallback ${instellingen.fallback_groepsgrootte}). Min. ${instellingen.min_groep}`,
    },
    {
      titel: 'Match',
      tekst: `${uur(instellingen.match_hour)} proposed. Herinnering ${instellingen.herinnering_minuten_voor_match} min eerder`,
    },
    {
      titel: 'Bevestigen',
      tekst: `${uur(instellingen.finalize_hour)}: ≥${instellingen.min_acceptaties} acceptaties, anders cancel`,
    },
    {
      titel: 'Daarna',
      tekst: `Ochtend erna attendance ${uur(instellingen.attendance_hour)} · trust ${uur(instellingen.trust_hour)}`,
    },
  ]

  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h2 className="text-sm font-semibold text-white mb-4">Hoe matching werkt</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
        {stappen.map((stap, i) => (
          <div key={stap.titel} className="relative">
            {i > 0 && (
              <div className="xl:hidden absolute -top-2.5 left-1/2 -translate-x-1/2 text-gray-600 text-xs" aria-hidden>
                ↓
              </div>
            )}
            <Box titel={stap.titel} tekst={stap.tekst} />
          </div>
        ))}
      </div>
    </section>
  )
}
