'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Beheerder } from '@/app/actions/beheerders'
import { removeBeheerder } from '@/app/actions/beheerders'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const ROL_LABEL: Record<string, string> = { admin: 'Admin', national: 'Vertegenwoordiger', provincial: 'Vertegenwoordiger' }
const ROL_KLEUR: Record<string, string> = {
  admin: 'bg-violet-600/20 text-violet-300 border-violet-600/30',
  national: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  provincial: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
}

export function BeheerdersList({ initialBeheerders }: { initialBeheerders: Beheerder[] }) {
  const [beheerders, setBeheerders] = useState(initialBeheerders)
  const [bezig, setBezig] = useState(false)
  const router = useRouter()

  async function handleVerwijder(id: string) {
    if (!confirm('Toegang intrekken voor deze beheerder?')) return
    setBezig(true)
    try {
      await removeBeheerder(id)
      setBeheerders(prev => prev.filter(b => b.id !== id))
      router.refresh()
    } finally {
      setBezig(false)
    }
  }

  if (beheerders.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
        Nog geen beheerders — nodig iemand uit.
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Naam</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Provincie</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {beheerders.map(b => (
            <tr key={b.id} className="hover:bg-gray-800/40 transition-colors">
              <td className="px-5 py-3.5">
                <div className="text-white font-medium">{b.name ?? '—'}</div>
                <div className="text-gray-500 text-xs">{b.email}</div>
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${ROL_KLEUR[b.dashboard_role]}`}>
                  {ROL_LABEL[b.dashboard_role]}
                </span>
              </td>
              <td className="px-5 py-3.5 text-gray-300 text-sm">
                {b.province_name ?? <span className="text-gray-600">—</span>}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/beheerders/${b.id}`}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Bewerken"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleVerwijder(b.id)}
                    disabled={bezig}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Toegang intrekken"
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
  )
}
