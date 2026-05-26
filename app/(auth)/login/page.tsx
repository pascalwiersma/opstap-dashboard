'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlError = searchParams.get('error')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verwerk invite-tokens die Supabase als hash-fragment meestuurt
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.slice(1))
    const type = params.get('type')
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (type === 'invite' && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => { window.location.href = '/wachtwoord-instellen' })
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.user) {
      setError('E-mailadres of wachtwoord is onjuist.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('dashboard_role')
      .eq('id', data.user.id)
      .single()

    if (!profile?.dashboard_role) {
      await supabase.auth.signOut()
      setError('Geen toegang. Neem contact op met de beheerder.')
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  const displayError =
    error ||
    (urlError === 'unauthorized' ? 'Geen toegang tot het dashboard.' : '') ||
    (urlError === 'invite_expired' ? 'Uitnodigingslink is verlopen. Vraag een nieuwe uitnodiging aan.' : '')

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4">
            <span className="text-white text-2xl font-bold">O</span>
          </div>
          <h1 className="text-2xl font-bold text-white">OpStap Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Beheer omgeving — alleen voor admins</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Inloggen</h2>

          {displayError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                placeholder="admin@opstap.nl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition mt-2"
            >
              {loading ? 'Inloggen...' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
