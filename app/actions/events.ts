'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sanitizeOmschrijving } from '@/lib/sanitize-omschrijving'
import { eisPermissie } from '@/lib/eis-permissie'
import { getCurrentUser } from '@/lib/supabase-server'
import { kan } from '@/lib/permissions'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const EVENT_KOLOMMEN = 'id, title, description, starts_at, ends_at, venue_id, city, ticket_url, artists, photo_url, lat, lng, status, created_at'

export type Event = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  venue_id: string | null
  city: string | null
  ticket_url: string | null
  artists: string | null
  photo_url: string | null
  lat: number | null
  lng: number | null
  status: 'active' | 'cancelled' | 'finished'
  created_at: string
  venue_name?: string | null
}

export type EventInput = {
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  venue_id: string | null
  city: string | null
  ticket_url: string | null
  artists: string | null
  photo_url: string | null
  lat: number | null
  lng: number | null
  status: 'active' | 'cancelled' | 'finished'
  creator_id: string
}

function mapEvent(row: Record<string, unknown>): Event {
  const venues = row.venues as { name: string } | null
  return { ...row, venue_name: venues?.name ?? null } as Event
}

export async function getEvent(id: string): Promise<Event | null> {
  await eisPermissie('evenementen', 'zien')
  const { data, error } = await adminClient()
    .from('events')
    .select(`${EVENT_KOLOMMEN}, venues(name)`)
    .eq('id', id)
    .single()
  if (error) return null
  return mapEvent(data as Record<string, unknown>)
}

export async function uploadEventPhoto(formData: FormData): Promise<string> {
  const user = await getCurrentUser()
  if (!kan(user, 'evenementen', 'bewerken') && !kan(user, 'evenementen', 'toevoegen')) {
    throw new Error('Geen toegang.')
  }
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
  await eisPermissie('evenementen', 'zien')
  const { data, error } = await adminClient()
    .from('events')
    .select(`${EVENT_KOLOMMEN}, venues(name)`)
    .order('starts_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown[]).map((row: unknown) => mapEvent(row as Record<string, unknown>))
}

function payloadVanInput(input: EventInput | Partial<Omit<EventInput, 'creator_id'>>) {
  const { description, ...rest } = input
  return {
    ...rest,
    description: sanitizeOmschrijving(description ?? null),
  }
}

export async function createEvent(input: EventInput): Promise<Event> {
  await eisPermissie('evenementen', 'toevoegen')
  const { data, error } = await adminClient()
    .from('events')
    .insert(payloadVanInput(input))
    .select(EVENT_KOLOMMEN)
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/events-beheer')
  revalidatePath('/events')
  return data as Event
}

export async function updateEvent(id: string, input: Partial<Omit<EventInput, 'creator_id'>>) {
  await eisPermissie('evenementen', 'bewerken')
  const { error } = await adminClient()
    .from('events')
    .update(payloadVanInput(input))
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/events-beheer')
  revalidatePath('/events')
}

export async function deleteEvent(id: string) {
  await eisPermissie('evenementen', 'verwijderen')
  const { error } = await adminClient()
    .from('events')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/events-beheer')
  revalidatePath('/events')
}
