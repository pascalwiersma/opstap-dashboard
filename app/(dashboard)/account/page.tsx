import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { eigenTotpIngeschakeld } from '@/app/actions/gebruikers'
import { AccountForm } from './_components/account-form'
import { UserRound } from 'lucide-react'

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const totpActief = await eigenTotpIngeschakeld()

  return (
    <div className="p-8 w-full max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <UserRound className="w-6 h-6 text-opstap-orange-400" />
        <h1 className="text-2xl font-display text-white">Account</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        {user.name ?? user.phone} · {user.role_name}
      </p>
      <AccountForm totpActief={totpActief} />
    </div>
  )
}
