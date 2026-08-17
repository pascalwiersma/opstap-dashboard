'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Clock, Scale, XCircle } from 'lucide-react'
import type { BanAppeal, BezwaarStatus } from '@/app/actions/ban-appeals'
import { kenBezwaarToe, wijsBezwaarAf, zetBezwaarInBehandeling } from '@/app/actions/ban-appeals'

const STATUS_CONFIG: Record<BezwaarStatus, { label: string; kleur: string; icon: React.ElementType }> = {
  nieuw: { label: 'Nieuw', kleur: 'bg-orange-500/15 text-orange-400 border border-orange-500/30', icon: AlertTriangle },
  in_behandeling: { label: 'In behandeling', kleur: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', icon: Clock },
  toegekend: { label: 'Toegekend', kleur: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', icon: CheckCircle },
  afgewezen: { label: 'Afgewezen', kleur: 'bg-red-500/15 text-red-400 border border-red-500/30', icon: XCircle },
}

const FILTER_OPTIES: { label: string; waarde: BezwaarStatus | 'alle' }[] = [
  { label: 'Alle', waarde: 'alle' },
  { label: 'Nieuw', waarde: 'nieuw' },
  { label: 'In behandeling', waarde: 'in_behandeling' },
  { label: 'Toegekend', waarde: 'toegekend' },
  { label: 'Afgewezen', waarde: 'afgewezen' },
]

function StatusBadge({ status }: { status: BezwaarStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.kleur}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })
}

export function BezwarenLijst({ bezwaren }: { bezwaren: BanAppeal[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<BezwaarStatus | 'alle'>('nieuw')
  const [bezig, setBezig] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})

  const gefilterd = filter === 'alle' ? bezwaren : bezwaren.filter(b => b.status === filter)
  const aantalNieuw = bezwaren.filter(b => b.status === 'nieuw').length

  async function run(key: string, actie: () => Promise<void>) {
    setBezig(key)
    try {
      await actie()
      startTransition(() => router.refresh())
    } finally {
      setBezig(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIES.map(opt => (
          <button
            key={opt.waarde}
            type="button"
            onClick={() => setFilter(opt.waarde)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.waarde
                ? 'bg-opstap-orange-600 text-white'
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

      {gefilterd.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Scale className="w-10 h-10 opacity-30" />
          <p className="text-sm">Geen bezwaren gevonden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gefilterd.map(item => {
            const open = item.status === 'nieuw' || item.status === 'in_behandeling'
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.status === 'nieuw'
                    ? 'border-orange-800/40 bg-orange-950/20'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div>
                    <Link href={`/leden/${item.user.id}`} className="text-sm font-medium text-white hover:text-opstap-orange-300">
                      {item.user.name ?? 'Onbekend'}
                      {item.user.username ? ` · @${item.user.username}` : ''}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDatum(item.created_at)}
                      {item.user.phone ? ` · ${item.user.phone}` : ''}
                      {item.user.is_banned ? ' · nog geband' : ' · ban opgeheven'}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <p className="mt-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{item.message}</p>
                {item.admin_note && (
                  <p className="mt-2 text-xs text-gray-400">Notitie: {item.admin_note}</p>
                )}

                {open && (
                  <div className="mt-4 space-y-2">
                    <input
                      value={note[item.id] ?? ''}
                      onChange={e => setNote(v => ({ ...v, [item.id]: e.target.value }))}
                      placeholder="Interne notitie (optioneel)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'nieuw' && (
                        <button
                          type="button"
                          disabled={!!bezig || isPending}
                          onClick={() => void run(`behandeling-${item.id}`, () => zetBezwaarInBehandeling(item.id))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-600/30 disabled:opacity-40"
                        >
                          {bezig === `behandeling-${item.id}` ? '…' : 'In behandeling'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!bezig || isPending}
                        onClick={() => {
                          if (!confirm(`Ban van ${item.user.name ?? 'deze gebruiker'} opheffen en bezwaar toekennen?`)) return
                          void run(`toegekend-${item.id}`, () => kenBezwaarToe(item.id, note[item.id]))
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 disabled:opacity-40"
                      >
                        {bezig === `toegekend-${item.id}` ? '…' : 'Toekennen (unban)'}
                      </button>
                      <button
                        type="button"
                        disabled={!!bezig || isPending}
                        onClick={() => void run(`afgewezen-${item.id}`, () => wijsBezwaarAf(item.id, note[item.id]))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-300 border border-red-600/30 disabled:opacity-40"
                      >
                        {bezig === `afgewezen-${item.id}` ? '…' : 'Afwijzen'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
