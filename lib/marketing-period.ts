// Gedeelde periode-instelling voor de marketingpagina (funnel, daggrafieken,
// event-totalen). Bewust los van app/actions/marketing.ts: dat bestand heeft
// 'use server', en zo'n bestand mag alleen async functies exporteren — geen
// const-arrays, types of pure helpers zoals hier.

export const MARKETING_PERIODS = ['7', '30', '90', 'all'] as const
export type MarketingPeriod = (typeof MARKETING_PERIODS)[number]

export const PERIOD_DAYS: Record<MarketingPeriod, number> = { '7': 7, '30': 30, '90': 90, all: 365 }

export function periodSinceIso(period: MarketingPeriod): string | null {
  if (period === 'all') return null
  return new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString()
}

export function parseMarketingPeriod(value: string | string[] | undefined): MarketingPeriod {
  const raw = Array.isArray(value) ? value[0] : value
  return (MARKETING_PERIODS as readonly string[]).includes(raw ?? '') ? (raw as MarketingPeriod) : '30'
}
