import { describe, expect, it } from 'vitest'
import { splitsNaam, voegNaamSamen } from '@/lib/naam'

describe('splitsNaam', () => {
  it('splitst voornaam en achternaam op de eerste spatie', () => {
    expect(splitsNaam('Jan de Vries')).toEqual({ voornaam: 'Jan', achternaam: 'de Vries' })
  })

  it('zet een enkele naam in voornaam', () => {
    expect(splitsNaam('Pascal')).toEqual({ voornaam: 'Pascal', achternaam: '' })
  })

  it('leeg of null wordt lege velden', () => {
    expect(splitsNaam(null)).toEqual({ voornaam: '', achternaam: '' })
    expect(splitsNaam('  ')).toEqual({ voornaam: '', achternaam: '' })
  })
})

describe('voegNaamSamen', () => {
  it('plakt voor- en achternaam', () => {
    expect(voegNaamSamen('Jan', 'de Vries')).toBe('Jan de Vries')
  })

  it('trimt en negeert lege delen', () => {
    expect(voegNaamSamen(' Pascal ', ' ')).toBe('Pascal')
  })
})
