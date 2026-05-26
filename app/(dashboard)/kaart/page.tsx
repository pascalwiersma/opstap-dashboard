import { getVenues } from '@/app/actions/venues'
import { getCityEvents } from '@/app/actions/city-events'
import { getMeetingAreas } from '@/app/actions/meeting-areas'
import { getProvinces } from '@/app/actions/provinces'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { UnifiedMapWrapper } from './_components/unified-map-wrapper'

export default async function KaartPage() {
  const user = await getCurrentUser()
  if (user?.role === 'provincial' && !user.province_id) redirect('/')
  const province_id = user?.role === 'provincial' ? (user.province_id ?? undefined) : undefined

  const [venues, events, areas, provinces] = await Promise.all([
    getVenues(province_id),
    getCityEvents(province_id),
    getMeetingAreas(province_id),
    getProvinces(),
  ])

  const userProvince = province_id
    ? provinces.find(p => p.id === province_id) ?? null
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Kaart</h1>
          <p className="text-gray-500 text-sm">
            {userProvince ? `${userProvince.name} · ` : ''}{venues.length} venues · {events.length} evenement{events.length !== 1 ? 'en' : ''} · {areas.length} meetinggebied{areas.length !== 1 ? 'en' : ''}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <UnifiedMapWrapper
          initialVenues={venues}
          initialEvents={events}
          initialAreas={areas}
          userProvinceId={user?.province_id ?? null}
          userProvince={userProvince}
          userRole={user?.role ?? 'provincial'}
        />
      </div>
    </div>
  )
}
