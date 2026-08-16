import { describe, expect, it } from 'vitest'
import { sanitizeOmschrijving } from '@/lib/sanitize-omschrijving'

describe('sanitizeOmschrijving', () => {
  it('houdt koppen, lijsten, links en nadruk', () => {
    const html = '<h2>Feest</h2><p>Met <strong>DJ</strong> en <em>live</em></p><ul><li>Een</li></ul><a href="https://opstap.app">site</a>'
    const result = sanitizeOmschrijving(html)
    expect(result).toContain('<h2>Feest</h2>')
    expect(result).toContain('<strong>DJ</strong>')
    expect(result).toContain('<em>live</em>')
    expect(result).toContain('<ul>')
    expect(result).toContain('href="https://opstap.app"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('stript scripts en event-handlers', () => {
    const html = '<p>Hallo</p><script>alert(1)</script><img src=x onerror=alert(1)><p onclick="alert(1)">klik</p>'
    const result = sanitizeOmschrijving(html) ?? ''
    expect(result).not.toContain('script')
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('<img')
    expect(result).toContain('Hallo')
  })

  it('geeft null voor lege html', () => {
    expect(sanitizeOmschrijving('<p></p>')).toBeNull()
    expect(sanitizeOmschrijving('   ')).toBeNull()
    expect(sanitizeOmschrijving(null)).toBeNull()
  })
})
