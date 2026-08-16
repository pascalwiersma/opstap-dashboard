import { getGebruiker } from '@/app/actions/gebruikers'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { BewerkGebruikerForm } from './_components/bewerk-gebruiker-form'
import { Users } from 'lucide-react'

export default async function GebruikerBewerkPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const { id } = await params
  const gebruiker = await getGebruiker(id)
  if (!gebruiker) notFound()

  return (
    <div className="p-8 w-full">
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Gebruiker bewerken</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">{gebruiker.name ?? gebruiker.phone ?? 'Dashboardgebruiker'}</p>
      <BewerkGebruikerForm gebruiker={gebruiker} />
    </div>
  )
}
