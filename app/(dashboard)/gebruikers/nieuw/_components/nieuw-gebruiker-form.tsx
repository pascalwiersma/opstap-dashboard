'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addGebruiker,
  searchProfielenVoorDashboard,
  type ProfielZoekResultaat,
} from '@/app/actions/gebruikers'
import { ArrowLeft, Check, ChevronDown, Loader2, Save, Search, UserRound, X } from 'lucide-react'

const invoerKlasse =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

function telefoonWeergave(phone: string | null): string {
  if (!phone) return 'Geen telefoonnummer'
  if (phone.startsWith('+31')) return `0${phone.slice(3)}`
  return phone
}

export function NieuwGebruikerForm({ rollen }: { rollen: { slug: string; name: string }[] }) {
  const router = useRouter()
  const [zoek, setZoek] = useState('')
  const [resultaten, setResultaten] = useState<ProfielZoekResultaat[]>([])
  const [zoekBezig, setZoekBezig] = useState(false)
  const [zoekFout, setZoekFout] = useState('')
  const [gekozen, setGekozen] = useState<ProfielZoekResultaat | null>(null)
  const [rol, setRol] = useState(rollen.find(r => r.slug === 'national')?.slug ?? rollen[0]?.slug ?? '')
  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordBevestiging, setWachtwoordBevestiging] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const zoekVolgorde = useRef(0)

  useEffect(() => {
    if (gekozen) return

    const q = zoek.trim()
    if (q.length < 2) {
      setResultaten([])
      setZoekBezig(false)
      setZoekFout('')
      return
    }

    const volgorde = ++zoekVolgorde.current
    setZoekBezig(true)
    setZoekFout('')
    const timer = setTimeout(async () => {
      try {
        const rijen = await searchProfielenVoorDashboard(q)
        if (volgorde !== zoekVolgorde.current) return
        setResultaten(rijen)
      } catch (err) {
        if (volgorde !== zoekVolgorde.current) return
        setResultaten([])
        setZoekFout(err instanceof Error ? err.message : 'Zoeken mislukt.')
      } finally {
        if (volgorde === zoekVolgorde.current) setZoekBezig(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [zoek, gekozen])

  function kiesProfiel(profiel: ProfielZoekResultaat) {
    if (profiel.dashboard_role) return
    setGekozen(profiel)
    setZoek(profiel.name?.trim() || '')
    setResultaten([])
    setFout('')
  }

  function wisKeuze() {
    setGekozen(null)
    setZoek('')
    setResultaten([])
    setFout('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gekozen) {
      setFout('Zoek en selecteer eerst een bestaande app-gebruiker.')
      return
    }
    setBezig(true)
    setFout('')
    try {
      const id = await addGebruiker({
        userId: gekozen.id,
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">App-gebruiker</h2>
        <p className="text-xs text-gray-500">
          Zoek op naam. De persoon moet al een account in de OpStap-app hebben. Controleer het telefoonnummer
          om zeker te weten dat je de juiste gebruiker kiest.
        </p>

        {gekozen ? (
          <div className="flex items-start gap-3 rounded-xl border border-opstap-orange-500/40 bg-opstap-orange-500/10 px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800">
              <UserRound className="h-4 w-4 text-opstap-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {gekozen.name?.trim() || 'Naamloos'}
                {gekozen.username ? (
                  <span className="ml-2 text-xs font-normal text-gray-400">@{gekozen.username}</span>
                ) : null}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">{telefoonWeergave(gekozen.phone)}</p>
            </div>
            <button
              type="button"
              onClick={wisKeuze}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              aria-label="Andere gebruiker kiezen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Zoek op naam</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={zoek}
                onChange={e => setZoek(e.target.value)}
                placeholder="Bijv. Pascal"
                autoComplete="off"
                className={`${invoerKlasse} pl-9 pr-9`}
              />
              {zoekBezig && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-500" />
              )}
            </div>

            {zoekFout && <p className="mt-2 text-xs text-red-400">{zoekFout}</p>}

            {zoek.trim().length >= 2 && !zoekBezig && resultaten.length === 0 && !zoekFout && (
              <p className="mt-2 text-xs text-gray-500">
                Geen app-gebruikers gevonden. De persoon moet eerst een account in de app hebben.
              </p>
            )}

            {resultaten.length > 0 && (
              <ul className="mt-2 max-h-72 overflow-auto rounded-xl border border-gray-700 bg-gray-950 divide-y divide-gray-800">
                {resultaten.map(profiel => {
                  const alTeam = Boolean(profiel.dashboard_role)
                  return (
                    <li key={profiel.id}>
                      <button
                        type="button"
                        disabled={alTeam}
                        onClick={() => kiesProfiel(profiel)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                          alTeam
                            ? 'cursor-not-allowed opacity-60'
                            : 'hover:bg-gray-800/80'
                        }`}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800">
                          {alTeam ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <UserRound className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {profiel.name?.trim() || 'Naamloos'}
                            {profiel.username ? (
                              <span className="ml-2 text-xs font-normal text-gray-400">
                                @{profiel.username}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {telefoonWeergave(profiel.phone)}
                          </p>
                          {alTeam && (
                            <p className="text-xs text-emerald-400/90 mt-1">
                              Al teamlid ({profiel.dashboard_role_name})
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

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
          disabled={bezig || !gekozen}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
        >
          {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bezig ? 'Toevoegen...' : 'Toegang geven'}
        </button>
      </div>
    </form>
  )
}
