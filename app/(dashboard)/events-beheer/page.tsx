import { getEvents } from '@/app/actions/events'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { EventsLijst } from './_components/events-lijst'
import { CalendarDays } from 'lucide-react'

export default async function EventsBeheerPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const events = await getEvents()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <CalendarDays className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-bold text-white">Events</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Evenementen beheren — aanmaken, bewerken en verwijderen
      </p>
      <EventsLijst initialEvents={events} />
    </div>
  )
}
