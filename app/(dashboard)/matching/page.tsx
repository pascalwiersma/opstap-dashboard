export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { getMatchingPagina } from '@/app/actions/matching'
import { MatchingInstellingenForm } from './_components/matching-instellingen'
import { MatchingDiagram } from './_components/matching-diagram'
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
          Knoppen in de database — het diagram gebruikt de huidige waarden.
        </p>
      </div>

      <MatchingDiagram instellingen={instellingen} />

      <MatchingInstellingenForm
        initial={instellingen}
        kanBewerken={kan(user, 'matching', 'bewerken')}
      />

      <MatchingStatus runs={runs} cron={cron} />
    </div>
  )
}
