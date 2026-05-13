import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { StatsCard } from './_components/stats-card'
import { CheckinsChart } from './_components/checkins-chart'
import { Users, Activity, MapPinCheck, Zap, CheckCheck, MapPin } from 'lucide-react'

async function getStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: checkedInTonight },
    { count: matchesThisWeek },
    { count: confirmedMatchesThisWeek },
    { count: totalVenues },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('checkins')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabaseAdmin
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart),
    supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', weekStart),
    supabaseAdmin.from('venues').select('*', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    checkedInTonight: checkedInTonight ?? 0,
    matchesThisWeek: matchesThisWeek ?? 0,
    confirmedMatchesThisWeek: confirmedMatchesThisWeek ?? 0,
    totalVenues: totalVenues ?? 0,
  }
}

async function getCheckinChartData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabaseAdmin
    .from('checkins')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  if (!data) return []

  // Groepeer per dag
  const counts: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    counts[key] = 0
  }

  for (const row of data) {
    const d = new Date(row.created_at)
    const key = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    if (key in counts) counts[key]++
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

export default async function DashboardPage() {
  const [stats, chartData] = await Promise.all([getStats(), getCheckinChartData()])

  const statCards = [
    {
      title: 'Totaal gebruikers',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-violet-600',
    },
    {
      title: 'Actief afgelopen 7 dagen',
      value: stats.activeUsers,
      icon: Activity,
      color: 'bg-blue-600',
    },
    {
      title: 'Ingecheckt vanavond',
      value: stats.checkedInTonight,
      icon: MapPinCheck,
      color: 'bg-emerald-600',
    },
    {
      title: 'Matches deze week',
      value: stats.matchesThisWeek,
      icon: Zap,
      color: 'bg-yellow-600',
    },
    {
      title: 'Bevestigde matches',
      value: stats.confirmedMatchesThisWeek,
      icon: CheckCheck,
      color: 'bg-pink-600',
    },
    {
      title: 'Totaal venues',
      value: stats.totalVenues,
      icon: MapPin,
      color: 'bg-orange-600',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">Overzicht van OpStap activiteit</p>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      {/* Grafiek */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-base font-semibold text-white mb-1">Incheckins per dag</h2>
        <p className="text-gray-400 text-sm mb-6">Afgelopen 30 dagen</p>
        <CheckinsChart data={chartData} />
      </div>
    </div>
  )
}
