'use client'

import dynamic from 'next/dynamic'
import type { Venue } from '@/app/actions/venues'
import type { CityEvent } from '@/app/actions/city-events'
import type { Province } from '@/app/actions/provinces'

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
  userProvinceId,
  userProvince,
}: {
  initialVenues: Venue[]
  initialEvents: CityEvent[]
  userProvinceId?: string | null
  userProvince?: Province | null
}) {
  return (
    <UnifiedMap
      initialVenues={initialVenues}
      initialEvents={initialEvents}
      userProvinceId={userProvinceId}
      userProvince={userProvince}
    />
  )
}
