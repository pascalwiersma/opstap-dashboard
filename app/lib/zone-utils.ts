export const ZONE_CATEGORIEEN = [
  { value: 'stapstraat', label: 'Stapstraat', kleur: '#8b5cf6' },
  { value: 'terras',     label: 'Terras',     kleur: '#10b981' },
  { value: 'plein',      label: 'Plein',      kleur: '#3b82f6' },
  { value: 'park',       label: 'Park',       kleur: '#059669' },
  { value: 'overig',     label: 'Overig',     kleur: '#6b7280' },
] as const

export type ZoneCategorie = typeof ZONE_CATEGORIEEN[number]['value']

export function zonekleur(categorie: string): string {
  return ZONE_CATEGORIEEN.find(c => c.value === categorie)?.kleur ?? '#6b7280'
}
