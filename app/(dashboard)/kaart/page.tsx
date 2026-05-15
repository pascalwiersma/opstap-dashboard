import { getVenues } from '@/app/actions/venues'
import { getCityEvents } from '@/app/actions/city-events'
import { UnifiedMapWrapper } from './_components/unified-map-wrapper'

export default async function KaartPage() {
  const [venues, events] = await Promise.all([getVenues(), getCityEvents()])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Kaart</h1>
          <p className="text-gray-500 text-sm">
            {venues.length} venues · {events.length} evenement{events.length !== 1 ? 'en' : ''}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <UnifiedMapWrapper initialVenues={venues} initialEvents={events} />
      </div>
    </div>
  )
}
