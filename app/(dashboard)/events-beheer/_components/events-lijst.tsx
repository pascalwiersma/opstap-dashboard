'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Save, Loader2, Calendar, Ticket, Music, MapPin } from 'lucide-react'
import type { Event, EventInput } from '@/app/actions/events'
import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events'
import type { Venue } from '@/app/actions/venues'
import type { Stad } from '@/app/actions/steden'

type FormState = {
  title: string
  description: string
  starts_at: string
  venue_id: string
  city: string
  ticket_url: string
  artists: string
  photo_url: string
  lat: string
  lng: string
  max_attendees: string
  status: 'active' | 'cancelled' | 'finished'
}

const LEEG: FormState = {
  title: '',
  description: '',
  starts_at: '',
  venue_id: '',
  city: '',
  ticket_url: '',
  artists: '',
  photo_url: '',
  lat: '',
  lng: '',
  max_attendees: '',
  status: 'active',
}

const STATUS_OPTIES: { value: Event['status']; label: string; kleur: string }[] = [
  { value: 'active', label: 'Actief', kleur: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30' },
  { value: 'cancelled', label: 'Geannuleerd', kleur: 'bg-red-600/20 text-red-300 border-red-600/30' },
  { value: 'finished', label: 'Afgelopen', kleur: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
]

function statusKleur(status: Event['status']) {
  return STATUS_OPTIES.find(o => o.value === status)?.kleur ?? ''
}

function statusLabel(status: Event['status']) {
  return STATUS_OPTIES.find(o => o.value === status)?.label ?? status
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })
}

type Props = {
  initialEvents: Event[]
  venues: Venue[]
  steden: Stad[]
  currentUserId: string
}

export function EventsLijst({ initialEvents, venues, steden, currentUserId }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(LEEG)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const router = useRouter()

  function openNieuw() {
    setEditId(null)
    setForm(LEEG)
    setFout(null)
    setModalOpen(true)
  }

  function openBewerk(event: Event) {
    setEditId(event.id)
    setForm({
      title: event.title,
      description: event.description ?? '',
      starts_at: event.starts_at ? event.starts_at.slice(0, 16) : '',
      venue_id: event.venue_id ?? '',
      city: event.city ?? '',
      ticket_url: event.ticket_url ?? '',
      artists: event.artists ?? '',
      photo_url: event.photo_url ?? '',
      lat: event.lat != null ? String(event.lat) : '',
      lng: event.lng != null ? String(event.lng) : '',
      max_attendees: event.max_attendees != null ? String(event.max_attendees) : '',
      status: event.status,
    })
    setFout(null)
    setModalOpen(true)
  }

  function sluit() {
    setModalOpen(false)
    setEditId(null)
    setFout(null)
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function buildInput(): EventInput {
    return {
      title: form.title.trim(),
      description: form.description.trim() || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      venue_id: form.venue_id || null,
      city: form.city || null,
      ticket_url: form.ticket_url.trim() || null,
      artists: form.artists.trim() || null,
      photo_url: form.photo_url.trim() || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      status: form.status,
      creator_id: currentUserId,
    }
  }

  async function handleOpslaan() {
    if (!form.title.trim()) { setFout('Titel is verplicht.'); return }
    if (!form.starts_at) { setFout('Startdatum is verplicht.'); return }
    setBezig(true); setFout(null)
    try {
      const input = buildInput()
      if (editId) {
        const { creator_id, ...rest } = input
        void creator_id
        await updateEvent(editId, rest)
        setEvents(prev => prev.map(e => e.id === editId
          ? { ...e, ...rest, venue_name: venues.find(v => v.id === rest.venue_id)?.name ?? null }
          : e
        ))
      } else {
        const nieuw = await createEvent(input)
        setEvents(prev => [{ ...nieuw, venue_name: venues.find(v => v.id === nieuw.venue_id)?.name ?? null }, ...prev])
      }
      sluit()
      router.refresh()
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  async function handleVerwijder(event: Event) {
    if (!confirm(`Event "${event.title}" verwijderen?`)) return
    try {
      await deleteEvent(event.id)
      setEvents(prev => prev.filter(e => e.id !== event.id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt.')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openNieuw}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Event toevoegen
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
          Nog geen events — voeg er een toe.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Titel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stad</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Venue</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Start</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-white font-medium">{event.title}</div>
                    {event.artists && <div className="text-gray-500 text-xs mt-0.5 truncate max-w-48">{event.artists}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-300">{event.city ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-300">{event.venue_name ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">{formatDatum(event.starts_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusKleur(event.status)}`}>
                      {statusLabel(event.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openBewerk(event)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVerwijder(event)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-base">
                {editId ? 'Event bewerken' : 'Event toevoegen'}
              </h2>
              <button onClick={sluit} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Titel */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Titel *</label>
                <input
                  value={form.title}
                  onChange={e => updateForm('title', e.target.value)}
                  placeholder="Evenementnaam"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Omschrijving */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Omschrijving</label>
                <textarea
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  rows={2}
                  placeholder="Korte beschrijving..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              {/* Artiesten */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  Artiesten / programma
                </label>
                <textarea
                  value={form.artists}
                  onChange={e => updateForm('artists', e.target.value)}
                  rows={2}
                  placeholder="DJ X, Band Y, ..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              {/* Startdatum */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Startdatum en -tijd *
                </label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => updateForm('starts_at', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Stad */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Stad
                </label>
                <select
                  value={form.city}
                  onChange={e => updateForm('city', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="">— Selecteer stad —</option>
                  {steden.map(s => (
                    <option key={s.id} value={s.naam}>{s.naam}</option>
                  ))}
                </select>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Venue</label>
                <select
                  value={form.venue_id}
                  onChange={e => updateForm('venue_id', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="">— Geen venue —</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Ticket URL */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" />
                  Ticket URL
                </label>
                <input
                  type="url"
                  value={form.ticket_url}
                  onChange={e => updateForm('ticket_url', e.target.value)}
                  placeholder="https://tickets.example.com/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Foto URL */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Foto URL</label>
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={e => updateForm('photo_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Lat/Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Breedtegraad (lat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={e => updateForm('lat', e.target.value)}
                    placeholder="53.2194"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Lengtegraad (lng)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={e => updateForm('lng', e.target.value)}
                    placeholder="6.5665"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {/* Max deelnemers + status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Max. deelnemers</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_attendees}
                    onChange={e => updateForm('max_attendees', e.target.value)}
                    placeholder="Onbeperkt"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => updateForm('status', e.target.value as Event['status'])}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    {STATUS_OPTIES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {fout && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{fout}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end shrink-0">
              <button
                onClick={sluit}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpslaan}
                disabled={bezig}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
