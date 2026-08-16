import { Secret, TOTP } from 'otpauth'
import QRCode from 'qrcode'

const ISSUER = 'OpStap'

function totpVoor(secret: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    issuerInLabel: true,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  })
}

export function nieuwTotpGeheim(): string {
  return new Secret({ size: 20 }).base32
}

export function totpUri(secret: string, label: string): string {
  return totpVoor(secret, label).toString()
}

export async function totpQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 })
}

export function totpGeldig(secret: string, token: string): boolean {
  const code = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return false
  const delta = totpVoor(secret, ISSUER).validate({ token: code, window: 1 })
  return delta !== null
}

export function totpHuidigeCode(secret: string): string {
  return totpVoor(secret, ISSUER).generate()
}

export function totpIsIngeschakeld(row: {
  verified?: boolean | null
  enabled?: boolean | null
} | null | undefined): boolean {
  return row?.verified === true && row?.enabled === true
}
