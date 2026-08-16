function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function isoNaarLokaal(iso: string | null | undefined): { datum: string; tijd: string } {
  if (!iso) return { datum: '', tijd: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { datum: '', tijd: '' }
  return {
    datum: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    tijd: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function lokaalNaarIso(datum: string, tijd: string): string {
  return new Date(`${datum}T${tijd}`).toISOString()
}
