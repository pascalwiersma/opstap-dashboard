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

export type Event = {
  id: string
  title: string
  description: string | null
  starts_at: string
  venue_id: string | null
  city: string | null
  ticket_url: string | null
  artists: string | null
  photo_url: string | null
  lat: number | null
  lng: number | null
  max_attendees: number | null
  status: 'active' | 'cancelled' | 'finished'
  created_at: string
  venue_name?: string | null
}

export type EventInput = {
  title: string
  description: string | null
  starts_at: string
  venue_id: string | null
  city: string | null
  ticket_url: string | null
  artists: string | null
  photo_url: string | null
  lat: number | null
  lng: number | null
  max_attendees: number | null
  status: 'active' | 'cancelled' | 'finished'
  creator_id: string
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await adminClient()
    .from('events')
    .select('id, title, description, starts_at, venue_id, city, ticket_url, photo_url, lat, lng, max_attendees, status, created_at, venues(name)')
    .eq('id', id)
    .single()
  if (error) return null
  const r = data as Record<string, unknown>
  const venues = r.venues as { name: string } | null
  return { ...r, venue_name: venues?.name ?? null } as Event
}

export async function uploadEventPhoto(formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file) throw new Error('Geen bestand gevonden.')
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await adminClient()
    .storage.from('event-photos')
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { data } = adminClient().storage.from('event-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function getEvents(): Promise<Event[]> {
  const { data, error } = await adminClient()
    .from('events')
    .select('id, title, description, starts_at, venue_id, city, ticket_url, artists, photo_url, lat, lng, max_attendees, status, created_at, venues(name)')
    .order('starts_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>
    const venues = r.venues as { name: string } | null
    return { ...r, venue_name: venues?.name ?? null } as Event
  })
}

export async function createEvent(input: EventInput): Promise<Event> {
  const { data, error } = await adminClient()
    .from('events')
    .insert(input)
    .select('id, title, description, starts_at, venue_id, city, ticket_url, artists, photo_url, lat, lng, max_attendees, status, created_at')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/events')
  return data as Event
}

export async function updateEvent(id: string, input: Partial<Omit<EventInput, 'creator_id'>>) {
  const { error } = await adminClient()
    .from('events')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/events')
}

export async function deleteEvent(id: string) {
  const { error } = await adminClient()
    .from('events')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/events')
}
