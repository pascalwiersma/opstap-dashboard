'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteBeheerder } from '@/app/actions/beheerders'

export function NieuwBeheerderForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout('')
    try {
      await inviteBeheerder(email, naam, isAdmin ? 'admin' : 'provincial')
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
        <label className="flex items-center gap-3 cursor-pointer group w-fit">
          <div
            onClick={() => setIsAdmin(v => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${isAdmin ? 'bg-violet-600' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <div>
            <span className="text-sm text-white font-medium">Admin</span>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Volledige toegang tot alles' : 'Vertegenwoordiger — provincie wordt apart ingesteld'}
            </p>
          </div>
        </label>
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
