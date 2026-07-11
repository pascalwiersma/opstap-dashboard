'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type InterestCategorie = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type InterestCategorieInput = {
  name: string
  sort_order: number
}

export type InterestTag = {
  id: string
  category_id: string
  label: string
  emoji: string
  sort_order: number
  active: boolean
  created_at: string
}

export type InterestTagInput = {
  category_id: string
  label: string
  emoji: string
  sort_order: number
  active: boolean
}

export async function getInterestCategorieen(): Promise<InterestCategorie[]> {
  const { data, error } = await adminClient()
    .from('interest_categories')
    .select('id, name, sort_order, created_at')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data as InterestCategorie[]
}

export async function getInterestTags(): Promise<InterestTag[]> {
  const { data, error } = await adminClient()
    .from('interests')
    .select('id, category_id, label, emoji, sort_order, active, created_at')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data as InterestTag[]
}

export async function createInterestCategorie(input: InterestCategorieInput): Promise<InterestCategorie> {
  const { data, error } = await adminClient()
    .from('interest_categories')
    .insert(input)
    .select('id, name, sort_order, created_at')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/interesses')
  return data as InterestCategorie
}

export async function updateInterestCategorie(id: string, input: Partial<InterestCategorieInput>) {
  const { error } = await adminClient()
    .from('interest_categories')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/interesses')
}

export async function deleteInterestCategorie(id: string) {
  const { error } = await adminClient()
    .from('interest_categories')
    .delete()
    .eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Verwijder eerst alle tags in deze categorie.')
    }
    throw new Error(error.message)
  }
  revalidatePath('/interesses')
}

export async function createInterestTag(input: InterestTagInput): Promise<InterestTag> {
  const { data, error } = await adminClient()
    .from('interests')
    .insert(input)
    .select('id, category_id, label, emoji, sort_order, active, created_at')
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Deze tag bestaat al.')
    throw new Error(error.message)
  }
  revalidatePath('/interesses')
  return data as InterestTag
}

export async function updateInterestTag(id: string, input: Partial<InterestTagInput>) {
  const { error } = await adminClient()
    .from('interests')
    .update(input)
    .eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error('Deze tag bestaat al.')
    throw new Error(error.message)
  }
  revalidatePath('/interesses')
}

export async function deleteInterestTag(id: string) {
  const { error } = await adminClient()
    .from('interests')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/interesses')
}
