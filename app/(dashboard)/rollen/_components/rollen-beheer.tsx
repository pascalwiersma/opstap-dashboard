'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DashboardRol } from '@/app/actions/rollen'
import { createRol, deleteRol, updateRol } from '@/app/actions/rollen'
import {
  ACTION_LABEL,
  ACTIONS,
  RESOURCE_LABEL,
  RESOURCES,
  type Action,
  type PermissieSleutel,
  type Resource,
} from '@/lib/permissions'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

const invoerKlasse = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors'

function sleutel(resource: Resource, action: Action): PermissieSleutel {
  return `${resource}:${action}`
}

export function RollenBeheer({
  initialRollen,
  kanToevoegen,
  kanBewerken,
  kanVerwijderen,
}: {
  initialRollen: DashboardRol[]
  kanToevoegen: boolean
  kanBewerken: boolean
  kanVerwijderen: boolean
}) {
  const router = useRouter()
  const [rollen, setRollen] = useState(initialRollen)
  const [gekozenId, setGekozenId] = useState(initialRollen[0]?.id ?? '')
  const [naam, setNaam] = useState(initialRollen[0]?.name ?? '')
  const [nieuweNaam, setNieuweNaam] = useState('')
  const [perms, setPerms] = useState<Set<PermissieSleutel>>(new Set(initialRollen[0]?.permissions ?? []))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const gekozen = useMemo(() => rollen.find(r => r.id === gekozenId) ?? null, [rollen, gekozenId])

  function kies(rol: DashboardRol) {
    setGekozenId(rol.id)
    setNaam(rol.name)
    setPerms(new Set(rol.permissions))
    setFout('')
  }

  const adminVast = gekozen?.slug === 'admin'

  function toggle(resource: Resource, action: Action) {
    if (!kanBewerken || adminVast) return
    const k = sleutel(resource, action)
    setPerms(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      if (action !== 'zien' && next.has(k)) next.add(sleutel(resource, 'zien'))
      return next
    })
  }

  async function handleNieuw(e: React.FormEvent) {
    e.preventDefault()
    if (!kanToevoegen) return
    setBezig(true)
    setFout('')
    try {
      const titel = nieuweNaam.trim()
      const { id, slug } = await createRol(titel)
      setNieuweNaam('')
      const volgende: DashboardRol = {
        id,
        slug,
        name: titel,
        is_system: false,
        gebruiker_count: 0,
        permissions: [],
      }
      setRollen(prev => [...prev, volgende].sort((a, b) => a.name.localeCompare(b.name, 'nl')))
      kies(volgende)
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Aanmaken mislukt.')
    } finally {
      setBezig(false)
    }
  }

  async function handleOpslaan() {
    if (!gekozen || !kanBewerken) return
    setBezig(true)
    setFout('')
    try {
      await updateRol({
        id: gekozen.id,
        name: naam,
        permissions: [...perms],
      })
      setRollen(prev => prev.map(r => r.id === gekozen.id
        ? { ...r, name: naam.trim(), permissions: adminVast ? r.permissions : [...perms] }
        : r))
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBezig(false)
    }
  }

  async function handleVerwijder() {
    if (!gekozen || !kanVerwijderen) return
    if (!confirm(`Rol "${gekozen.name}" verwijderen?`)) return
    setBezig(true)
    setFout('')
    try {
      await deleteRol(gekozen.id)
      const rest = rollen.filter(r => r.id !== gekozen.id)
      setRollen(rest)
      if (rest[0]) kies(rest[0])
      else {
        setGekozenId('')
        setNaam('')
        setPerms(new Set())
      }
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Verwijderen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
      <div className="space-y-3">
        {kanToevoegen && (
          <form onSubmit={handleNieuw} className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
            <input
              value={nieuweNaam}
              onChange={e => setNieuweNaam(e.target.value)}
              placeholder="Nieuwe rol"
              className={invoerKlasse}
            />
            <button
              type="submit"
              disabled={bezig || !nieuweNaam.trim()}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Aanmaken
            </button>
          </form>
        )}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {rollen.map(rol => (
            <button
              key={rol.id}
              type="button"
              onClick={() => kies(rol)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-800 last:border-0 transition-colors ${
                rol.id === gekozenId ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <div className="font-medium">{rol.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {rol.gebruiker_count} gebruiker{rol.gebruiker_count !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {fout && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>
        )}
        {!gekozen ? (
          <p className="text-sm text-gray-500">Kies of maak een rol.</p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam</label>
              <input
                value={naam}
                onChange={e => setNaam(e.target.value)}
                disabled={!kanBewerken}
                className={invoerKlasse}
              />
            </div>
            {adminVast && (
              <p className="text-xs text-gray-500">
                Admin heeft altijd alle permissies. Die kun je niet afschalen.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Onderdeel</th>
                    {ACTIONS.map(action => (
                      <th key={action} className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                        {ACTION_LABEL[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {RESOURCES.map(resource => (
                    <tr key={resource}>
                      <td className="py-2.5 pr-4 text-white">{RESOURCE_LABEL[resource]}</td>
                      {ACTIONS.map(action => {
                        const aan = perms.has(sleutel(resource, action))
                        return (
                          <td key={action} className="py-2.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={aan}
                              disabled={!kanBewerken || adminVast}
                              onChange={() => toggle(resource, action)}
                              className="rounded border-gray-600 bg-gray-800 text-opstap-orange-600 focus:ring-opstap-orange-500"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2">
              {kanVerwijderen && !gekozen.is_system && (
                <button
                  type="button"
                  onClick={handleVerwijder}
                  disabled={bezig}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/10 rounded-xl disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen
                </button>
              )}
              {kanBewerken && (
                <button
                  type="button"
                  onClick={handleOpslaan}
                  disabled={bezig}
                  className="flex items-center gap-2 px-5 py-2.5 bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Opslaan
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
