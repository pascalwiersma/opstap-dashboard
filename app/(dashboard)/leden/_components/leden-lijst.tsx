'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LidSamenvatting } from '@/app/actions/leden'
import { Ban, Search } from 'lucide-react'

const invoer = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500'

type Filter = 'alle' | 'banned' | 'niet_geverifieerd'

function formatDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LedenLijst({ leden }: { leden: LidSamenvatting[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('alle')

  const zichtbaar = useMemo(() => {
    const zoek = q.trim().toLowerCase()
    return leden.filter(l => {
      if (filter === 'banned' && !l.is_banned) return false
      if (filter === 'niet_geverifieerd' && l.verification_status === 'approved') return false
      if (zoek) {
        const hay = `${l.name} ${l.username ?? ''} ${l.provincie ?? ''}`.toLowerCase()
        if (!hay.includes(zoek)) return false
      }
      return true
    })
  }, [leden, q, filter])

  const filters: { id: Filter; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    { id: 'banned', label: 'Geband' },
    { id: 'niet_geverifieerd', label: 'Niet geverifieerd' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Zoek op naam, username, provincie"
            className={`${invoer} pl-9 w-full`}
          />
        </div>
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f.id
                  ? 'bg-opstap-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {zichtbaar.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
          Geen leden gevonden.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lid</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Provincie</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trust</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Laatst gezien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {zichtbaar.map(l => (
                <tr key={l.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/leden/${l.id}`} className="flex items-center gap-3 group">
                      {l.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-800" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-semibold">
                          {(l.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium group-hover:text-opstap-orange-300">
                          {l.name}
                          {l.age != null && <span className="text-gray-500 font-normal"> · {l.age}</span>}
                        </p>
                        <p className="text-xs text-gray-500">{l.username ? `@${l.username}` : l.id.slice(0, 8)}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{l.provincie ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-300">{l.trust_score ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.is_banned && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-red-800/50 text-red-400 bg-red-950/40">
                          <Ban className="w-3 h-3" /> Geband
                        </span>
                      )}
                      {!l.is_banned && l.verification_status === 'approved' && (
                        <span className="text-xs px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 bg-emerald-950/40">
                          Geverifieerd
                        </span>
                      )}
                      {!l.is_banned && l.verification_status === 'pending' && (
                        <span className="text-xs px-2 py-0.5 rounded border border-amber-800/50 text-amber-300 bg-amber-950/40">
                          Pending
                        </span>
                      )}
                      {!l.is_banned && l.verification_status === 'none' && (
                        <span className="text-xs text-gray-500">Ongeverifieerd</span>
                      )}
                      {l.dashboard_role && (
                        <span className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400">Team</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDatum(l.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
