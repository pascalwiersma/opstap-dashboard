import { getEvents } from '@/app/actions/events'
import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { EventsLijst } from './_components/events-lijst'
import { CalendarDays } from 'lucide-react'

export default async function EventsBeheerPage() {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'evenementen', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const events = await getEvents()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <CalendarDays className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Evenementen</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Evenementen beheren — aanmaken, bewerken en verwijderen
      </p>
      <EventsLijst
        initialEvents={events}
        kanToevoegen={kan(user, 'evenementen', 'toevoegen')}
        kanBewerken={kan(user, 'evenementen', 'bewerken')}
        kanVerwijderen={kan(user, 'evenementen', 'verwijderen')}
      />
    </div>
  )
}
