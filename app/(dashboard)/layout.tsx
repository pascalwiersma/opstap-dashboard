import { signOut } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/supabase-server'
import { kan } from '@/lib/permissions'
import { rolBadgeKlasse } from '@/lib/dashboard-rollen'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard,
  Map,
  Users,
  UsersRound,
  LogOut,
  CalendarDays,
  Tags,
  Inbox,
  Megaphone,
  Shuffle,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { HashFoutBanner } from './_components/hash-fout-banner'


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?error=unauthorized')

  const heeftProvincie = user.role !== 'provincial' || !!user.province_id

  const navItems = ([
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, resource: 'overzicht' as const },
    { href: '/kaart', label: 'Locaties', icon: Map, resource: 'locaties' as const, requiresProvincie: true },
    { href: '/events-beheer', label: 'Evenementen', icon: CalendarDays, resource: 'evenementen' as const },
    { href: '/marketing', label: 'Marketing', icon: Megaphone, resource: 'marketing' as const },
    { href: '/meldingen', label: 'Meldingen', icon: Inbox, resource: 'meldingen' as const },
    { href: '/interesses', label: 'Interesses', icon: Tags, resource: 'interesses' as const },
    { href: '/leden', label: 'Leden', icon: UsersRound, resource: 'gebruikers' as const },
    { href: '/gebruikers', label: 'Dashboardtoegang', icon: Users, resource: 'gebruikers' as const },
    { href: '/matching', label: 'Matching algoritme', icon: Shuffle, resource: 'matching' as const },
    { href: '/rollen', label: 'Rollen', icon: Shield, resource: 'rollen' as const },
  ]).filter(item =>
    kan(user, item.resource, 'zien') &&
    (!('requiresProvincie' in item) || !item.requiresProvincie || heeftProvincie)
  )

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className="w-60 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="flex items-center justify-center px-5 py-6 border-b border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpStap" className="w-14 h-14 object-contain" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium group"
            >
              <Icon className="w-4 h-4 shrink-0 group-hover:text-opstap-orange-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-3">
          <Link
            href="/account"
            className="block px-3 py-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${rolBadgeKlasse(user.role)} text-white`}>
                {user.role_name}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">{user.name ?? user.phone}</p>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium group"
            >
              <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <HashFoutBanner />
        {children}
      </main>
    </div>
  )
}
