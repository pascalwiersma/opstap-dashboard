export type VolgordeTag = {
  id: string
  category_id: string
  sort_order: number
}

export type VolgordeUpdate = {
  id: string
  category_id: string
  sort_order: number
}

export function arrayVerplaats<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item === undefined) return items
  next.splice(to, 0, item)
  return next
}

export function gesorteerdInCategorie<T extends VolgordeTag>(tags: T[], categoryId: string): T[] {
  return tags
    .filter(t => t.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
}

export function herschikBinnenCategorie<T extends VolgordeTag>(
  tags: T[],
  categoryId: string,
  fromIndex: number,
  toIndex: number,
): T[] {
  const ids = gesorteerdInCategorie(tags, categoryId).map(t => t.id)
  const moved = arrayVerplaats(ids, fromIndex, toIndex)
  if (moved === ids) return tags
  return tags.map(t => {
    if (t.category_id !== categoryId) return t
    const index = moved.indexOf(t.id)
    if (index === -1) return t
    return { ...t, sort_order: index + 1 }
  })
}

export function verplaatsNaarCategorie<T extends VolgordeTag>(
  tags: T[],
  tagId: string,
  toCategoryId: string,
  toIndex: number,
): T[] {
  const active = tags.find(t => t.id === tagId)
  if (!active) return tags

  const fromCategoryId = active.category_id
  if (fromCategoryId === toCategoryId) {
    const ids = gesorteerdInCategorie(tags, fromCategoryId).map(t => t.id)
    const fromIndex = ids.indexOf(tagId)
    if (fromIndex === -1) return tags
    const clamped = Math.max(0, Math.min(toIndex, ids.length - 1))
    return herschikBinnenCategorie(tags, fromCategoryId, fromIndex, clamped)
  }

  const sourceIds = gesorteerdInCategorie(tags, fromCategoryId)
    .filter(t => t.id !== tagId)
    .map(t => t.id)
  const destIds = gesorteerdInCategorie(tags, toCategoryId)
    .filter(t => t.id !== tagId)
    .map(t => t.id)
  const insertAt = Math.max(0, Math.min(toIndex, destIds.length))
  destIds.splice(insertAt, 0, tagId)

  return tags.map(t => {
    if (t.id === tagId) {
      return { ...t, category_id: toCategoryId, sort_order: destIds.indexOf(tagId) + 1 }
    }
    if (t.category_id === fromCategoryId) {
      const index = sourceIds.indexOf(t.id)
      return index === -1 ? t : { ...t, sort_order: index + 1 }
    }
    if (t.category_id === toCategoryId) {
      const index = destIds.indexOf(t.id)
      return index === -1 ? t : { ...t, sort_order: index + 1 }
    }
    return t
  })
}

export function volgordeWijzigingen<T extends VolgordeTag>(before: T[], after: T[]): VolgordeUpdate[] {
  const beforeById = new Map(before.map(t => [t.id, t]))
  const changes: VolgordeUpdate[] = []
  for (const t of after) {
    const prev = beforeById.get(t.id)
    if (!prev) continue
    if (prev.category_id !== t.category_id || prev.sort_order !== t.sort_order) {
      changes.push({ id: t.id, category_id: t.category_id, sort_order: t.sort_order })
    }
  }
  return changes
}
