export function splitsNaam(name: string | null | undefined): { voornaam: string; achternaam: string } {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return { voornaam: '', achternaam: '' }
  const spatie = trimmed.indexOf(' ')
  if (spatie === -1) return { voornaam: trimmed, achternaam: '' }
  return {
    voornaam: trimmed.slice(0, spatie),
    achternaam: trimmed.slice(spatie + 1).trim(),
  }
}

export function voegNaamSamen(voornaam: string, achternaam: string): string {
  return `${voornaam.trim()} ${achternaam.trim()}`.trim()
}
