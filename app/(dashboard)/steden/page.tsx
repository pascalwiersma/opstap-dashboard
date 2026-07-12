import { getSteden } from '@/app/actions/steden'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { StedenLijst } from './_components/steden-lijst'
import { MapPin } from 'lucide-react'

export default async function StedenPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const steden = await getSteden()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <MapPin className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-bold text-white">Steden</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Ondersteunde steden beheren — controleer radius en coördinaten
      </p>
      <StedenLijst initialSteden={steden} />
    </div>
  )
}
