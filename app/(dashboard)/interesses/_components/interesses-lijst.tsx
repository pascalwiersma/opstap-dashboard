'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, X, Save, Loader2 } from 'lucide-react'
import type { InterestCategorie, InterestCategorieInput, InterestTag, InterestTagInput } from '@/app/actions/interests'
import {
  createInterestCategorie, updateInterestCategorie, deleteInterestCategorie,
  createInterestTag, updateInterestTag, deleteInterestTag, herordenInterestTags,
} from '@/app/actions/interests'
import {
  gesorteerdInCategorie,
  herschikBinnenCategorie,
  verplaatsNaarCategorie,
  volgordeWijzigingen,
} from '@/lib/interesse-volgorde'
import {
  TAG_PREFIX,
  isCatDndId,
  isTagDndId,
  rawDndId,
  vindCategorieVanSleepId,
} from './interesse-dnd'
import { InteresseCategorieKaart } from './interesse-categorie-kaart'
import { InteresseTagOverlay } from './interesse-tag-rij'

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
  const [actieveTag, setActieveTag] = useState<InterestTag | null>(null)
  const snapshotRef = useRef<InterestTag[]>(initialTags)
  const tagsRef = useRef<InterestTag[]>(initialTags)
  const router = useRouter()

  useEffect(() => {
    tagsRef.current = tags
  }, [tags])

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catEditId, setCatEditId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<CategorieForm>(LEGE_CATEGORIE)

  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagEditId, setTagEditId] = useState<string | null>(null)
  const [tagForm, setTagForm] = useState<TagForm>(legeTag(''))

  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
    const aantal = tags.filter(t => t.category_id === categoryId).length
    setTagEditId(null)
    setTagForm({ ...legeTag(categoryId), sort_order: String(aantal + 1) })
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

  function handleDragStart(event: DragStartEvent) {
    snapshotRef.current = tags
    if (!isTagDndId(event.active.id)) return
    const tagId = rawDndId(event.active.id, TAG_PREFIX)
    setActieveTag(tags.find(t => t.id === tagId) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !isTagDndId(active.id)) return

    const tagId = rawDndId(active.id, TAG_PREFIX)
    setTags(prev => {
      const fromCat = vindCategorieVanSleepId(active.id, prev)
      const toCat = vindCategorieVanSleepId(over.id, prev)
      if (!fromCat || !toCat || fromCat === toCat) return prev

      const dest = gesorteerdInCategorie(prev, toCat).filter(t => t.id !== tagId)
      let toIndex = dest.length
      if (isTagDndId(over.id)) {
        const overTagId = rawDndId(over.id, TAG_PREFIX)
        const overIndex = dest.findIndex(t => t.id === overTagId)
        const isBelow = Boolean(
          active.rect.current.translated
          && active.rect.current.translated.top > over.rect.top + over.rect.height,
        )
        toIndex = overIndex < 0 ? dest.length : overIndex + (isBelow ? 1 : 0)
      }
      const next = verplaatsNaarCategorie(prev, tagId, toCat, toIndex)
      tagsRef.current = next
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActieveTag(null)
    if (!over || !isTagDndId(active.id)) return

    const tagId = rawDndId(active.id, TAG_PREFIX)
    const current = tagsRef.current
    const next = (() => {
      const fromCat = vindCategorieVanSleepId(active.id, current)
      const toCat = vindCategorieVanSleepId(over.id, current)
      if (!fromCat || !toCat) return current
      if (fromCat === toCat && isTagDndId(over.id)) {
        const ids = gesorteerdInCategorie(current, fromCat).map(t => t.id)
        return herschikBinnenCategorie(
          current,
          fromCat,
          ids.indexOf(tagId),
          ids.indexOf(rawDndId(over.id, TAG_PREFIX)),
        )
      }
      if (fromCat !== toCat) {
        const dest = gesorteerdInCategorie(current, toCat).filter(t => t.id !== tagId)
        const toIndex = isCatDndId(over.id)
          ? dest.length
          : Math.max(0, dest.findIndex(t => t.id === rawDndId(over.id, TAG_PREFIX)))
        return verplaatsNaarCategorie(current, tagId, toCat, toIndex)
      }
      return current
    })()
    tagsRef.current = next

    setTags(next)
    const updates = volgordeWijzigingen(snapshotRef.current, next)
    if (updates.length === 0) return

    void herordenInterestTags(updates)
      .then(() => { router.refresh() })
      .catch(e => {
        tagsRef.current = snapshotRef.current
        setTags(snapshotRef.current)
        alert(e instanceof Error ? e.message : 'Volgorde opslaan mislukt.')
      })
  }

  function handleDragCancel() {
    setActieveTag(null)
    tagsRef.current = snapshotRef.current
    setTags(snapshotRef.current)
  }

  const sortedCategorieen = [...categorieen].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">
            {categorieen.length} categorie{categorieen.length !== 1 ? 'ën' : ''}, {tags.length} tag{tags.length !== 1 ? 's' : ''}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Sleep een tag om de volgorde te wijzigen, of naar een andere categorie.
          </p>
        </div>
        <button
          type="button"
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-6">
            {sortedCategorieen.map(cat => (
              <InteresseCategorieKaart
                key={cat.id}
                cat={cat}
                catTags={gesorteerdInCategorie(tags, cat.id)}
                onNieuweTag={openNieuweTag}
                onBewerkCategorie={openBewerkCategorie}
                onVerwijderCategorie={handleVerwijderCategorie}
                onToggleActief={handleToggleActief}
                onBewerkTag={openBewerkTag}
                onVerwijderTag={handleVerwijderTag}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {actieveTag ? <InteresseTagOverlay tag={actieveTag} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">
                {catEditId ? 'Categorie bewerken' : 'Categorie toevoegen'}
              </h2>
              <button type="button" onClick={sluitCategorieModal} className="text-gray-400 hover:text-white transition-colors">
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
                type="button"
                onClick={sluitCategorieModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
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

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-semibold text-base">
                {tagEditId ? 'Tag bewerken' : 'Tag toevoegen'}
              </h2>
              <button type="button" onClick={sluitTagModal} className="text-gray-400 hover:text-white transition-colors">
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
                type="button"
                onClick={sluitTagModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
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
