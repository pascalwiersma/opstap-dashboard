'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Calendar, Loader2, MapPin, Save, Ticket, Upload, X } from 'lucide-react'
import type { Event, EventInput } from '@/app/actions/events'
import { createEvent, updateEvent, uploadEventPhoto } from '@/app/actions/events'
import { isoNaarLokaal, lokaalNaarIso } from '@/lib/datetime-lokaal'
import type { GetekendeLocatie } from './gebied-kiezer'

const GebiedKiezer = dynamic(
  () => import('./gebied-kiezer').then(m => m.GebiedKiezer),
  { ssr: false, loading: () => <div className="w-full h-72 rounded-xl bg-gray-800 animate-pulse" /> }
)

const OmschrijvingEditor = dynamic(
  () => import('./omschrijving-editor').then(m => m.OmschrijvingEditor),
  { ssr: false, loading: () => <div className="w-full h-[280px] rounded-lg bg-gray-800 animate-pulse" /> }
)

const STATUS_OPTIES = [
  { value: 'active' as const, label: 'Actief' },
  { value: 'cancelled' as const, label: 'Geannuleerd' },
  { value: 'finished' as const, label: 'Afgelopen' },
]

type Props = {
  currentUserId: string
  event?: Event
}

export function EventFormulier({ currentUserId, event }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  const start = isoNaarLokaal(event?.starts_at)
  const eind = isoNaarLokaal(event?.ends_at)

  const [titel, setTitel] = useState(event?.title ?? '')
  const [omschrijving, setOmschrijving] = useState(event?.description ?? '')
  const [startDatum, setStartDatum] = useState(start.datum)
  const [startTijd, setStartTijd] = useState(start.tijd)
  const [eindDatum, setEindDatum] = useState(eind.datum)
  const [eindTijd, setEindTijd] = useState(eind.tijd)
  const [status, setStatus] = useState<Event['status']>(event?.status ?? 'active')
  const [ticketUrl, setTicketUrl] = useState(event?.ticket_url ?? '')

  const bestaandeLocatie = event?.lat != null && event?.lng != null
    ? { lat: event.lat, lng: event.lng }
    : null
  const [locatie, setLocatie] = useState<GetekendeLocatie | null>(bestaandeLocatie)

  const [fotoBestand, setFotoBestand] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(event?.photo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!startDatum || !startTijd) { setFout('Startdatum en starttijd zijn verplicht.'); return }
    if (!eindDatum || !eindTijd) { setFout('Einddatum en eindtijd zijn verplicht.'); return }
    const startsAt = lokaalNaarIso(startDatum, startTijd)
    const endsAt = lokaalNaarIso(eindDatum, eindTijd)
    if (Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
      setFout('Ongeldige datum of tijd.')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setFout('Einde moet na de start liggen.')
      return
    }
    if (!locatie) {
      setFout('Teken een gebied op de kaart en rond het af.')
      return
    }
    setFout(null)

    startTransition(async () => {
      try {
        let photoUrl = event?.photo_url ?? null
        if (fotoBestand) {
          const fd = new FormData()
          fd.append('file', fotoBestand)
          photoUrl = await uploadEventPhoto(fd)
        }

        const input: EventInput = {
          title: titel.trim(),
          description: omschrijving || null,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_id: null,
          city: event?.city ?? null,
          ticket_url: ticketUrl.trim() || null,
          artists: null,
          photo_url: photoUrl,
          lat: locatie.lat,
          lng: locatie.lng,
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
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Basisinformatie</h2>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Titel *</label>
            <input value={titel} onChange={e => setTitel(e.target.value)} placeholder="Evenementnaam" className={invoerKlasse} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Omschrijving</label>
            <OmschrijvingEditor value={omschrijving} onChange={setOmschrijving} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Startdatum *
              </label>
              <input type="date" value={startDatum} onChange={e => setStartDatum(e.target.value)} className={invoerKlasse} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Starttijd *</label>
              <input type="time" value={startTijd} onChange={e => setStartTijd(e.target.value)} className={invoerKlasse} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Einddatum *
              </label>
              <input type="date" value={eindDatum} onChange={e => setEindDatum(e.target.value)} className={invoerKlasse} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Eindtijd *</label>
              <input type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)} className={invoerKlasse} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Event['status'])} className={invoerKlasse}>
                {STATUS_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <Ticket className="w-3.5 h-3.5" /> Ticket URL
              </label>
              <input type="url" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://..." className={invoerKlasse} />
            </div>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Locatie</h2>
          <p className="text-xs text-gray-500">
            Teken het gebied op de kaart (minimaal 3 punten) en rond af. De locatie is het middelpunt van de vorm.
          </p>
          {locatie && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
              Gebied vastgelegd — {locatie.lat.toFixed(4)}, {locatie.lng.toFixed(4)}
            </p>
          )}
          <GebiedKiezer
            initialCenter={bestaandeLocatie}
            onChange={setLocatie}
          />
        </section>

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

        {fout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
        )}

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
