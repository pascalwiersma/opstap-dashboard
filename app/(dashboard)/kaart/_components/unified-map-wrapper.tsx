'use client'

import dynamic from 'next/dynamic'
import type { Venue } from '@/app/actions/venues'
import type { CityEvent } from '@/app/actions/city-events'

const UnifiedMap = dynamic(
  () => import('./unified-map').then(m => m.UnifiedMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500 text-sm">
        Kaart laden...
      </div>
    ),
  }
)

export function UnifiedMapWrapper({
  initialVenues,
  initialEvents,
}: {
  initialVenues: Venue[]
  initialEvents: CityEvent[]
}) {
  return <UnifiedMap initialVenues={initialVenues} initialEvents={initialEvents} />
}
