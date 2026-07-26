export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  getMarketingFunnel, getMarketingTotals, getMarketingChartData,
  getMarketingKpis, getWeeklyActivatedUsers,
} from '@/app/actions/marketing'
import { parseMarketingPeriod } from '@/lib/marketing-period'
import { StatsCard } from '../_components/stats-card'
import { DagGrafiek } from '../_components/dag-grafiek'
import { Funnel } from './_components/funnel'
import { KpiCard } from './_components/kpi-card'
import { PeriodSelector } from './_components/period-selector'
import {
  Download, UserPlus, ShieldCheck, LogIn, Repeat, Bell,
  MessageSquare, Share2, Users, MessagesSquare,
} from 'lucide-react'

const PERIOD_LABEL: Record<string, string> = { '7': 'afgelopen 7 dagen', '30': 'afgelopen 30 dagen', '90': 'afgelopen 90 dagen', all: 'all-time' }

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>
}) {
  const user = await getCurrentUser()
  if (!user || user.role === 'provincial') redirect('/')

  const period = parseMarketingPeriod((await searchParams).period)

  const [funnel, totals, charts, kpis, weeklyActivated] = await Promise.all([
    getMarketingFunnel(period),
    getMarketingTotals(period),
    getMarketingChartData(period),
    getMarketingKpis(period),
    getWeeklyActivatedUsers(),
  ])

  const laatsteWeek = weeklyActivated[weeklyActivated.length - 1]?.count ?? 0
  const periodeLabel = PERIOD_LABEL[period]

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing</h1>
          <p className="text-gray-400 mt-1 text-sm">Geaggregeerde campagnecijfers — geen individuele gebruikersdata</p>
        </div>
        <div className="text-right">
          <PeriodSelector current={period} />
          <p className="text-xs text-gray-500 mt-1.5">Periode voor funnel, grafieken en events hieronder</p>
        </div>
      </div>

      {/* North star — altijd laatste 12 weken, eigen vaste definitie los van de periode hierboven */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
        <div className="flex items-baseline justify-between mb-0.5">
          <p className="text-sm font-semibold text-white">Wekelijks geactiveerde OpStappers</p>
          <span className="text-3xl font-bold text-white">{laatsteWeek}</span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Unieke geverifieerde gebruikers per week die incheckten, een match ontvingen én de groepschat openden — laatste {weeklyActivated.length} weken
        </p>
        <DagGrafiek data={weeklyActivated} label="Geactiveerde OpStappers" kleur="#f97316" />
      </div>

      {/* KPI's t.o.v. doelwaarden uit het marketingplan */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Funnel: onderbouwing van de KPI's hierboven */}
      <div className="mb-8">
        <Funnel steps={funnel} />
      </div>

      {/* Dagelijkse volumes */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-sm font-semibold text-white mb-0.5">Installaties</p>
          <p className="text-xs text-gray-500 mb-5 capitalize">{periodeLabel}</p>
          <DagGrafiek data={charts.installs} label="Installaties" kleur="#f97316" />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-sm font-semibold text-white mb-0.5">Check-ins</p>
          <p className="text-xs text-gray-500 mb-5 capitalize">{periodeLabel}</p>
          <DagGrafiek data={charts.checkins} label="Check-ins" kleur="#0ea5e9" />
        </div>
      </div>

      {/* Ruwe event-totalen — detail, ondergeschikt aan de KPI's hierboven */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Events (detail) · {periodeLabel}</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Installaties" value={totals.install} icon={Download} color="bg-opstap-orange-600" />
          <StatsCard title="Social link clicks" value={totals.social_link_click} icon={Share2} color="bg-gray-700" />
          <StatsCard title="Accounts aangemaakt" value={totals.account_created} icon={UserPlus} color="bg-blue-600" />
          <StatsCard title="Verificatie voltooid" value={totals.verification_completed} icon={ShieldCheck} color="bg-emerald-600" />
          <StatsCard title="Push opt-in" value={totals.push_opt_in} icon={Bell} color="bg-yellow-600" />
          <StatsCard title="Eerste check-in" value={totals.check_in} icon={LogIn} color="bg-teal-600" />
          <StatsCard title="Tweede check-in" value={totals.second_check_in} icon={Repeat} color="bg-orange-600" />
          <StatsCard title="Groepschats geopend" value={totals.group_chat_opened} icon={Users} color="bg-gray-700" />
          <StatsCard title="Aanwezigheid bevestigd" value={totals.attendance_confirmed} icon={MessagesSquare} color="bg-gray-700" />
          <StatsCard title="Feedback ingestuurd" value={totals.feedback_submitted} icon={MessageSquare} color="bg-gray-700" />
        </div>
      </div>
    </div>
  )
}
