import Link from 'next/link'
import { getBeheerder } from '@/app/actions/beheerders'
import { getProvinces } from '@/app/actions/provinces'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { BewerkBeheerderForm } from './_components/bewerk-beheerder-form'
import { ChevronLeft } from 'lucide-react'

export default async function BeheerderBewerkPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const { id } = await params
  const [beheerder, provinces] = await Promise.all([getBeheerder(id), getProvinces()])
  if (!beheerder) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/beheerders"
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4" />
          Terug naar vertegenwoordigers
        </Link>
        <h1 className="text-2xl font-bold text-white">Vertegenwoordiger bewerken</h1>
        <p className="text-gray-400 mt-1 text-sm">Pas de toegang en provincie aan voor deze gebruiker.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <BewerkBeheerderForm beheerder={beheerder} provinces={provinces} />
      </div>
    </div>
  )
}
