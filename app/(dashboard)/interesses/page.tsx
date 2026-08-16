import { getInterestCategorieen, getInterestTags } from '@/app/actions/interests'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { InteressesLijst } from './_components/interesses-lijst'
import { Tags } from 'lucide-react'

export default async function InteressesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const [categorieen, tags] = await Promise.all([
    getInterestCategorieen(),
    getInterestTags(),
  ])

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Tags className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Interesses</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Interesse-tags (&quot;wat vind je leuk&quot;) beheren, ingedeeld in categorieën — direct
        zichtbaar in de app zonder release
      </p>
      <InteressesLijst initialCategorieen={categorieen} initialTags={tags} />
    </div>
  )
}
