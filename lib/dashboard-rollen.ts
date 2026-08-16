export type DashboardRol = 'admin' | 'national' | 'provincial' | 'marketing'

export const ROL_OPTIES: { value: DashboardRol; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Volledige toegang tot alles' },
  { value: 'national', label: 'Vertegenwoordiger (landelijk)', description: 'Landelijk overzicht' },
  { value: 'provincial', label: 'Vertegenwoordiger (provincie)', description: 'Toegang beperkt tot de toegewezen provincie' },
  { value: 'marketing', label: 'Marketing', description: 'Alleen toegang tot de geaggregeerde marketingpagina' },
]

export const ROL_LABEL: Record<DashboardRol, string> = {
  admin: 'Admin',
  national: 'Vertegenwoordiger',
  provincial: 'Vertegenwoordiger',
  marketing: 'Marketing',
}

export const ROL_KLEUR: Record<DashboardRol, string> = {
  admin: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  national: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  provincial: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  marketing: 'bg-pink-600/20 text-pink-300 border-pink-600/30',
}
