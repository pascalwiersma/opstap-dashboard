'use client'

import { bevestigTotpSetup, type TotpEnrollment } from '@/app/actions/totp'
import { TotpQrGeheim } from '@/app/_components/totp-qr-geheim'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

export function TotpSetupForm({ enrollment }: { enrollment: TotpEnrollment }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleBevestig(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await bevestigTotpSetup(code)
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ongeldige of verlopen code.')
      setLoading(false)
    }
  }

  async function handleUitloggen() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="OpStap" className="w-11 h-11 object-contain" />
          </div>
          <h1 className="text-2xl font-display text-white">OpStap Dashboard</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-lg font-semibold text-white mb-2">2FA instellen</h2>
          <p className="text-sm text-gray-400 mb-6">
            Scan de QR-code of voer de geheime code in je authenticator-app. Daarna bevestig je met een verificatiecode. Dit is verplicht — zonder 2FA kom je niet in het dashboard.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleBevestig} className="space-y-6">
            <TotpQrGeheim secret={enrollment.secret} qrDataUrl={enrollment.qrDataUrl} />

            <div>
              <label htmlFor="verificatiecode" className="block text-sm font-medium text-gray-300 mb-1.5">
                Verificatiecode
              </label>
              <input
                id="verificatiecode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-opstap-orange-500 focus:border-transparent transition tracking-widest text-center text-lg"
                placeholder="• • • • • •"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-opstap-orange-600 hover:bg-opstap-orange-500 disabled:bg-opstap-orange-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              {loading ? 'Bevestigen...' : 'Bevestigen'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUitloggen}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition mt-4"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  )
}
