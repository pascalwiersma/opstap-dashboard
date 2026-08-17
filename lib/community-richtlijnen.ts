export type RichtlijnTaal = 'nl' | 'en'

export type CommunityRichtlijn = {
  code: string
  groepId: 'respect' | 'afspraken' | 'veiligheid' | 'verboden'
  tekst: { nl: string; en: string }
}

const GROEPEN: Record<CommunityRichtlijn['groepId'], { nl: string; en: string }> = {
  respect: { nl: '1. Respectvol gedrag', en: '1. Respectful behaviour' },
  afspraken: { nl: '2. Afspraken nakomen', en: '2. Keeping commitments' },
  veiligheid: { nl: '3. Veiligheid', en: '3. Safety' },
  verboden: { nl: '4. Verboden gedrag', en: '4. Prohibited behaviour' },
}

/** Genummerde regels uit de community richtlijnen (opstap.app/richtlijnen). */
export const COMMUNITY_RICHTLIJNEN: CommunityRichtlijn[] = [
  { groepId: 'respect', code: '1.1', tekst: { nl: 'Behandel anderen zoals je zelf behandeld wil worden.', en: 'Treat others the way you want to be treated.' } },
  { groepId: 'respect', code: '1.2', tekst: { nl: 'Discriminatie op basis van afkomst, geslacht, religie, seksuele geaardheid of andere kenmerken wordt niet getolereerd.', en: 'Discrimination based on origin, gender, religion, sexual orientation or other characteristics is not tolerated.' } },
  { groepId: 'respect', code: '1.3', tekst: { nl: 'Lastigvallen, intimidatie, pesten of bedreigen van andere gebruikers is verboden.', en: 'Harassment, intimidation, bullying or threatening other users is prohibited.' } },
  { groepId: 'respect', code: '1.4', tekst: { nl: 'Ongepaste profielfoto’s en gebruikersnamen zijn niet toegestaan.', en: 'Inappropriate profile photos and usernames are not allowed.' } },
  { groepId: 'afspraken', code: '2.1', tekst: { nl: 'Als je incheckt voor een avond, verklaar je dat je serieus van plan bent te gaan.', en: 'When you check in for an evening, you confirm you seriously intend to go.' } },
  { groepId: 'afspraken', code: '2.2', tekst: { nl: 'Kom je toch niet, meld dit dan zo vroeg mogelijk via de app.', en: 'If you cannot make it, cancel as early as possible in the app.' } },
  { groepId: 'afspraken', code: '2.3', tekst: { nl: 'No-shows zonder afmelding verlagen je betrouwbaarheidsscore.', en: 'No-shows without cancelling lower your trust score.' } },
  { groepId: 'afspraken', code: '2.4', tekst: { nl: 'Bij herhaalde no-shows kan je account tijdelijk of permanent worden geblokkeerd.', en: 'Repeated no-shows may result in a temporary or permanent account block.' } },
  { groepId: 'veiligheid', code: '3.1', tekst: { nl: 'Identiteitsverificatie is verplicht om te kunnen inchecken en deel te nemen aan groepschats.', en: 'Identity verification is required to check in and join group chats.' } },
  { groepId: 'veiligheid', code: '3.2', tekst: { nl: 'De app is uitsluitend toegankelijk voor personen van 18 jaar en ouder.', en: 'The app is only available to people aged 18 and over.' } },
  { groepId: 'verboden', code: '4.1', tekst: { nl: 'Valse identiteitsgegevens opgeven bij de verificatie.', en: 'Providing false identity details during verification.' } },
  { groepId: 'verboden', code: '4.2', tekst: { nl: 'Meerdere accounts aanmaken.', en: 'Creating multiple accounts.' } },
  { groepId: 'verboden', code: '4.3', tekst: { nl: 'Persoonlijke gegevens van andere gebruikers delen buiten de app.', en: 'Sharing other users’ personal data outside the app.' } },
  { groepId: 'verboden', code: '4.4', tekst: { nl: 'Seksuele of gewelddadige berichten sturen in de groepschat.', en: 'Sending sexual or violent messages in the group chat.' } },
  { groepId: 'verboden', code: '4.5', tekst: { nl: 'De app gebruiken voor commerciële doeleinden of spam.', en: 'Using the app for commercial purposes or spam.' } },
  { groepId: 'verboden', code: '4.6', tekst: { nl: 'Misbruik maken van de rapporteer- of blokkeerknop.', en: 'Misusing the report or block button.' } },
]

export function groepLabel(groepId: CommunityRichtlijn['groepId'], taal: RichtlijnTaal = 'nl'): string {
  return GROEPEN[groepId][taal]
}

export function richtlijnLabel(regel: CommunityRichtlijn, taal: RichtlijnTaal = 'nl'): string {
  return `${regel.code} ${regel.tekst[taal]}`
}

export function vindRichtlijn(code: string): CommunityRichtlijn | undefined {
  return COMMUNITY_RICHTLIJNEN.find(r => r.code === code)
}

/** Haalt `1.3` uit `"1.3"` of legacy `"1.3 Lastigvallen…"`. */
export function parseGuidelineCode(reason: string): string | null {
  const m = reason.trim().match(/^(\d+\.\d+)\b/)
  return m?.[1] ?? null
}

/** Toont opgeslagen reden (code of legacy tekst) in de gekozen taal. */
export function formatOpgeslagenReden(reason: string, taal: RichtlijnTaal = 'nl'): string {
  const code = parseGuidelineCode(reason)
  if (!code) return reason
  const regel = vindRichtlijn(code)
  if (!regel) return reason
  return richtlijnLabel(regel, taal)
}

export const RICHTLIJN_GROEP_IDS = Object.keys(GROEPEN) as CommunityRichtlijn['groepId'][]
