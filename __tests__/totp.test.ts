import { describe, expect, it } from 'vitest'
import { nieuwTotpGeheim, totpGeldig, totpHuidigeCode, totpUri } from '@/lib/totp'

describe('totp', () => {
  it('maakt een otpauth-URI met issuer OpStap', () => {
    const secret = nieuwTotpGeheim()
    const uri = totpUri(secret, '+31612345678')
    expect(uri.startsWith('otpauth://totp/OpStap:')).toBe(true)
    expect(uri).toContain('issuer=OpStap')
  })

  it('accepteert de huidige code en weigert een foute', () => {
    const secret = nieuwTotpGeheim()
    const code = totpHuidigeCode(secret)
    expect(totpGeldig(secret, code)).toBe(true)
    expect(totpGeldig(secret, '000000')).toBe(false)
  })
})
