import { signOut } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard,
  Map,
  Flag,
  Globe,
  Users,
  LogOut,
  MapPin,
  CalendarDays,
  Tags,
  Bug,
  MessageSquare,
  Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import { HashFoutBanner } from './_components/hash-fout-banner'

const ROL_LABEL: Record<string, string> = {
  admin: 'Admin',
  national: 'Vertegenwoordiger',
  provincial: 'Vertegenwoordiger',
  marketing: 'Marketing',
}

const ROL_KLEUR: Record<string, string> = {
  admin: 'bg-opstap-purple-600',
  national: 'bg-emerald-600',
  provincial: 'bg-emerald-600',
  marketing: 'bg-pink-600',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?error=unauthorized')

  const heeftProvincie = user.role !== 'provincial' || !!user.province_id

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'national', 'provincial'] },
    { href: '/kaart', label: 'Kaart', icon: Map, roles: ['admin', 'national', 'provincial'], requiresProvincie: true },
    { href: '/marketing', label: 'Marketing', icon: Megaphone, roles: ['admin', 'national', 'marketing'] },
    { href: '/rapporten', label: 'Rapporten', icon: Flag, roles: ['admin', 'national'] },
    { href: '/bugs', label: 'Bugs', icon: Bug, roles: ['admin', 'national'] },
    { href: '/feedback', label: 'Feedback', icon: MessageSquare, roles: ['admin', 'national'] },
    { href: '/provincies', label: 'Provincies', icon: Globe, roles: ['admin', 'national'] },
    { href: '/steden', label: 'Steden', icon: MapPin, roles: ['admin'] },
    { href: '/events-beheer', label: 'Events', icon: CalendarDays, roles: ['admin'] },
    { href: '/interesses', label: 'Interesses', icon: Tags, roles: ['admin'] },
    { href: '/beheerders', label: 'Vertegenwoordigers', icon: Users, roles: ['admin'] },
  ].filter(item =>
    item.roles.includes(user.role) &&
    (!item.requiresProvincie || heeftProvincie)
  )

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        {/* Logo */}
        <div className="flex items-center justify-center px-5 py-6 border-b border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpStap" className="w-14 h-14 object-contain" />
        </div>

        {/* Navigatie */}
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

        {/* Gebruiker + uitloggen */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-3">
          <div className="px-3 py-2.5 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ROL_KLEUR[user.role]} text-white`}>
                {ROL_LABEL[user.role]}
              </span>
              {user.province_name && (
                <span className="text-xs text-gray-400 truncate">{user.province_name}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{user.name ?? user.phone}</p>
          </div>

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

      {/* Hoofdcontent */}
      <main className="flex-1 overflow-y-auto">
        <HashFoutBanner />
        {children}
      </main>
    </div>
  )
}
