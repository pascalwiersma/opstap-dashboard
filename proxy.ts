import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

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
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/auth/') || pathname === '/wachtwoord-instellen'

  // Niet ingelogd → naar login (publieke routes mogen door)
  if (!user) {
    if (isPublicRoute) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ingelogd op wachtwoord-instellen of auth callback → altijd doorlaten
  if (pathname === '/wachtwoord-instellen' || pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  // Check dashboard_role via service_role (bypast RLS)
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
    if (pathname === '/login') return supabaseResponse
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  // Ingelogd met toegang op login-pagina → naar dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
