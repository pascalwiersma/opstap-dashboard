export type DashboardRolOptie = {
  slug: string
  name: string
  is_system: boolean
}

export const ROL_KLEUR_STANDAARD = 'bg-gray-600/20 text-gray-300 border-gray-600/30'

export const ROL_KLEUR: Record<string, string> = {
  admin: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  national: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  provincial: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  marketing: 'bg-pink-600/20 text-pink-300 border-pink-600/30',
}

export function rolKleur(slug: string): string {
  return ROL_KLEUR[slug] ?? ROL_KLEUR_STANDAARD
}

export function rolBadgeKlasse(slug: string): string {
  if (slug === 'admin') return 'bg-blue-600'
  if (slug === 'national' || slug === 'provincial') return 'bg-emerald-600'
  if (slug === 'marketing') return 'bg-pink-600'
  return 'bg-gray-600'
}
