'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Event } from '@/app/actions/events'
import { deleteEvent } from '@/app/actions/events'

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
  kanToevoegen: boolean
  kanBewerken: boolean
  kanVerwijderen: boolean
}

export function EventsLijst({ initialEvents, kanToevoegen, kanBewerken, kanVerwijderen }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const router = useRouter()

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
        {kanToevoegen && (
        <button
          onClick={() => router.push('/events-beheer/nieuw')}
          className="flex items-center gap-2 px-4 py-2.5 bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Evenement toevoegen
        </button>
        )}
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Einde</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-white font-medium">{event.title}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-300">{event.city ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-300">{event.venue_name ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">{formatDatum(event.starts_at)}</td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">
                    {event.ends_at ? formatDatum(event.ends_at) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusKleur(event.status)}`}>
                      {statusLabel(event.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {kanBewerken && (
                      <button
                        onClick={() => router.push(`/events-beheer/${event.id}/bewerken`)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      )}
                      {kanVerwijderen && (
                      <button
                        onClick={() => handleVerwijder(event)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
