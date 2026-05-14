import { getVenues } from '@/app/actions/venues'
import { VenueMapWrapper } from './_components/venue-map-wrapper'

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Venues</h1>
          <p className="text-gray-500 text-sm">{venues.length} locaties</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <VenueMapWrapper initialVenues={venues} />
      </div>
    </div>
  )
}
