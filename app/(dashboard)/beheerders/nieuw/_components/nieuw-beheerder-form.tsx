'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteBeheerder } from '@/app/actions/beheerders'

type Rol = 'admin' | 'national' | 'provincial'

const ROL_LABELS: Record<Rol, { label: string; omschrijving: string }> = {
  admin: {
    label: 'Admin',
    omschrijving: 'Volledige toegang tot alles',
  },
  national: {
    label: 'Nationaal',
    omschrijving: 'Toegang tot nationale overzichten en rapportages',
  },
  provincial: {
    label: 'Provinciaal',
    omschrijving: 'Vertegenwoordiger — provincie wordt apart ingesteld',
  },
}

export function NieuwBeheerderForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [rol, setRol] = useState<Rol>('provincial')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      await inviteBeheerder(email, naam, rol)
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Naam</label>
          <input
            required
            value={naam}
            onChange={e => setNaam(e.target.value)}
            placeholder="Jan de Vries"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">E-mailadres</label>
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jan@opstap.nl"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Rol</label>
        <select
          value={rol}
          onChange={e => setRol(e.target.value as Rol)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition-colors"
        >
          {(Object.keys(ROL_LABELS) as Rol[]).map(r => (
            <option key={r} value={r}>
              {ROL_LABELS[r].label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1.5">{ROL_LABELS[rol].omschrijving}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={bezig}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {bezig ? 'Uitnodiging versturen...' : 'Uitnodiging versturen'}
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
