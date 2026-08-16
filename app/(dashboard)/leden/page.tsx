export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { getLeden } from '@/app/actions/leden'
import { LedenLijst } from './_components/leden-lijst'
import { UsersRound } from 'lucide-react'

export default async function LedenPage() {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'gebruikers', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const leden = await getLeden()

  return (
    <div className="p-8 w-full">
      <div className="flex items-center gap-3 mb-2">
        <UsersRound className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Leden</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Alle app-gebruikers — {leden.length} profiel{leden.length !== 1 ? 'en' : ''}
      </p>
      <LedenLijst leden={leden} />
    </div>
  )
}
