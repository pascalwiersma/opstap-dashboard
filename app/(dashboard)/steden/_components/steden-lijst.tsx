'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Plus, X, Save, Loader2 } from 'lucide-react'
import type { Stad, StadInput } from '@/app/actions/steden'
import { createStad, updateStad, deleteStad } from '@/app/actions/steden'

const PROVINCIES = [
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
  'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
  'Utrecht', 'Zeeland', 'Zuid-Holland',
]

type FormState = {
  naam: string
  provincie: string
  lat: string
  lng: string
  radius_km: string
}

const LEEG: FormState = { naam: '', provincie: PROVINCIES[4], lat: '', lng: '', radius_km: '15' }

function parseInput(f: FormState): StadInput {
  return {
    naam: f.naam.trim(),
    provincie: f.provincie,
    lat: parseFloat(f.lat),
    lng: parseFloat(f.lng),
    radius_km: parseFloat(f.radius_km),
    actief: true,
  }
}

export function StedenLijst({ initialSteden }: { initialSteden: Stad[] }) {
  const [steden, setSteden] = useState(initialSteden)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(LEEG)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const router = useRouter()

  function openNieuw() {
    setEditId(null)
    setForm(LEEG)
    setFout(null)
    setModalOpen(true)
  }

  function openBewerk(stad: Stad) {
    setEditId(stad.id)
    setForm({
      naam: stad.naam,
      provincie: stad.provincie,
      lat: String(stad.lat),
      lng: String(stad.lng),
      radius_km: String(stad.radius_km),
    })
    setFout(null)
    setModalOpen(true)
  }

  function sluit() {
    setModalOpen(false)
    setEditId(null)
    setFout(null)
  }

  function updateForm(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleOpslaan() {
    if (!form.naam.trim()) { setFout('Naam is verplicht.'); return }
    if (!form.lat || isNaN(parseFloat(form.lat))) { setFout('Ongeldige breedtegraad.'); return }
    if (!form.lng || isNaN(parseFloat(form.lng))) { setFout('Ongeldige lengtegraad.'); return }
    setBezig(true); setFout(null)
    try {
      const input = parseInput(form)
      if (editId) {
        await updateStad(editId, input)
        setSteden(prev => prev.map(s => s.id === editId ? { ...s, ...input } : s))
      } else {
        const nieuw = await createStad(input)
        setSteden(prev => [...prev, nieuw].sort((a, b) => a.naam.localeCompare(b.naam)))
      }
      sluit()
      router.refresh()
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  async function handleToggleActief(stad: Stad) {
    try {
      await updateStad(stad.id, { actief: !stad.actief })
      setSteden(prev => prev.map(s => s.id === stad.id ? { ...s, actief: !s.actief } : s))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kon status niet wijzigen.')
    }
  }

  async function handleVerwijder(stad: Stad) {
    if (!confirm(`Stad "${stad.naam}" verwijderen?`)) return
    try {
      await deleteStad(stad.id)
      setSteden(prev => prev.filter(s => s.id !== stad.id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt.')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">
          {steden.length} stad{steden.length !== 1 ? 'en' : ''}
        </p>
        <button
          onClick={openNieuw}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Stad toevoegen
        </button>
      </div>

      {steden.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
          Nog geen steden — voeg er een toe.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Naam</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Provincie</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lat</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Radius (km)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actief</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {steden.map(stad => (
                <tr key={stad.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-white font-medium">{stad.naam}</td>
                  <td className="px-5 py-3.5 text-gray-300">{stad.provincie}</td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums">{Number(stad.lat).toFixed(4)}</td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums">{Number(stad.lng).toFixed(4)}</td>
                  <td className="px-5 py-3.5 text-gray-300 tabular-nums">{stad.radius_km}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleActief(stad)}
                      className={`relative w-10 h-5 rounded-full transition-colors`}
                      style={{ backgroundColor: stad.actief ? '#7c3aed' : '#374151' }}
                      title={stad.actief ? 'Zet inactief' : 'Zet actief'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${stad.actief ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openBewerk(stad)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVerwijder(stad)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Verwijderen"
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
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">
                {editId ? 'Stad bewerken' : 'Stad toevoegen'}
              </h2>
              <button onClick={sluit} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam *</label>
                <input
                  value={form.naam}
                  onChange={e => updateForm('naam', e.target.value)}
                  placeholder="Groningen"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Provincie *</label>
                <select
                  value={form.provincie}
                  onChange={e => updateForm('provincie', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {PROVINCIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Breedtegraad (lat) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={e => updateForm('lat', e.target.value)}
                    placeholder="53.2194"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Lengtegraad (lng) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={e => updateForm('lng', e.target.value)}
                    placeholder="6.5665"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Radius (km)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={form.radius_km}
                  onChange={e => updateForm('radius_km', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {fout && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{fout}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end">
              <button
                onClick={sluit}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpslaan}
                disabled={bezig}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
