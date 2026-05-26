'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Beheerder } from '@/app/actions/beheerders'
import type { Province } from '@/app/actions/provinces'
import { updateBeheerder } from '@/app/actions/beheerders'
import { ChevronDown } from 'lucide-react'

export function BewerkBeheerderForm({
  beheerder,
  provinces,
}: {
  beheerder: Beheerder
  provinces: Province[]
}) {
  const router = useRouter()
  const isAdmin = beheerder.dashboard_role === 'admin'
  const [admin, setAdmin] = useState(isAdmin)
  const [provinceId, setProvinceId] = useState(beheerder.province_id ?? '')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      const role = admin ? 'admin' : 'provincial'
      await updateBeheerder(beheerder.id, role, !admin ? (provinceId || null) : null)
      router.push('/beheerders')
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Er ging iets mis.')
      setBezig(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fout && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
          {fout}
        </div>
      )}

      {/* Read-only user info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Naam</label>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-400">
            {beheerder.name ?? '—'}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">E-mailadres</label>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-400">
            {beheerder.email ?? '—'}
          </div>
        </div>
      </div>

      {/* Admin toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <div
            onClick={() => setAdmin(v => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${admin ? 'bg-violet-600' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${admin ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <div>
            <span className="text-sm text-white font-medium">Admin</span>
            <p className="text-xs text-gray-500">
              {admin ? 'Volledige toegang tot alles' : 'Vertegenwoordiger — provincie bepaalt toegang'}
            </p>
          </div>
        </label>
      </div>

      {/* Province — alleen voor niet-admins */}
      {!admin && (
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Provincie</label>
          <div className="relative max-w-xs">
            <select
              value={provinceId}
              onChange={e => setProvinceId(e.target.value)}
              className="w-full appearance-none bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition-colors"
            >
              <option value="">Geen provincie toegewezen</option>
              {provinces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={bezig}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {bezig ? 'Opslaan...' : 'Opslaan'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}
