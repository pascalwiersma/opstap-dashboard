'use client'

import dynamic from 'next/dynamic'
import type { CityEvent } from '@/app/actions/city-events'

const EventMap = dynamic(
  () => import('./event-map').then(m => m.EventMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500 text-sm">
        Kaart laden...
      </div>
    ),
  }
)

export function EventMapWrapper({ initialEvents }: { initialEvents: CityEvent[] }) {
  return <EventMap initialEvents={initialEvents} />
}
