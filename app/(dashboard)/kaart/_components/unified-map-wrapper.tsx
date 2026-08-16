'use client'

import dynamic from 'next/dynamic'
import type { Venue } from '@/app/actions/venues'
import type { CityEvent } from '@/app/actions/city-events'
import type { MeetingArea } from '@/app/actions/meeting-areas'
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
  initialAreas,
  userProvinceId,
  userProvince,
  userRole,
}: {
  initialVenues: Venue[]
  initialEvents: CityEvent[]
  initialAreas: MeetingArea[]
  userProvinceId?: string | null
  userProvince?: Province | null
  userRole?: string
}) {
  return (
    <UnifiedMap
      initialVenues={initialVenues}
      initialEvents={initialEvents}
      initialAreas={initialAreas}
      userProvinceId={userProvinceId}
      userProvince={userProvince}
      userRole={userRole}
    />
  )
}
