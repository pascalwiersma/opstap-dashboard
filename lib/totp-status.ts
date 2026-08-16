export function totpIsIngeschakeld(row: {
  verified?: boolean | null
  enabled?: boolean | null
} | null | undefined): boolean {
  return row?.verified === true && row?.enabled === true
}
