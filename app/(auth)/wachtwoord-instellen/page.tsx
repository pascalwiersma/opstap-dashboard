'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function WachtwoordInstellenPage() {
  const [wachtwoord, setWachtwoord] = useState('')
  const [bevestig, setBevestig] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Controleer of de gebruiker een actieve sessie heeft (via invite-link)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login?error=invite_expired')
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (wachtwoord !== bevestig) {
      setFout('Wachtwoorden komen niet overeen.')
      return
    }
    if (wachtwoord.length < 8) {
      setFout('Wachtwoord moet minimaal 8 tekens zijn.')
      return
    }

    setBezig(true)
    setFout('')

    const { error } = await supabase.auth.updateUser({ password: wachtwoord })

    if (error) {
      setFout('Er ging iets mis: ' + error.message)
      setBezig(false)
      return
    }

    setKlaar(true)
    setTimeout(() => { window.location.href = '/' }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4">
            <span className="text-white text-2xl font-bold">O</span>
          </div>
          <h1 className="text-2xl font-bold text-white">OpStap Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Stel je wachtwoord in om te beginnen</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {klaar ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Wachtwoord ingesteld</p>
              <p className="text-gray-400 text-sm mt-1">Je wordt doorgestuurd naar het dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-6">Wachtwoord instellen</h2>

              {fout && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {fout}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Nieuw wachtwoord
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={wachtwoord}
                    onChange={e => setWachtwoord(e.target.value)}
                    placeholder="Minimaal 8 tekens"
                    className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Bevestig wachtwoord
                  </label>
                  <input
                    type="password"
                    required
                    value={bevestig}
                    onChange={e => setBevestig(e.target.value)}
                    placeholder="Herhaal wachtwoord"
                    className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bezig}
                  className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg transition mt-2"
                >
                  {bezig ? 'Opslaan...' : 'Wachtwoord instellen'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
