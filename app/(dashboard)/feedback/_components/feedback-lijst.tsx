'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Clock, MessageSquare, Smartphone, XCircle } from 'lucide-react'
import type { FeedbackCategory, Feedback, FeedbackStatus } from '@/app/actions/feedback'
import { updateFeedbackStatus } from '@/app/actions/feedback'

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; kleur: string; icon: React.ElementType }> = {
  nieuw: { label: 'Nieuw', kleur: 'bg-orange-500/15 text-orange-400 border border-orange-500/30', icon: AlertTriangle },
  in_behandeling: { label: 'In behandeling', kleur: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', icon: Clock },
  afgehandeld: { label: 'Afgehandeld', kleur: 'bg-gray-700/50 text-gray-400 border border-gray-600/30', icon: CheckCircle },
  ingetrokken: { label: 'Ingetrokken', kleur: 'bg-gray-800/60 text-gray-500 border border-gray-700/50', icon: XCircle },
}

const CATEGORIE_LABEL: Record<FeedbackCategory, string> = {
  idee: 'Nieuw idee',
  verbetering: 'Verbetervoorstel',
  compliment: 'Compliment',
  anders: 'Anders',
}

const FILTER_OPTIES: { label: string; waarde: FeedbackStatus | 'alle' }[] = [
  { label: 'Alle', waarde: 'alle' },
  { label: 'Nieuw', waarde: 'nieuw' },
  { label: 'In behandeling', waarde: 'in_behandeling' },
  { label: 'Afgehandeld', waarde: 'afgehandeld' },
]

function StatusBadge({ status }: { status: FeedbackStatus }) {
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

export function FeedbackLijst({ feedback }: { feedback: Feedback[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<FeedbackStatus | 'alle'>('alle')
  const [bezig, setBezig] = useState<string | null>(null)

  const gefilterd = filter === 'alle' ? feedback : feedback.filter(f => f.status === filter)
  const aantalNieuw = feedback.filter(f => f.status === 'nieuw').length

  async function handleStatus(item: Feedback, status: FeedbackStatus) {
    setBezig(`${status}-${item.id}`)
    await updateFeedbackStatus(item.id, status)
    setBezig(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {FILTER_OPTIES.map(opt => (
          <button
            key={opt.waarde}
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
          <MessageSquare className="w-10 h-10 opacity-30" />
          <p className="text-sm">Geen feedback gevonden</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {gefilterd.map(item => {
            const isGesloten = item.status === 'afgehandeld' || item.status === 'ingetrokken'
            const device = [item.device_name, item.platform, item.os_version].filter(Boolean).join(' · ')
            const versie = item.app_version ? `v${item.app_version}${item.build_number ? ` (${item.build_number})` : ''}` : null
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.status === 'nieuw'
                    ? 'bg-orange-950/20 border-orange-900/40'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-800 text-gray-300">
                      {CATEGORIE_LABEL[item.category]}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatDatum(item.created_at)}</span>
                </div>

                <p className="text-sm text-gray-200 mb-3 whitespace-pre-wrap">{item.message}</p>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {item.melder.name ?? '–'}
                      {item.melder.username && <span className="text-gray-600"> @{item.melder.username}</span>}
                    </span>
                    {item.screen && <span className="text-gray-600">{item.screen}</span>}
                    {(device || versie) && (
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        {[versie, device].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>

                  {!isGesloten && (
                    <div className="flex items-center gap-1.5">
                      {item.status === 'nieuw' && (
                        <button
                          onClick={() => handleStatus(item, 'in_behandeling')}
                          disabled={!!bezig || isPending}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {bezig === `in_behandeling-${item.id}` ? '…' : 'Oppakken'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStatus(item, 'afgehandeld')}
                        disabled={!!bezig || isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {bezig === `afgehandeld-${item.id}` ? '…' : 'Afhandelen'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
