import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { NieuwBeheerderForm } from './_components/nieuw-beheerder-form'
import { ChevronLeft } from 'lucide-react'

export default async function NieuwBeheerderPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

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
        <h1 className="text-2xl font-bold text-white">Vertegenwoordiger uitnodigen</h1>
        <p className="text-gray-400 mt-1 text-sm">
          De gebruiker ontvangt een uitnodigingsmail om een wachtwoord in te stellen.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <NieuwBeheerderForm />
      </div>
    </div>
  )
}
