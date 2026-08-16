'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { InterestTag } from '@/app/actions/interests'
import { tagDndId } from './interesse-dnd'

export function InteresseTagRij({
  tag,
  onToggleActief,
  onBewerk,
  onVerwijder,
}: {
  tag: InterestTag
  onToggleActief: (tag: InterestTag) => void
  onBewerk: (tag: InterestTag) => void
  onVerwijder: (tag: InterestTag) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tagDndId(tag.id),
    data: { type: 'tag' as const, tagId: tag.id },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/40 transition-colors"
    >
      <button
        type="button"
        className="shrink-0 p-1.5 text-gray-500 hover:text-gray-300 rounded-lg cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Versleep ${tag.label}`}
        title="Versleep om volgorde of categorie te wijzigen"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-lg shrink-0">{tag.emoji}</span>
      <span className="flex-1 text-white font-medium text-sm min-w-0 truncate">{tag.label}</span>
      <button
        type="button"
        onClick={() => onToggleActief(tag)}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: tag.active ? '#7c3aed' : '#374151' }}
        title={tag.active ? 'Zet inactief' : 'Zet actief'}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tag.active ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onBewerk(tag)}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Bewerken"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onVerwijder(tag)}
          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Verwijderen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function InteresseTagOverlay({ tag }: { tag: InterestTag }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 border border-opstap-orange-500/40 rounded-xl shadow-xl shadow-black/40 w-[min(100%,32rem)]">
      <GripVertical className="w-4 h-4 text-opstap-orange-300 shrink-0" />
      <span className="w-8 text-center text-lg shrink-0">{tag.emoji}</span>
      <span className="flex-1 text-white font-medium text-sm truncate">{tag.label}</span>
    </div>
  )
}
