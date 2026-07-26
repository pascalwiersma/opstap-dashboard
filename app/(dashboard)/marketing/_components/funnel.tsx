import type { FunnelStep } from '@/app/actions/marketing'

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const maxActors = Math.max(1, ...steps.map(s => s.actors))

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <p className="text-sm font-semibold text-white mb-0.5">Funnel</p>
      <p className="text-xs text-gray-500 mb-6">Install tot tweede check-in · all-time, unieke gebruikers/sessies</p>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.event}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm text-gray-300 font-medium">{step.label}</span>
              <div className="flex items-baseline gap-3">
                <span className="text-white font-bold text-sm">{step.actors.toLocaleString('nl-NL')}</span>
                {i > 0 && (
                  <span className="text-xs text-gray-500">
                    {step.conversionFromPrevious}% t.o.v. vorige stap
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-opstap-orange-600"
                style={{ width: `${Math.max(2, (step.actors / maxActors) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
