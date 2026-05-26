export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getAdminStats, getAdminChartData, getProvincieStats, getProvincieChartData } from '@/app/actions/dashboard'
import { StatsCard } from './_components/stats-card'
import { DagGrafiek } from './_components/dag-grafiek'
import {
  Users, UserPlus, LogIn, CalendarCheck, Zap, CheckCheck,
  MapPin, CalendarDays, Hexagon, ClipboardList,
} from 'lucide-react'

// ── Admin ─────────────────────────────────────────────────────────────────────

async function AdminDashboard() {
  const [stats, charts] = await Promise.all([getAdminStats(), getAdminChartData()])

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatsCard title="App-gebruikers" value={stats.totalUsers} icon={Users} color="bg-violet-600" />
        <StatsCard title="Nieuwe gebruikers (7d)" value={stats.newUsersWeek} icon={UserPlus} color="bg-blue-600" />
        <StatsCard title="Ingecheckt vandaag" value={stats.checkinsVandaag} icon={LogIn} color="bg-emerald-600" />
        <StatsCard title="Inchecks (7d)" value={stats.checkinsWeek} icon={CalendarCheck} color="bg-teal-600" />
        <StatsCard title="Matches (7d)" value={stats.matchesWeek} icon={Zap} color="bg-yellow-600" />
        <StatsCard title="Bevestigde matches (7d)" value={stats.confirmedMatches} icon={CheckCheck} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatsCard title="Venues" value={stats.venues} icon={MapPin} color="bg-gray-700" />
        <StatsCard title="Evenementen" value={stats.events} icon={CalendarDays} color="bg-gray-700" />
        <StatsCard title="Meeting areas" value={stats.areas} icon={Hexagon} color="bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-sm font-semibold text-white mb-0.5">Nieuwe gebruikers</p>
          <p className="text-xs text-gray-500 mb-5">Afgelopen 30 dagen</p>
          <DagGrafiek data={charts.gebruikers} label="Nieuwe gebruikers" kleur="#7c3aed" />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-sm font-semibold text-white mb-0.5">Inchecks</p>
          <p className="text-xs text-gray-500 mb-5">Afgelopen 30 dagen</p>
          <DagGrafiek data={charts.checkins} label="Inchecks" kleur="#0ea5e9" />
        </div>
      </div>
    </>
  )
}

// ── Vertegenwoordiger ─────────────────────────────────────────────────────────

async function VertegenwoordigerDashboard({ province_id, province_name }: { province_id: string; province_name: string | null }) {
  const [stats, chartData] = await Promise.all([
    getProvincieStats(province_id),
    getProvincieChartData(province_id),
  ])

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Venues" value={stats.venues} icon={MapPin} color="bg-violet-600" />
        <StatsCard title="Evenementen" value={stats.events} icon={CalendarDays} color="bg-blue-600" />
        <StatsCard title="Meeting areas" value={stats.areas} icon={Hexagon} color="bg-emerald-600" />
        <StatsCard title="Registraties (7d)" value={stats.registratiesWeek} icon={ClipboardList} color="bg-orange-600" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <p className="text-sm font-semibold text-white mb-0.5">Event registraties</p>
        <p className="text-xs text-gray-500 mb-5">Afgelopen 30 dagen · {province_name ?? 'jouw provincie'}</p>
        <DagGrafiek data={chartData} label="Registraties" kleur="#10b981" />
      </div>
    </>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const isAdmin = user.role === 'admin'
  const isNational = user.role === 'national'
  const isProvincial = user.role === 'provincial'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {isAdmin && 'Globaal overzicht van OpStap'}
          {isNational && 'Landelijk overzicht van OpStap'}
          {isProvincial && `Overzicht voor ${user.province_name ?? 'jouw provincie'}`}
        </p>
      </div>

      {(isAdmin || isNational) && <AdminDashboard />}
      {isProvincial && user.province_id && (
        <VertegenwoordigerDashboard province_id={user.province_id} province_name={user.province_name ?? null} />
      )}
      {isProvincial && !user.province_id && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
          Nog geen provincie toegewezen. Neem contact op met een admin.
        </div>
      )}
    </div>
  )
}
