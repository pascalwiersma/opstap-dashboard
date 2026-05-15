import { getCityEvents } from '@/app/actions/city-events'
import { EventMapWrapper } from './_components/event-map-wrapper'

export default async function EventsPage() {
  const events = await getCityEvents()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Evenementen</h1>
          <p className="text-gray-500 text-sm">{events.length} evenement{events.length !== 1 ? 'en' : ''}</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EventMapWrapper initialEvents={events} />
      </div>
    </div>
  )
}
