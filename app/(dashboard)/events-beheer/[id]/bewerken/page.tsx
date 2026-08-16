import { getEvent } from '@/app/actions/events'
import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect, notFound } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { EventFormulier } from '../../_components/event-formulier'

export default async function BewerkenEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'evenementen', 'bewerken')) redirect(user ? eersteToegestanePad(user) : '/')

  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <CalendarDays className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Evenement bewerken</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">{event.title}</p>
      <EventFormulier currentUserId={user.id} event={event} />
    </div>
  )
}
