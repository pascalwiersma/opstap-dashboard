export function totpIsIngeschakeld(row: {
  verified?: boolean | null
  enabled?: boolean | null
} | null | undefined): boolean {
  return row?.verified === true && row?.enabled === true
}

export function totpTabelOntbreekt(error: { code?: string; message: string }): boolean {
  const message = error.message.toLowerCase()
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  )
}
