import type { Kpi } from '@/app/actions/marketing'

export function KpiCard({ label, description, value, target }: Kpi) {
  const achieved = value >= target
  const bijnaOpDoel = !achieved && value >= target * 0.75
  const barKleur = achieved ? 'bg-emerald-500' : bijnaOpDoel ? 'bg-yellow-500' : 'bg-red-500'
  const barBreedte = Math.min(100, Math.max(2, value))
  const doelPositie = Math.min(100, target)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${achieved ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
          {achieved ? 'Op doel' : 'Onder doel'}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>

      <div className="flex items-end justify-between mb-2">
        <span className="text-3xl font-bold text-white">{value}%</span>
        <span className="text-xs text-gray-500">doel ≥{target}%</span>
      </div>

      <div className="relative h-2.5 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${barKleur} transition-all`} style={{ width: `${barBreedte}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: `${doelPositie}%` }} />
      </div>
    </div>
  )
}
