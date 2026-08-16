'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { InterestCategorie, InterestTag } from '@/app/actions/interests'
import { catDndId, tagDndId } from './interesse-dnd'
import { InteresseTagRij } from './interesse-tag-rij'

export function InteresseCategorieKaart({
  cat,
  catTags,
  onNieuweTag,
  onBewerkCategorie,
  onVerwijderCategorie,
  onToggleActief,
  onBewerkTag,
  onVerwijderTag,
}: {
  cat: InterestCategorie
  catTags: InterestTag[]
  onNieuweTag: (categoryId: string) => void
  onBewerkCategorie: (cat: InterestCategorie) => void
  onVerwijderCategorie: (cat: InterestCategorie) => void
  onToggleActief: (tag: InterestTag) => void
  onBewerkTag: (tag: InterestTag) => void
  onVerwijderTag: (tag: InterestTag) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: catDndId(cat.id),
    data: { type: 'category' as const, categoryId: cat.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
        isOver ? 'border-opstap-orange-500/70' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <h2 className="text-white font-semibold text-sm">{cat.name}</h2>
          <span className="text-xs text-gray-500">{catTags.length} tag{catTags.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNieuweTag(cat.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-opstap-orange-300 hover:text-white hover:bg-opstap-orange-600/20 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tag toevoegen
          </button>
          <button
            type="button"
            onClick={() => onBewerkCategorie(cat)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Categorie bewerken"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onVerwijderCategorie(cat)}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Categorie verwijderen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SortableContext items={catTags.map(t => tagDndId(t.id))} strategy={verticalListSortingStrategy}>
        {catTags.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-500 text-sm">
            Nog geen tags in deze categorie. Sleep er een naartoe.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {catTags.map(tag => (
              <InteresseTagRij
                key={tag.id}
                tag={tag}
                onToggleActief={onToggleActief}
                onBewerk={onBewerkTag}
                onVerwijder={onVerwijderTag}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  )
}
