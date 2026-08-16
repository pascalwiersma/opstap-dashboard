import Link from 'next/link'
import { getGebruikers } from '@/app/actions/gebruikers'
import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { GebruikersLijst } from './_components/gebruikers-lijst'
import { UserPlus, Users } from 'lucide-react'

export default async function GebruikersPage() {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'gebruikers', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const gebruikers = await getGebruikers()

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-opstap-orange-400" />
            <h1 className="text-2xl font-display text-white">Dashboardtoegang</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Dashboardtoegang beheren — {gebruikers.length} gebruiker{gebruikers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {kan(user, 'gebruikers', 'toevoegen') && (
          <Link
            href="/gebruikers/nieuw"
            className="flex items-center gap-2 px-4 py-2.5 bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Toevoegen
          </Link>
        )}
      </div>
      <GebruikersLijst
        initialGebruikers={gebruikers}
        huidigeUserId={user.id}
        kanBewerken={kan(user, 'gebruikers', 'bewerken')}
        kanVerwijderen={kan(user, 'gebruikers', 'verwijderen')}
      />
    </div>
  )
}
