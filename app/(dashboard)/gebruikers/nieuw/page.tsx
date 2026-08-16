import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { getRolOpties } from '@/app/actions/rollen'
import { NieuwGebruikerForm } from './_components/nieuw-gebruiker-form'
import { UserPlus } from 'lucide-react'

export default async function NieuwGebruikerPage() {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'gebruikers', 'toevoegen')) redirect(user ? eersteToegestanePad(user) : '/')

  const rollen = await getRolOpties()

  return (
    <div className="p-8 w-full">
      <div className="flex items-center gap-3 mb-2">
        <UserPlus className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Gebruiker toevoegen</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        De gebruiker logt in met dit telefoonnummer via SMS, optioneel met een wachtwoord, en daarna 2FA als dat is ingesteld.
      </p>
      <NieuwGebruikerForm rollen={rollen} />
    </div>
  )
}
