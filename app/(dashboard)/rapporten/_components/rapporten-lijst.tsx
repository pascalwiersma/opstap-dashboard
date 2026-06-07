'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Ban, CheckCircle, Clock, Flag, Shield } from 'lucide-react'
import type { Rapport, RapportStatus } from '@/app/actions/reports'
import { waarschuwGebruiker, banGebruiker, sluitRapport } from '@/app/actions/reports'

const STATUS_CONFIG: Record<RapportStatus, { label: string; kleur: string; icon: React.ElementType }> = {
  nieuw: { label: 'Nieuw', kleur: 'bg-orange-500/15 text-orange-400 border border-orange-500/30', icon: AlertTriangle },
  in_behandeling: { label: 'In behandeling', kleur: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', icon: Clock },
  afgehandeld: { label: 'Afgehandeld', kleur: 'bg-gray-700/50 text-gray-400 border border-gray-600/30', icon: CheckCircle },
}

const FILTER_OPTIES: { label: string; waarde: RapportStatus | 'alle' }[] = [
  { label: 'Alle', waarde: 'alle' },
  { label: 'Nieuw', waarde: 'nieuw' },
  { label: 'In behandeling', waarde: 'in_behandeling' },
  { label: 'Afgehandeld', waarde: 'afgehandeld' },
]

function StatusBadge({ status }: { status: RapportStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.kleur}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function GebruikerCell({ naam, username }: { naam: string | null; username: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-white">{naam ?? '–'}</p>
      {username && <p className="text-xs text-gray-500">@{username}</p>}
    </div>
  )
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })
}

export function RapportenLijst({ rapporten }: { rapporten: Rapport[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<RapportStatus | 'alle'>('alle')
  const [bezig, setBezig] = useState<string | null>(null)

  const gefilterd = filter === 'alle'
    ? rapporten
    : rapporten.filter(r => r.status === filter)

  async function handleWaarschuw(rapport: Rapport) {
    setBezig(`waarschuw-${rapport.id}`)
    await waarschuwGebruiker(rapport.id, rapport.reported.id, rapport.reported.push_token)
    setBezig(null)
    startTransition(() => router.refresh())
  }

  async function handleBan(rapport: Rapport) {
    if (!confirm(`Weet je zeker dat je ${rapport.reported.name ?? 'deze gebruiker'} wilt bannen?`)) return
    setBezig(`ban-${rapport.id}`)
    await banGebruiker(rapport.id, rapport.reported.id)
    setBezig(null)
    startTransition(() => router.refresh())
  }

  async function handleSluit(rapport: Rapport) {
    setBezig(`sluit-${rapport.id}`)
    await sluitRapport(rapport.id)
    setBezig(null)
    startTransition(() => router.refresh())
  }

  const aantalNieuw = rapporten.filter(r => r.status === 'nieuw').length

  return (
    <div className="flex flex-col gap-6">
      {/* Filter balk */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIES.map(opt => (
          <button
            key={opt.waarde}
            onClick={() => setFilter(opt.waarde)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.waarde
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {opt.label}
            {opt.waarde === 'nieuw' && aantalNieuw > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {aantalNieuw}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabel */}
      {gefilterd.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Flag className="w-10 h-10 opacity-30" />
          <p className="text-sm">Geen rapporten gevonden</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Melder</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gemelde</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reden</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-52">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {gefilterd.map(rapport => {
                const isNieuw = rapport.status === 'nieuw'
                const isAfgehandeld = rapport.status === 'afgehandeld'
                return (
                  <tr
                    key={rapport.id}
                    className={`transition-colors ${
                      isNieuw
                        ? 'bg-orange-950/20 hover:bg-orange-950/30'
                        : 'bg-gray-900 hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDatum(rapport.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <GebruikerCell naam={rapport.reporter.name} username={rapport.reporter.username} />
                    </td>
                    <td className="px-4 py-3">
                      <GebruikerCell naam={rapport.reported.name} username={rapport.reported.username} />
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs">
                      <p className="truncate">{rapport.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rapport.status} />
                    </td>
                    <td className="px-4 py-3">
                      {!isAfgehandeld && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleWaarschuw(rapport)}
                            disabled={!!bezig || isPending}
                            title="Waarschuwen"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {bezig === `waarschuw-${rapport.id}` ? '…' : 'Waarschuwen'}
                          </button>
                          <button
                            onClick={() => handleBan(rapport)}
                            disabled={!!bezig || isPending}
                            title="Bannen"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {bezig === `ban-${rapport.id}` ? '…' : 'Bannen'}
                          </button>
                          <button
                            onClick={() => handleSluit(rapport)}
                            disabled={!!bezig || isPending}
                            title="Sluiten"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {bezig === `sluit-${rapport.id}` ? '…' : 'Sluiten'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
