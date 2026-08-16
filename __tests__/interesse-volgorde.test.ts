import { describe, expect, it } from 'vitest'
import {
  arrayVerplaats,
  herschikBinnenCategorie,
  verplaatsNaarCategorie,
  volgordeWijzigingen,
} from '@/lib/interesse-volgorde'

const tags = [
  { id: 'a', category_id: 'muziek', sort_order: 1 },
  { id: 'b', category_id: 'muziek', sort_order: 2 },
  { id: 'c', category_id: 'muziek', sort_order: 3 },
  { id: 'd', category_id: 'uitgaan', sort_order: 1 },
]

describe('arrayVerplaats', () => {
  it('verplaatst een item en laat de rest schuiven', () => {
    expect(arrayVerplaats(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('doet niets bij dezelfde index of ongeldige index', () => {
    expect(arrayVerplaats(['a', 'b'], 0, 0)).toEqual(['a', 'b'])
    expect(arrayVerplaats(['a', 'b'], -1, 1)).toEqual(['a', 'b'])
  })
})

describe('herschikBinnenCategorie', () => {
  it('hernummert sort_order na slepen binnen een categorie', () => {
    const next = herschikBinnenCategorie(tags, 'muziek', 0, 2)
    expect(next.filter(t => t.category_id === 'muziek').sort((a, b) => a.sort_order - b.sort_order).map(t => t.id))
      .toEqual(['b', 'c', 'a'])
    expect(next.find(t => t.id === 'd')).toEqual(tags[3])
  })
})

describe('verplaatsNaarCategorie', () => {
  it('verplaatst een tag naar een andere categorie en hernummert beide', () => {
    const next = verplaatsNaarCategorie(tags, 'a', 'uitgaan', 0)
    expect(next.find(t => t.id === 'a')).toEqual({ id: 'a', category_id: 'uitgaan', sort_order: 1 })
    expect(next.find(t => t.id === 'd')).toEqual({ id: 'd', category_id: 'uitgaan', sort_order: 2 })
    expect(next.find(t => t.id === 'b')).toEqual({ id: 'b', category_id: 'muziek', sort_order: 1 })
    expect(next.find(t => t.id === 'c')).toEqual({ id: 'c', category_id: 'muziek', sort_order: 2 })
  })

  it('voegt toe aan het einde van een lege categorie', () => {
    const next = verplaatsNaarCategorie(tags, 'd', 'hobbies', 0)
    expect(next.find(t => t.id === 'd')).toEqual({ id: 'd', category_id: 'hobbies', sort_order: 1 })
  })
})

describe('volgordeWijzigingen', () => {
  it('geeft alleen rijen terug die category of sort_order veranderden', () => {
    const after = verplaatsNaarCategorie(tags, 'a', 'uitgaan', 1)
    const changes = volgordeWijzigingen(tags, after)
    expect(changes).toEqual([
      { id: 'a', category_id: 'uitgaan', sort_order: 2 },
      { id: 'b', category_id: 'muziek', sort_order: 1 },
      { id: 'c', category_id: 'muziek', sort_order: 2 },
    ])
  })

  it('is leeg als er niets veranderde', () => {
    expect(volgordeWijzigingen(tags, tags)).toEqual([])
  })
})
