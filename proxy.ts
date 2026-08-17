import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { totpIsIngeschakeld, totpTabelOntbreekt } from '@/lib/totp-status'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'
  const isSetup = pathname === '/login/2fa-setup'

  if (!user) {
    if (isLogin) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('dashboard_role')
    .eq('id', user.id)
    .single()

  const heeftToegang = !!profile?.dashboard_role

  if (!heeftToegang) {
    if (isLogin) return supabaseResponse
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  const { data: totp, error: totpError } = await adminClient
    .from('dashboard_totp')
    .select('verified, enabled, verified_session_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (totpError && !totpTabelOntbreekt(totpError)) {
    throw new Error(totpError.message)
  }

  const enrolled = totpIsIngeschakeld({
    verified: totp?.verified === true,
    enabled: totp?.enabled === true,
  })

  if (!enrolled) {
    if (isSetup) return supabaseResponse
    return NextResponse.redirect(new URL('/login/2fa-setup', request.url))
  }

  const { data: claimsData } = await supabase.auth.getClaims()
  const sessionId = typeof claimsData?.claims?.session_id === 'string'
    ? claimsData.claims.session_id
    : null
  const totpPending = !sessionId || totp?.verified_session_id !== sessionId
  if (totpPending) {
    if (isLogin) return supabaseResponse
    const url = new URL('/login', request.url)
    url.searchParams.set('stap', 'totp')
    return NextResponse.redirect(url)
  }

  if (isLogin || isSetup) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
