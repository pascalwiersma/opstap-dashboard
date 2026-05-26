import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  // PKCE flow (nieuwere Supabase versies)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = type === 'invite' ? '/wachtwoord-instellen' : '/'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Legacy token_hash flow
  if (token_hash && type === 'invite') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' })
    if (!error) {
      return NextResponse.redirect(`${origin}/wachtwoord-instellen`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invite_expired`)
}
