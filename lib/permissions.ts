export const RESOURCES = [
  'overzicht',
  'locaties',
  'evenementen',
  'interesses',
  'gebruikers',
  'meldingen',
  'marketing',
  'rollen',
] as const

export const ACTIONS = ['zien', 'toevoegen', 'bewerken', 'verwijderen'] as const

export type Resource = (typeof RESOURCES)[number]
export type Action = (typeof ACTIONS)[number]
export type PermissieSleutel = `${Resource}:${Action}`

export const RESOURCE_LABEL: Record<Resource, string> = {
  overzicht: 'Dashboard',
  locaties: 'Locaties',
  evenementen: 'Evenementen',
  interesses: 'Interesses',
  gebruikers: 'Gebruikers',
  meldingen: 'Meldingen',
  marketing: 'Marketing',
  rollen: 'Rollen',
}

export const ACTION_LABEL: Record<Action, string> = {
  zien: 'Zien',
  toevoegen: 'Toevoegen',
  bewerken: 'Bewerken',
  verwijderen: 'Verwijderen',
}

export const ALLE_PERMISSIES: PermissieSleutel[] = RESOURCES.flatMap(resource =>
  ACTIONS.map(action => `${resource}:${action}` as PermissieSleutel),
)

const LEGACY: Record<string, PermissieSleutel[]> = {
  admin: ALLE_PERMISSIES,
  national: [
    'overzicht:zien',
    'locaties:zien',
    'locaties:toevoegen',
    'locaties:bewerken',
    'locaties:verwijderen',
    'marketing:zien',
    'meldingen:zien',
    'meldingen:bewerken',
  ],
  provincial: [
    'overzicht:zien',
    'locaties:zien',
    'locaties:toevoegen',
    'locaties:bewerken',
    'locaties:verwijderen',
  ],
  marketing: ['marketing:zien'],
}

export function legacyPermissies(slug: string): Set<PermissieSleutel> {
  return new Set(LEGACY[slug] ?? [])
}

export type PermissieGebruiker = {
  role: string
  permissions: ReadonlySet<PermissieSleutel>
}

export function kan(user: PermissieGebruiker | null | undefined, resource: Resource, action: Action): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.permissions.has(`${resource}:${action}`)
}

export function eersteToegestanePad(user: PermissieGebruiker): string {
  const volgorde: { href: string; resource: Resource }[] = [
    { href: '/', resource: 'overzicht' },
    { href: '/kaart', resource: 'locaties' },
    { href: '/events-beheer', resource: 'evenementen' },
    { href: '/marketing', resource: 'marketing' },
    { href: '/meldingen', resource: 'meldingen' },
    { href: '/interesses', resource: 'interesses' },
    { href: '/gebruikers', resource: 'gebruikers' },
    { href: '/rollen', resource: 'rollen' },
  ]
  return volgorde.find(item => kan(user, item.resource, 'zien'))?.href ?? '/login?error=unauthorized'
}

export function slugVanNaam(naam: string): string {
  const basis = naam
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return basis || 'rol'
}
