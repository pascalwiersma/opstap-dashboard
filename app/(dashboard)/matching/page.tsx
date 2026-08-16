export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { getMatchingPagina } from '@/app/actions/matching'
import { MatchingInstellingenForm } from './_components/matching-instellingen'
import { MatchingStatus } from './_components/matching-status'
import { Shuffle } from 'lucide-react'

export default async function MatchingPage() {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'matching', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const { instellingen, runs, cron } = await getMatchingPagina()

  return (
    <div className="p-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shuffle className="w-6 h-6 text-opstap-orange-400" />
          <h1 className="text-2xl font-display text-white">Matching algoritme</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Hoe groepen tot stand komen, welke knoppen het algoritme écht gebruikt, en of de
          edge functions recent gedraaid hebben.
        </p>
      </div>

      <section className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Overzicht hoe matching werkt</h2>
        <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
          <li>
            Op een matchdag (standaard donderdag) checken mensen tussen het incheck-venster
            in voor een uitgaansgebied of een evenement. Locatie op dat moment is geen eis;
            de pool is het gebied of het event waarvoor je incheckt.
          </li>
          <li>
            Om het matchuur (standaard 20:00 Amsterdam) leest <code className="text-gray-400">match-users</code> alle
            actieve check-ins van die kalenderdag. Pools met minder dan 2 mensen worden
            overgeslagen.
          </li>
          <li>
            Per pool maakt <code className="text-gray-400">maakGroepen</code> groepen. De doelgrootte is het
            gemiddelde van ieders voorkeursgroepsgrootte (minimaal 2). Een willekeurig zaad
            krijgt daarna de hoogst scorende kandidaten erbij.
          </li>
          <li>
            Score tussen twee mensen: 70% gedeelde interesses (Jaccard) + 30% gedeelde
            favoriete venues. Heeft een van beiden geen favorieten, dan telt alleen
            interesse. Geblokkeerde paren komen niet in dezelfde groep.
          </li>
          <li>
            Overgebleven mensen gaan naar de groep waar ze het hoogst scoren, tenzij daar
            een blok is. Daarna ontstaan matches met status <code className="text-gray-400">proposed</code>.
          </li>
          <li>
            Om het bevestigingsuur (standaard 21:00) maakt <code className="text-gray-400">finalize-matches</code> de
            match definitief als minstens twee leden hebben geaccepteerd; anders wordt hij
            geannuleerd. Attendance-herinnering en trust-scores draaien de ochtend erna.
          </li>
        </ol>
        <p className="text-xs text-gray-500">
          Er is geen radius- of batchgrootte-knop in de matcher. Uitgaansgebied-radius geldt
          voor de kaart, niet voor wie met wie gematcht wordt.
        </p>
      </section>

      <MatchingInstellingenForm
        initial={instellingen}
        kanBewerken={kan(user, 'matching', 'bewerken')}
      />

      <MatchingStatus runs={runs} cron={cron} />
    </div>
  )
}
