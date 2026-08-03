import { getUitgaansgebieden } from '@/app/actions/uitgaansgebieden'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { UitgaansgebiedenLijst } from './_components/uitgaansgebieden-lijst'
import { MapPin } from 'lucide-react'

export default async function UitgaansgebiedenPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const uitgaansgebieden = await getUitgaansgebieden()

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <MapPin className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-bold text-white">Uitgaansgebieden</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Uitgaansgebieden beheren — zet gebieden aan of uit, controleer centrum en radius
      </p>
      <UitgaansgebiedenLijst initialUitgaansgebieden={uitgaansgebieden} />
    </div>
  )
}
