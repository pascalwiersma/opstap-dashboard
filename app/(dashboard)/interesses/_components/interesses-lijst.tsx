'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Plus, X, Save, Loader2 } from 'lucide-react'
import type { InterestCategorie, InterestCategorieInput, InterestTag, InterestTagInput } from '@/app/actions/interests'
import {
  createInterestCategorie, updateInterestCategorie, deleteInterestCategorie,
  createInterestTag, updateInterestTag, deleteInterestTag,
} from '@/app/actions/interests'

type CategorieForm = { name: string; sort_order: string }
type TagForm = { category_id: string; label: string; emoji: string; sort_order: string; active: boolean }

const LEGE_CATEGORIE: CategorieForm = { name: '', sort_order: '1' }

function legeTag(category_id: string): TagForm {
  return { category_id, label: '', emoji: '✨', sort_order: '1', active: true }
}

export function InteressesLijst({
  initialCategorieen,
  initialTags,
}: {
  initialCategorieen: InterestCategorie[]
  initialTags: InterestTag[]
}) {
  const [categorieen, setCategorieen] = useState(initialCategorieen)
  const [tags, setTags] = useState(initialTags)
  const router = useRouter()

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catEditId, setCatEditId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<CategorieForm>(LEGE_CATEGORIE)

  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagEditId, setTagEditId] = useState<string | null>(null)
  const [tagForm, setTagForm] = useState<TagForm>(legeTag(''))

  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  function openNieuweCategorie() {
    setCatEditId(null)
    setCatForm({ name: '', sort_order: String(categorieen.length + 1) })
    setFout(null)
    setCatModalOpen(true)
  }

  function openBewerkCategorie(cat: InterestCategorie) {
    setCatEditId(cat.id)
    setCatForm({ name: cat.name, sort_order: String(cat.sort_order) })
    setFout(null)
    setCatModalOpen(true)
  }

  function sluitCategorieModal() {
    setCatModalOpen(false)
    setCatEditId(null)
    setFout(null)
  }

  async function handleOpslaanCategorie() {
    if (!catForm.name.trim()) { setFout('Naam is verplicht.'); return }
    setBezig(true); setFout(null)
    try {
      const input: InterestCategorieInput = {
        name: catForm.name.trim(),
        sort_order: parseInt(catForm.sort_order, 10) || 0,
      }
      if (catEditId) {
        await updateInterestCategorie(catEditId, input)
        setCategorieen(prev => prev.map(c => c.id === catEditId ? { ...c, ...input } : c))
      } else {
        const nieuw = await createInterestCategorie(input)
        setCategorieen(prev => [...prev, nieuw])
      }
      sluitCategorieModal()
      router.refresh()
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  async function handleVerwijderCategorie(cat: InterestCategorie) {
    if (!confirm(`Categorie "${cat.name}" verwijderen?`)) return
    try {
      await deleteInterestCategorie(cat.id)
      setCategorieen(prev => prev.filter(c => c.id !== cat.id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt.')
    }
  }

  function openNieuweTag(categoryId: string) {
    setTagEditId(null)
    setTagForm(legeTag(categoryId))
    setFout(null)
    setTagModalOpen(true)
  }

  function openBewerkTag(tag: InterestTag) {
    setTagEditId(tag.id)
    setTagForm({
      category_id: tag.category_id,
      label: tag.label,
      emoji: tag.emoji,
      sort_order: String(tag.sort_order),
      active: tag.active,
    })
    setFout(null)
    setTagModalOpen(true)
  }

  function sluitTagModal() {
    setTagModalOpen(false)
    setTagEditId(null)
    setFout(null)
  }

  async function handleOpslaanTag() {
    if (!tagForm.label.trim()) { setFout('Label is verplicht.'); return }
    if (!tagForm.category_id) { setFout('Kies een categorie.'); return }
    setBezig(true); setFout(null)
    try {
      const input: InterestTagInput = {
        category_id: tagForm.category_id,
        label: tagForm.label.trim(),
        emoji: tagForm.emoji.trim() || '✨',
        sort_order: parseInt(tagForm.sort_order, 10) || 0,
        active: tagForm.active,
      }
      if (tagEditId) {
        await updateInterestTag(tagEditId, input)
        setTags(prev => prev.map(t => t.id === tagEditId ? { ...t, ...input } : t))
      } else {
        const nieuw = await createInterestTag(input)
        setTags(prev => [...prev, nieuw])
      }
      sluitTagModal()
      router.refresh()
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  async function handleToggleActief(tag: InterestTag) {
    try {
      await updateInterestTag(tag.id, { active: !tag.active })
      setTags(prev => prev.map(t => t.id === tag.id ? { ...t, active: !t.active } : t))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kon status niet wijzigen.')
    }
  }

  async function handleVerwijderTag(tag: InterestTag) {
    if (!confirm(`Tag "${tag.label}" verwijderen?`)) return
    try {
      await deleteInterestTag(tag.id)
      setTags(prev => prev.filter(t => t.id !== tag.id))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt.')
    }
  }

  const sortedCategorieen = [...categorieen].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">
          {categorieen.length} categorie{categorieen.length !== 1 ? 'ën' : ''}, {tags.length} tag{tags.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openNieuweCategorie}
          className="flex items-center gap-2 px-4 py-2.5 bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Categorie toevoegen
        </button>
      </div>

      {sortedCategorieen.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-10 text-center text-gray-500 text-sm">
          Nog geen categorieën — voeg er een toe.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategorieen.map(cat => {
            const catTags = tags
              .filter(t => t.category_id === cat.id)
              .sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-white font-semibold text-sm">{cat.name}</h2>
                    <span className="text-xs text-gray-500">{catTags.length} tag{catTags.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openNieuweTag(cat.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-opstap-orange-300 hover:text-white hover:bg-opstap-orange-600/20 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tag toevoegen
                    </button>
                    <button
                      onClick={() => openBewerkCategorie(cat)}
                      className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Categorie bewerken"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleVerwijderCategorie(cat)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Categorie verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {catTags.length === 0 ? (
                  <div className="px-5 py-6 text-center text-gray-500 text-sm">
                    Nog geen tags in deze categorie.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-800">
                      {catTags.map(tag => (
                        <tr key={tag.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3 w-10 text-lg">{tag.emoji}</td>
                          <td className="px-5 py-3 text-white font-medium">{tag.label}</td>
                          <td className="px-5 py-3 text-gray-500 tabular-nums w-16">#{tag.sort_order}</td>
                          <td className="px-5 py-3 w-16">
                            <button
                              onClick={() => handleToggleActief(tag)}
                              className="relative w-10 h-5 rounded-full transition-colors"
                              style={{ backgroundColor: tag.active ? '#7c3aed' : '#374151' }}
                              title={tag.active ? 'Zet inactief' : 'Zet actief'}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tag.active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openBewerkTag(tag)}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                title="Bewerken"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVerwijderTag(tag)}
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Categorie modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">
                {catEditId ? 'Categorie bewerken' : 'Categorie toevoegen'}
              </h2>
              <button onClick={sluitCategorieModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam *</label>
                <input
                  value={catForm.name}
                  onChange={e => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Muziek"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Volgorde</label>
                <input
                  type="number"
                  value={catForm.sort_order}
                  onChange={e => setCatForm(prev => ({ ...prev, sort_order: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-opstap-orange-500 transition-colors"
                />
              </div>

              {fout && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{fout}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end">
              <button
                onClick={sluitCategorieModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpslaanCategorie}
                disabled={bezig}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
              >
                {bezig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">
                {tagEditId ? 'Tag bewerken' : 'Tag toevoegen'}
              </h2>
              <button onClick={sluitTagModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Categorie *</label>
                <select
                  value={tagForm.category_id}
                  onChange={e => setTagForm(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-opstap-orange-500 transition-colors"
                >
                  <option value="" disabled>Kies een categorie</option>
                  {sortedCategorieen.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Label *</label>
                  <input
                    value={tagForm.label}
                    onChange={e => setTagForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Housemuziek"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Emoji</label>
                  <input
                    value={tagForm.emoji}
                    onChange={e => setTagForm(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-opstap-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Volgorde</label>
                  <input
                    type="number"
                    value={tagForm.sort_order}
                    onChange={e => setTagForm(prev => ({ ...prev, sort_order: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-opstap-orange-500 transition-colors"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tagForm.active}
                    onChange={e => setTagForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-opstap-orange-600 focus:ring-opstap-orange-500"
                  />
                  Actief (zichtbaar in de app)
                </label>
              </div>

              {fout && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{fout}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end">
              <button
                onClick={sluitTagModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpslaanTag}
                disabled={bezig}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-opstap-orange-600 hover:bg-opstap-orange-500 transition-colors disabled:opacity-50"
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
