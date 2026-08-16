import { stopRolVoorbeeld } from '@/app/actions/rollen'
import { EyeOff } from 'lucide-react'

export function RolVoorbeeldBanner({ rolNaam }: { rolNaam: string }) {
  return (
    <div className="bg-amber-500 text-gray-950 px-4 py-2.5 flex items-center justify-between gap-4">
      <p className="text-sm font-medium">
        Je bekijkt het dashboard als <span className="font-semibold">{rolNaam}</span>. Permissies zijn die van deze rol.
      </p>
      <form action={stopRolVoorbeeld}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg bg-gray-950 text-amber-300 text-sm font-medium hover:bg-gray-800"
        >
          <EyeOff className="w-4 h-4" />
          Stop voorbeeld
        </button>
      </form>
    </div>
  )
}
