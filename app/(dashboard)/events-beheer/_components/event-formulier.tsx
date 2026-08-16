'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Calendar, Loader2, MapPin, Save, Search, Ticket, Upload, X } from 'lucide-react'
import type { Event, EventInput } from '@/app/actions/events'
import { createEvent, updateEvent, uploadEventPhoto } from '@/app/actions/events'
import { searchVenues } from '@/app/actions/venues'
import type { VenueZoekResultaat } from '@/app/actions/venues'
import type { Uitgaansgebied } from '@/app/actions/uitgaansgebieden'

const VenueKaart = dynamic(
  () => import('./venue-kaart').then(m => m.VenueKaart),
  { ssr: false, loading: () => <div className="w-full h-44 rounded-xl bg-gray-800 animate-pulse" /> }
)

const GebiedKiezer = dynamic(
  () => import('./gebied-kiezer').then(m => m.GebiedKiezer),
  { ssr: false, loading: () => <div className="w-full h-72 rounded-xl bg-gray-800 animate-pulse" /> }
)

const STATUS_OPTIES = [
  { value: 'active' as const, label: 'Actief' },
  { value: 'cancelled' as const, label: 'Geannuleerd' },
  { value: 'finished' as const, label: 'Afgelopen' },
]

type LocatieModus = 'venue' | 'gebied'

type Props = {
  uitgaansgebieden: Uitgaansgebied[]
  currentUserId: string
  event?: Event
}

