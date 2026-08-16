'use client'

import dynamic from 'next/dynamic'
import type { Province } from '@/app/actions/provinces'

const ProvinciesMap = dynamic(
  () => import('./provincies-map').then(m => m.ProvinciesMap),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500 text-sm">
      Kaart laden...
    </div>
  )}
)

export function ProvinciesMapWrapper({ initialProvinces }: { initialProvinces: Province[] }) {
  return <ProvinciesMap initialProvinces={initialProvinces} />
}
