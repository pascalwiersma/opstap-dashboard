'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Gebruiker } from '@/app/actions/gebruikers'
import { removeGebruiker } from '@/app/actions/gebruikers'
import { rolKleur } from '@/lib/dashboard-rollen'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GebruikersLijst({
  initialGebruikers,
  kanBewerken,
  kanVerwijderen,
}: {
  initialGebruikers: Gebruiker[]
  kanBewerken: boolean
  kanVerwijderen: boolean
}) {
  const [gebruikers, setGebruikers] = useState(initialGebruikers)
  const [bezig, setBezig] = useState(false)
  const router = useRouter()

  async function handleVerwijder(id: string) {
    if (!confirm('Toegang intrekken voor deze gebruiker?')) return
    setBezig(true)
    try {
      await removeGebruiker(id)
      setGebruikers(prev => prev.filter(g => g.id !== id))
      router.refresh()
    } finally {
      setBezig(false)
    }
  }

  if (gebruikers.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
        Nog geen gebruikers — voeg iemand toe.
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
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">2FA</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {gebruikers.map(g => (
            <tr key={g.id} className="hover:bg-gray-800/40 transition-colors">
              <td className="px-5 py-3.5">
                <div className="text-white font-medium">{g.name ?? '—'}</div>
                <div className="text-gray-500 text-xs">{g.phone}</div>
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${rolKleur(g.dashboard_role)}`}>
                  {g.dashboard_role_name}
                </span>
              </td>
              <td className="px-5 py-3.5 text-sm">
                {g.totp_ingeschakeld ? (
                  <span className="text-emerald-400">Aan</span>
                ) : (
                  <span className="text-gray-600">Uit</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1.5">
                  {kanBewerken && (
                  <Link
                    href={`/gebruikers/${g.id}`}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Bewerken"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  )}
                  {kanVerwijderen && (
                  <button
                    onClick={() => handleVerwijder(g.id)}
                    disabled={bezig}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Toegang intrekken"
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
  )
}
