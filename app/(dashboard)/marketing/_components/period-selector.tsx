import Link from 'next/link'
import { MARKETING_PERIODS, type MarketingPeriod } from '@/lib/marketing-period'

const PERIOD_LABELS: Record<MarketingPeriod, string> = {
  '7': '7 dagen',
  '30': '30 dagen',
  '90': '90 dagen',
  all: 'Alles',
}

export function PeriodSelector({ current }: { current: MarketingPeriod }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-1 gap-1">
      {MARKETING_PERIODS.map(period => (
        <Link
          key={period}
          href={`/marketing?period=${period}`}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            current === period ? 'bg-opstap-orange-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          {PERIOD_LABELS[period]}
        </Link>
      ))}
    </div>
  )
}
