type ExpoPushPayload = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
}

export function isGeldigeExpoToken(token: string | null | undefined): token is string {
  return Boolean(
    token &&
      (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')),
  )
}

export async function stuurExpoPush(messages: ExpoPushPayload[]): Promise<void> {
  const berichten = messages
    .filter(m => isGeldigeExpoToken(m.to))
    .map(m => ({ ...m, sound: m.sound ?? ('default' as const) }))
  if (berichten.length === 0) return
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(berichten),
  })
}

export async function stuurExpoPushNaarToken(
  token: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (!isGeldigeExpoToken(token)) return
  await stuurExpoPush([{ to: token, title, body, data }])
}
