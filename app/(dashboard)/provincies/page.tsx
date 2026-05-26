import { getProvinces } from '@/app/actions/provinces'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ProvinciesMapWrapper } from './_components/provincies-map-wrapper'

export default async function ProvinciesPage() {
  const user = await getCurrentUser()
  if (!user || user.role === 'provincial') redirect('/')

  const provinces = await getProvinces()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">Provincies</h1>
          <p className="text-gray-500 text-sm">
            {provinces.length} provincie{provinces.length !== 1 ? 's' : ''} — teken grenzen op de kaart
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ProvinciesMapWrapper initialProvinces={provinces} />
      </div>
    </div>
  )
}
