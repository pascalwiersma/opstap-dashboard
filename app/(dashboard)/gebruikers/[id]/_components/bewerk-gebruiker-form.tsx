'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Gebruiker } from '@/app/actions/gebruikers'
import { updateGebruiker } from '@/app/actions/gebruikers'
import { enrollTotp, resetTotp, type TotpEnrollment } from '@/app/actions/totp'
import { splitsNaam } from '@/lib/naam'
import { ROL_OPTIES, type DashboardRol } from '@/lib/dashboard-rollen'
import { ArrowLeft, Check, ChevronDown, Copy, Loader2, Save, Shield } from 'lucide-react'

const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

export function BewerkGebruikerForm({ gebruiker }: { gebruiker: Gebruiker }) {
  const router = useRouter()
  const naam = splitsNaam(gebruiker.name)
  const [voornaam, setVoornaam] = useState(naam.voornaam)
  const [achternaam, setAchternaam] = useState(naam.achternaam)
  const [phone, setPhone] = useState(gebruiker.phone ?? '')
  const [rol, setRol] = useState<DashboardRol>(gebruiker.dashboard_role)
  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordBevestiging, setWachtwoordBevestiging] = useState('')
  const [bezig, setBezig] = useState(false)
  const [totpBezig, setTotpBezig] = useState(false)
  const [fout, setFout] = useState('')
  const [totpFout, setTotpFout] = useState('')
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [totpActief, setTotpActief] = useState(gebruiker.totp_ingeschakeld)
  const [gekopieerd, setGekopieerd] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      await updateGebruiker({
        id: gebruiker.id,
        voornaam,
        achternaam,
        phone,
        role: rol,
        wachtwoord,
        wachtwoordBevestiging,
      })
      router.push('/gebruikers')
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Er ging iets mis.')
      setBezig(false)
    }
  }

  async function handleTotp(regenereren: boolean) {
    if (regenereren && !confirm('Nieuwe 2FA-code genereren? De oude code in Dashlane werkt dan niet meer.')) {
      return
    }
    setTotpBezig(true)
    setTotpFout('')
    setEnrollment(null)
    try {
      const resultaat = regenereren ? await resetTotp(gebruiker.id) : await enrollTotp(gebruiker.id)
      setEnrollment(resultaat)
      setTotpActief(true)
    } catch (err) {
      setTotpFout(err instanceof Error ? err.message : '2FA genereren is mislukt.')
    } finally {
      setTotpBezig(false)
    }
  }

  async function kopieerSecret() {
    if (!enrollment) return
    await navigator.clipboard.writeText(enrollment.secret)
    setGekopieerd(true)
    window.setTimeout(() => setGekopieerd(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {fout && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
      )}

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Gegevens</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Voornaam</label>
            <input
              required
              value={voornaam}
              onChange={e => setVoornaam(e.target.value)}
              className={invoerKlasse}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Achternaam</label>
            <input
              required
              value={achternaam}
              onChange={e => setAchternaam(e.target.value)}
              className={invoerKlasse}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Telefoonnummer</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="06 12345678"
            className={invoerKlasse}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rol</label>
          <div className="relative">
            <select
              value={rol}
              onChange={e => setRol(e.target.value as DashboardRol)}
              className={`${invoerKlasse} appearance-none pr-10`}
            >
              {ROL_OPTIES.map(optie => (
                <option key={optie.value} value={optie.value}>{optie.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {ROL_OPTIES.find(o => o.value === rol)?.description}
          </p>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Wachtwoord</h2>
        <p className="text-xs text-gray-500">
          Leeg laten om het huidige wachtwoord te behouden. Minimaal 8 tekens als je een nieuw wachtwoord zet.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nieuw wachtwoord</label>
            <input
              type="password"
              autoComplete="new-password"
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
              value={wachtwoordBevestiging}
              onChange={e => setWachtwoordBevestiging(e.target.value)}
              className={invoerKlasse}
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">2FA (TOTP)</h2>
        <p className="text-xs text-gray-500">
          Scan de QR in een authenticator of plak de geheime code in Dashlane. Issuer: OpStap.
        </p>
        {totpActief && !enrollment && (
          <p className="text-sm text-emerald-400">2FA is actief voor deze gebruiker.</p>
        )}
        {totpFout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{totpFout}</p>
        )}
        {enrollment && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollment.qrDataUrl}
              alt="TOTP QR-code"
              className="w-60 h-60 rounded-xl bg-white p-2"
            />
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Geheime code (voor Dashlane)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white tracking-wider break-all">
                  {enrollment.secret}
                </code>
                <button
                  type="button"
                  onClick={kopieerSecret}
                  className="shrink-0 p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Kopiëren"
                >
                  {gekopieerd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Deze code wordt alleen nu getoond. Daarna moet je opnieuw genereren.
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => handleTotp(totpActief)}
          disabled={totpBezig}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {totpBezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {totpBezig
            ? 'Genereren...'
            : totpActief
              ? 'Nieuwe 2FA-code genereren'
              : '2FA instellen'}
        </button>
      </section>

      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push('/gebruikers')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Annuleren
        </button>
        <button
          type="submit"
          disabled={bezig}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
        >
          {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bezig ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}
