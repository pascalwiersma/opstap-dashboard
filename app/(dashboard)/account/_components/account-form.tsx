'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEigenWachtwoord } from '@/app/actions/gebruikers'
import { disableEigenTotp, startEigenTotpWissel } from '@/app/actions/totp'
import { Loader2, Save, Shield } from 'lucide-react'

const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

export function AccountForm({ totpActief }: { totpActief: boolean }) {
  const router = useRouter()
  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordBevestiging, setWachtwoordBevestiging] = useState('')
  const [bezig, setBezig] = useState(false)
  const [totpBezig, setTotpBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [ok, setOk] = useState('')
  const [totpFout, setTotpFout] = useState('')

  async function handleWachtwoord(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    setOk('')
    try {
      await updateEigenWachtwoord(wachtwoord, wachtwoordBevestiging)
      setWachtwoord('')
      setWachtwoordBevestiging('')
      setOk('Wachtwoord is opgeslagen.')
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBezig(false)
    }
  }

  async function handleTotpWissel() {
    if (!confirm('Nieuwe 2FA-code genereren? Je moet daarna opnieuw een verificatiecode invoeren.')) {
      return
    }
    setTotpBezig(true)
    setTotpFout('')
    try {
      await startEigenTotpWissel()
      window.location.href = '/login/2fa-setup'
    } catch (err) {
      setTotpFout(err instanceof Error ? err.message : '2FA wijzigen is mislukt.')
      setTotpBezig(false)
    }
  }

  async function handleTotpUit() {
    if (!confirm('2FA uitzetten? Bij de volgende stap moet je 2FA opnieuw instellen.')) {
      return
    }
    setTotpBezig(true)
    setTotpFout('')
    try {
      await disableEigenTotp()
      window.location.href = '/login/2fa-setup'
    } catch (err) {
      setTotpFout(err instanceof Error ? err.message : '2FA uitzetten is mislukt.')
      setTotpBezig(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleWachtwoord} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Wachtwoord</h2>
        <p className="text-xs text-gray-500">Minimaal 8 tekens. Daarna log je in met dit wachtwoord of via SMS.</p>
        {fout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
        )}
        {ok && (
          <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-4 py-3">{ok}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nieuw wachtwoord</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              className={invoerKlasse}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Bevestig wachtwoord</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={wachtwoordBevestiging}
              onChange={e => setWachtwoordBevestiging(e.target.value)}
              className={invoerKlasse}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={bezig}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
          >
            {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bezig ? 'Opslaan...' : 'Wachtwoord opslaan'}
          </button>
        </div>
      </form>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">2FA</h2>
        <p className="text-xs text-gray-500">
          {totpActief
            ? '2FA staat aan. Een nieuwe code of uitzetten brengt je naar de setup, daarna is 2FA weer verplicht.'
            : '2FA staat uit. Stel het opnieuw in.'}
        </p>
        {totpFout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{totpFout}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTotpWissel}
            disabled={totpBezig}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {totpBezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Nieuwe 2FA-code
          </button>
          {totpActief && (
            <button
              type="button"
              onClick={handleTotpUit}
              disabled={totpBezig}
              className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50"
            >
              2FA uitzetten
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
