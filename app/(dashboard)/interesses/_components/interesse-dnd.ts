import type { UniqueIdentifier } from '@dnd-kit/core'
import type { InterestTag } from '@/app/actions/interests'

export const TAG_PREFIX = 'tag:'
export const CAT_PREFIX = 'cat:'

export function tagDndId(id: string): string {
  return `${TAG_PREFIX}${id}`
}

export function catDndId(id: string): string {
  return `${CAT_PREFIX}${id}`
}

export function isTagDndId(id: UniqueIdentifier): boolean {
  return String(id).startsWith(TAG_PREFIX)
}

export function isCatDndId(id: UniqueIdentifier): boolean {
  return String(id).startsWith(CAT_PREFIX)
}

export function rawDndId(id: UniqueIdentifier, prefix: string): string {
  return String(id).slice(prefix.length)
}

export function vindCategorieVanSleepId(
  id: UniqueIdentifier,
  tags: InterestTag[],
): string | undefined {
  if (isCatDndId(id)) return rawDndId(id, CAT_PREFIX)
  if (isTagDndId(id)) {
    const tagId = rawDndId(id, TAG_PREFIX)
    return tags.find(t => t.id === tagId)?.category_id
  }
  return undefined
}
