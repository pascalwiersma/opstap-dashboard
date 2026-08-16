export const MELDING_TABS = ['bugs', 'rapporten'] as const

export type MeldingTab = (typeof MELDING_TABS)[number]

/** `feedback` is geen eigen tab; die hoort bij rapporten. */
export function parseMeldingTab(value: string | null | undefined): MeldingTab | null {
  if (value === 'bugs' || value === 'rapporten') return value
  if (value === 'feedback') return 'rapporten'
  return null
}
