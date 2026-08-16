import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { EventFormulier } from '../_components/event-formulier'

export default async function NieuwEventPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <CalendarPlus className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Nieuw event</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">Vul de gegevens in om een event aan te maken</p>
      <EventFormulier currentUserId={user.id} />
    </div>
  )
}
