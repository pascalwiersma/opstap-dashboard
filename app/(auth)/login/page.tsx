'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-]/g, '')
  if (/^06\d{8}$/.test(cleaned)) return '+31' + cleaned.slice(1)
  if (/^\+316\d{8}$/.test(cleaned)) return cleaned
  return null
}

const RESEND_COOLDOWN = 60

function LoginForm() {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const urlError = searchParams.get('error')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current) }
  }, [])

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN)
    cooldownTimer.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current)
        return c - 1
      })
    }, 1000)
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('Vul een geldig Nederlands mobiel nummer in.')
      return
    }

    setLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized })
    setLoading(false)

    if (otpError) {
      setError('Versturen van de code is mislukt: ' + otpError.message)
      return
    }

    setNormalizedPhone(normalized)
    setStep('code')
    startCooldown()
  }

  async function handleResend() {
    if (cooldown > 0) return
    setLoading(true)
    setError('')
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizedPhone })
    setLoading(false)
    if (otpError) { setError('Opnieuw versturen mislukt: ' + otpError.message); return }
    startCooldown()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: code,
      type: 'sms',
    })

    if (verifyError || !data.user) {
      setError('Ongeldige of verlopen code.')
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
    (urlError === 'unauthorized' ? 'Geen toegang tot het dashboard.' : '')

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
          <h2 className="text-lg font-semibold text-white mb-6">Inloggen</h2>

          {displayError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Telefoonnummer
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-opstap-orange-500 focus:border-transparent transition"
                  placeholder="06 12345678"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-opstap-orange-600 hover:bg-opstap-orange-500 disabled:bg-opstap-orange-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition mt-2"
              >
                {loading ? 'Code versturen...' : 'Code versturen'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-gray-400">We hebben een code gestuurd naar {phone}.</p>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Verificatiecode
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-opstap-orange-500 focus:border-transparent transition tracking-widest text-center text-lg"
                  placeholder="• • • • • •"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-opstap-orange-600 hover:bg-opstap-orange-500 disabled:bg-opstap-orange-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition mt-2"
              >
                {loading ? 'Bevestigen...' : 'Bevestigen'}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="w-full text-center text-sm text-gray-400 hover:text-white disabled:text-gray-600 transition"
              >
                {cooldown > 0 ? `Nieuwe code over ${cooldown}s` : 'Code opnieuw versturen'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setError('') }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Ander telefoonnummer
              </button>
            </form>
          )}
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
