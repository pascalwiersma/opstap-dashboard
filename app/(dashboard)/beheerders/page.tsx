import Link from 'next/link'
import { getBeheerders } from '@/app/actions/beheerders'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { BeheerdersList } from './_components/beheerders-lijst'
import { UserPlus } from 'lucide-react'

export default async function BeheerderPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/')

  const beheerders = await getBeheerders()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Vertegenwoordigers</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Dashboard toegang beheren — {beheerders.length} gebruiker{beheerders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/beheerders/nieuw"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Uitnodigen
        </Link>
      </div>
      <BeheerdersList initialBeheerders={beheerders} />
    </div>
  )
}
