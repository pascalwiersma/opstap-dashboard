'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bug, CheckCircle, Clock, Smartphone, XCircle } from 'lucide-react'
import type { BugCategory, BugReport, BugStatus } from '@/app/actions/bugs'
import { updateBugStatus } from '@/app/actions/bugs'

const STATUS_CONFIG: Record<BugStatus, { label: string; kleur: string; icon: React.ElementType }> = {
  nieuw: { label: 'Nieuw', kleur: 'bg-orange-500/15 text-orange-400 border border-orange-500/30', icon: AlertTriangle },
  in_behandeling: { label: 'In behandeling', kleur: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', icon: Clock },
  afgehandeld: { label: 'Afgehandeld', kleur: 'bg-gray-700/50 text-gray-400 border border-gray-600/30', icon: CheckCircle },
  ingetrokken: { label: 'Ingetrokken', kleur: 'bg-gray-800/60 text-gray-500 border border-gray-700/50', icon: XCircle },
}

const CATEGORIE_LABEL: Record<BugCategory, string> = {
  crash: 'Crash / vastlopen',
  onjuiste_data: 'Verkeerde informatie',
  traag: 'Traag / hapert',
  anders: 'Anders',
}

const FILTER_OPTIES: { label: string; waarde: BugStatus | 'alle' }[] = [
  { label: 'Alle', waarde: 'alle' },
  { label: 'Nieuw', waarde: 'nieuw' },
  { label: 'In behandeling', waarde: 'in_behandeling' },
  { label: 'Afgehandeld', waarde: 'afgehandeld' },
]

function StatusBadge({ status }: { status: BugStatus }) {
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

export function BugsLijst({ bugs }: { bugs: BugReport[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<BugStatus | 'alle'>('alle')
  const [bezig, setBezig] = useState<string | null>(null)

  const gefilterd = filter === 'alle' ? bugs : bugs.filter(b => b.status === filter)
  const aantalNieuw = bugs.filter(b => b.status === 'nieuw').length

  async function handleStatus(bug: BugReport, status: BugStatus) {
    setBezig(`${status}-${bug.id}`)
    await updateBugStatus(bug.id, status)
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
          <Bug className="w-10 h-10 opacity-30" />
          <p className="text-sm">Geen bug reports gevonden</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {gefilterd.map(bug => {
            const isGesloten = bug.status === 'afgehandeld' || bug.status === 'ingetrokken'
            const device = [bug.device_name, bug.platform, bug.os_version].filter(Boolean).join(' · ')
            const versie = bug.app_version ? `v${bug.app_version}${bug.build_number ? ` (${bug.build_number})` : ''}` : null
            return (
              <div
                key={bug.id}
                className={`rounded-xl border p-4 ${
                  bug.status === 'nieuw'
                    ? 'bg-orange-950/20 border-orange-900/40'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-800 text-gray-300">
                      {CATEGORIE_LABEL[bug.category]}
                    </span>
                    <StatusBadge status={bug.status} />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatDatum(bug.created_at)}</span>
                </div>

                <p className="text-sm text-gray-200 mb-3 whitespace-pre-wrap">{bug.description}</p>

                {bug.screenshot_url && (
                  <a
                    href={bug.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-3 w-40 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bug.screenshot_url} alt="Screenshot bij bugmelding" className="w-full h-auto" />
                  </a>
                )}

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {bug.melder.name ?? '–'}
                      {bug.melder.username && <span className="text-gray-600"> @{bug.melder.username}</span>}
                    </span>
                    {bug.screen && <span className="text-gray-600">{bug.screen}</span>}
                    {(device || versie) && (
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        {[versie, device].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>

                  {!isGesloten && (
                    <div className="flex items-center gap-1.5">
                      {bug.status === 'nieuw' && (
                        <button
                          onClick={() => handleStatus(bug, 'in_behandeling')}
                          disabled={!!bezig || isPending}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {bezig === `in_behandeling-${bug.id}` ? '…' : 'Oppakken'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStatus(bug, 'afgehandeld')}
                        disabled={!!bezig || isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600/30 text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {bezig === `afgehandeld-${bug.id}` ? '…' : 'Afhandelen'}
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
