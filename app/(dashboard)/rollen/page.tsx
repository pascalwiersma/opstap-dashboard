import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getRollen } from '@/app/actions/rollen'
import { kan } from '@/lib/permissions'
import { RollenBeheer } from './_components/rollen-beheer'
import { Shield } from 'lucide-react'

export default async function RollenPage() {
  const user = await getCurrentUser()
  if (!kan(user, 'rollen', 'zien')) redirect('/')

  const rollen = await getRollen()

  return (
    <div className="p-8 w-full">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Rollen</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Rollen aanmaken en bepalen wat iemand mag zien, toevoegen, bewerken of verwijderen.
      </p>
      <RollenBeheer
        initialRollen={rollen}
        kanToevoegen={kan(user, 'rollen', 'toevoegen')}
        kanBewerken={kan(user, 'rollen', 'bewerken')}
        kanVerwijderen={kan(user, 'rollen', 'verwijderen')}
      />
    </div>
  )
}