export function EventFormulier({ uitgaansgebieden, currentUserId, event }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  // Form fields
  const [titel, setTitel] = useState(event?.title ?? '')
  const [omschrijving, setOmschrijving] = useState(event?.description ?? '')
  const [startsAt, setStartsAt] = useState(
    event?.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : ''
  )
  const [stad, setStad] = useState(event?.city ?? '')
  const [status, setStatus] = useState<Event['status']>(event?.status ?? 'active')
  const [maxDeelnemers, setMaxDeelnemers] = useState(
    event?.max_attendees != null ? String(event.max_attendees) : ''
  )
  const [ticketUrl, setTicketUrl] = useState(event?.ticket_url ?? '')

  // Locatie modus
  const heeftVenue = !!(event?.venue_id)
  const [locatieModus, setLocatieModus] = useState<LocatieModus>(heeftVenue ? 'venue' : 'venue')

  // Venue search
  const [venueZoek, setVenueZoek] = useState('')
  const [venueResultaten, setVenueResultaten] = useState<VenueZoekResultaat[]>([])
  const [venueZoekBezig, setVenueZoekBezig] = useState(false)
  const [geselecteerdeVenue, setGeselecteerdeVenue] = useState<VenueZoekResultaat | null>(
    event?.venue_id && event?.venue_name
      ? { id: event.venue_id, name: event.venue_name, lat: event.lat ?? 0, lng: event.lng ?? 0, type: null }
      : null
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Gebied
  const [gebiedLocatie, setGebiedLocatie] = useState<{ lat: number; lng: number } | null>(null)

  // Photo
  const [fotoBestand, setFotoBestand] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(event?.photo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const geselecteerdGebied = uitgaansgebieden.find(g => g.naam === stad)

  function wisselLocatieModus(modus: LocatieModus) {
    setLocatieModus(modus)
    if (modus === 'venue') setGebiedLocatie(null)
    if (modus === 'gebied') {
      setGeselecteerdeVenue(null)
      setVenueZoek('')
      setVenueResultaten([])
    }
  }

  function onVenueZoekChange(waarde: string) {
    setVenueZoek(waarde)
    if (!waarde.trim()) { setVenueResultaten([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setVenueZoekBezig(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchVenues(waarde, stad || undefined)
        setVenueResultaten(res)
      } finally {
        setVenueZoekBezig(false)
      }
    }, 300)
  }

  function kiesVenue(v: VenueZoekResultaat) {
    setGeselecteerdeVenue(v)
    setVenueZoek('')
    setVenueResultaten([])
  }

  function verwijderVenue() {
    setGeselecteerdeVenue(null)
    setVenueZoek('')
    setVenueResultaten([])
  }

  function onFotoKiezen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoBestand(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  function verwijderFoto() {
    setFotoBestand(null)
    setFotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleOpslaan() {
    if (!titel.trim()) { setFout('Titel is verplicht.'); return }
    if (!startsAt) { setFout('Startdatum is verplicht.'); return }
    setFout(null)

    startTransition(async () => {
      try {
        let photoUrl = event?.photo_url ?? null
        if (fotoBestand) {
          const fd = new FormData()
          fd.append('file', fotoBestand)
          photoUrl = await uploadEventPhoto(fd)
        }

        const locatieLat = locatieModus === 'venue' ? (geselecteerdeVenue?.lat ?? null) : (gebiedLocatie?.lat ?? null)
        const locatieLng = locatieModus === 'venue' ? (geselecteerdeVenue?.lng ?? null) : (gebiedLocatie?.lng ?? null)

        const input: EventInput = {
          title: titel.trim(),
          description: omschrijving.trim() || null,
          starts_at: new Date(startsAt).toISOString(),
          venue_id: locatieModus === 'venue' ? (geselecteerdeVenue?.id ?? null) : null,
          city: stad || null,
          ticket_url: ticketUrl.trim() || null,
          artists: null,
          photo_url: photoUrl,
          lat: locatieLat,
          lng: locatieLng,
          max_attendees: maxDeelnemers ? parseInt(maxDeelnemers) : null,
          status,
          creator_id: currentUserId,
        }

        if (event) {
          const { creator_id, ...rest } = input
          void creator_id
          await updateEvent(event.id, rest)
        } else {
          await createEvent(input)
        }

        router.push('/events-beheer')
        router.refresh()
      } catch (e) {
        setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
      }
    })
  }

  const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/events-beheer')}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-display text-white">
          {event ? 'Event bewerken' : 'Event aanmaken'}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Basisinfo */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Basisinformatie</h2>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Titel *</label>
            <input value={titel} onChange={e => setTitel(e.target.value)} placeholder="Evenementnaam" className={invoerKlasse} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Omschrijving</label>
            <textarea
              value={omschrijving}
              onChange={e => setOmschrijving(e.target.value)}
              rows={5}
              placeholder="Beschrijving, programma, artiesten..."
              className={`${invoerKlasse} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Startdatum en -tijd *
              </label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={invoerKlasse} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Event['status'])} className={invoerKlasse}>
                {STATUS_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <Ticket className="w-3.5 h-3.5" /> Ticket URL
              </label>
              <input type="url" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://..." className={invoerKlasse} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Max. deelnemers</label>
              <input type="number" min="1" value={maxDeelnemers} onChange={e => setMaxDeelnemers(e.target.value)} placeholder="Onbeperkt" className={invoerKlasse} />
            </div>
          </div>
        </section>

        {/* Locatie */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Locatie</h2>

          {/* Stad */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
              <MapPin className="w-3.5 h-3.5" /> Stad
            </label>
            <select
              value={stad}
              onChange={e => { setStad(e.target.value); setVenueZoek(''); setVenueResultaten([]) }}
              className={invoerKlasse}
            >
              <option value="">— Selecteer stad —</option>
              {uitgaansgebieden.map(g => <option key={g.id} value={g.naam}>{g.naam}</option>)}
            </select>
          </div>

          {/* Modus toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Soort locatie</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-700 w-fit">
              {([['venue', 'Venue'], ['gebied', 'Gebied tekenen']] as const).map(([modus, label]) => (
                <button
                  key={modus}
                  onClick={() => wisselLocatieModus(modus)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    locatieModus === modus
                      ? 'bg-opstap-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Venue zoeken */}
          {locatieModus === 'venue' && (
            <div>
              {geselecteerdeVenue ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-800 border border-opstap-orange-600/40 rounded-lg px-3 py-2.5">
                    <span className="text-sm text-white font-medium">{geselecteerdeVenue.name}</span>
                    <button onClick={verwijderVenue} className="text-gray-400 hover:text-white transition-colors ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {geselecteerdeVenue.lat !== 0 && (
                    <VenueKaart key={geselecteerdeVenue.id} lat={geselecteerdeVenue.lat} lng={geselecteerdeVenue.lng} />
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      value={venueZoek}
                      onChange={e => onVenueZoekChange(e.target.value)}
                      placeholder={stad ? `Venue zoeken in ${stad}...` : 'Selecteer eerst een stad'}
                      className={`${invoerKlasse} pl-9`}
                    />
                    {venueZoekBezig && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                    )}
                  </div>
                  {venueResultaten.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                      {venueResultaten.map(v => (
                        <li key={v.id}>
                          <button
                            onClick={() => kiesVenue(v)}
                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {v.name}
                            {v.type && <span className="text-xs text-gray-500 ml-auto">{v.type}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {venueZoek.trim() && !venueZoekBezig && venueResultaten.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">Geen venues gevonden.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gebied tekenen */}
          {locatieModus === 'gebied' && (
            <div>
              {gebiedLocatie && (
                <p className="text-xs text-emerald-400 mb-2">
                  Gebied vastgelegd — middelpunt {gebiedLocatie.lat.toFixed(4)}, {gebiedLocatie.lng.toFixed(4)}
                </p>
              )}
              <GebiedKiezer
                cityCenter={geselecteerdGebied ? { lat: geselecteerdGebied.centrum_lat, lng: geselecteerdGebied.centrum_lng } : undefined}
                onChange={setGebiedLocatie}
              />
            </div>
          )}
        </section>

        {/* Foto */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Foto</h2>

          {fotoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoPreview} alt="Preview" className="w-full h-52 object-cover rounded-xl" />
              <button
                onClick={verwijderFoto}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-opstap-orange-500 hover:text-gray-400 transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">Klik om een foto te uploaden</span>
              <span className="text-xs">JPG, PNG of WEBP</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFotoKiezen}
          />
        </section>

        {/* Error */}
        {fout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
        )}

        {/* Acties */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.push('/events-beheer')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleOpslaan}
            disabled={pending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {pending ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
