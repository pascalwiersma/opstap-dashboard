'use client'

import dynamic from 'next/dynamic'
import type { Venue } from '@/app/actions/venues'

const VenueMap = dynamic(
  () => import('./venue-map').then(m => m.VenueMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500 text-sm">
        Kaart laden...
      </div>
    ),
  }
)

export function VenueMapWrapper({ initialVenues }: { initialVenues: Venue[] }) {
  return <VenueMap initialVenues={initialVenues} />
}
