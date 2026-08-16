export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect, notFound } from 'next/navigation'
import { getLid } from '@/app/actions/leden'
import { LidDetail } from './_components/lid-detail'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function LidPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'gebruikers', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const { id } = await params
  const lid = await getLid(id)
  if (!lid) notFound()

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/leden" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Alle leden
      </Link>
      <LidDetail
        lid={lid}
        kanBewerken={kan(user, 'gebruikers', 'bewerken')}
        kanVerwijderen={kan(user, 'gebruikers', 'verwijderen')}
        huidigeUserId={user.id}
      />
    </div>
  )
}
