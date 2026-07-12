import { getEvent } from '@/app/actions/events'
import { getSteden } from '@/app/actions/steden'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { EventFormulier } from '../../_components/event-formulier'

export default async function BewerkenEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const { id } = await params
  const [event, steden] = await Promise.all([getEvent(id), getSteden()])
  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <CalendarDays className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-bold text-white">Event bewerken</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">{event.title}</p>
      <EventFormulier steden={steden} currentUserId={user.id} event={event} />
    </div>
  )
}
