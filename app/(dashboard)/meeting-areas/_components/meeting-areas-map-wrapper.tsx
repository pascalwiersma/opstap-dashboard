'use client'

import dynamic from 'next/dynamic'
import type { MeetingArea } from '@/app/actions/meeting-areas'

const MeetingAreasMap = dynamic(
  () => import('./meeting-areas-map').then(m => m.MeetingAreasMap),
  { ssr: false }
)

export function MeetingAreasMapWrapper({ initialAreas }: { initialAreas: MeetingArea[] }) {
  return <MeetingAreasMap initialAreas={initialAreas} />
}
