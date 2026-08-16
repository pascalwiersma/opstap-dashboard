'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addGebruiker } from '@/app/actions/gebruikers'
import { ArrowLeft, ChevronDown, Loader2, Save } from 'lucide-react'

const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

export function NieuwGebruikerForm({ rollen }: { rollen: { slug: string; name: string }[] }) {
  const router = useRouter()
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [phone, setPhone] = useState('')
  const [rol, setRol] = useState(rollen.find(r => r.slug === 'national')?.slug ?? rollen[0]?.slug ?? '')
  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordBevestiging, setWachtwoordBevestiging] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      const id = await addGebruiker({
        voornaam,
        achternaam,
        phone,
        role: rol,
        wachtwoord,
        wachtwoordBevestiging,
      })
      router.push(`/gebruikers/${id}`)
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Er ging iets mis.')
      setBezig(false)
    }
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
              placeholder="Jan"
              className={invoerKlasse}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Achternaam</label>
            <input
              required
              value={achternaam}
              onChange={e => setAchternaam(e.target.value)}
              placeholder="de Vries"
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
              onChange={e => setRol(e.target.value)}
              className={`${invoerKlasse} appearance-none pr-10`}
            >
              {rollen.map(optie => (
                <option key={optie.slug} value={optie.slug}>{optie.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Wachtwoord</h2>
        <p className="text-xs text-gray-500">
          Optioneel. Leeg laten als de gebruiker alleen via SMS inlogt. Minimaal 8 tekens.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Wachtwoord</label>
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
          {bezig ? 'Toevoegen...' : 'Toevoegen'}
        </button>
      </div>
    </form>
  )
}
