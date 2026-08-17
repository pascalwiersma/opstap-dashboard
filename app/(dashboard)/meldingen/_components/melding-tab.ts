export const MELDING_TABS = ['bugs', 'rapporten', 'feedback', 'bezwaren'] as const

export type MeldingTab = (typeof MELDING_TABS)[number]

export function parseMeldingTab(value: string | null | undefined): MeldingTab | null {
  if (value === 'bugs' || value === 'rapporten' || value === 'feedback' || value === 'bezwaren') return value
  return null
}
