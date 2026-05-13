import { signOut } from '@/app/actions/auth'
import {
  LayoutDashboard,
  MapPin,
  Users,
  Zap,
  Navigation,
  Flag,
  Settings,
  LogOut,
} from 'lucide-react'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/venues', label: 'Venues', icon: MapPin },
  { href: '/gebruikers', label: 'Gebruikers', icon: Users },
  { href: '/matches', label: 'Matches', icon: Zap },
  { href: '/incheckins', label: 'Incheckins', icon: Navigation },
  { href: '/rapportages', label: 'Rapportages', icon: Flag },
  { href: '/instellingen', label: 'Instellingen', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">OpStap</span>
        </div>

        {/* Navigatie */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium group"
            >
              <Icon className="w-4 h-4 shrink-0 group-hover:text-violet-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Uitloggen */}
        <div className="px-3 py-4 border-t border-gray-800">
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
        {children}
      </main>
    </div>
  )
}
