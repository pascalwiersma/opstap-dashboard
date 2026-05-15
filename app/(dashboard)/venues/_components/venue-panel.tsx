'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Save, MapPin, ImagePlus, Loader2 } from 'lucide-react'
import type { Venue, VenueInput, VenueType, VenuePhoto } from '@/app/actions/venues'
import { getVenuePhotos, uploadVenuePhoto, deleteVenuePhoto } from '@/app/actions/venues'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
  venue?: Venue
  lat?: number
  lng?: number
  dragPos?: { lat: number; lng: number }
  onSave: (input: VenueInput) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

const DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const DAY_LABELS: Record<string, string> = {
  ma: 'Maandag', di: 'Dinsdag', wo: 'Woensdag', do: 'Donderdag',
  vr: 'Vrijdag', za: 'Zaterdag', zo: 'Zondag',
}

const TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'club', label: 'Club' },
  { value: 'cafe', label: 'Café' },
]

export function VenuePanel({ mode, venue, lat, lng, dragPos, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(venue?.name ?? '')
  const [type, setType] = useState<VenueType | null>(venue?.type ?? null)
  const [description, setDescription] = useState(venue?.description ?? '')
  const [active, setActive] = useState(venue?.active ?? true)
  const [hours, setHours] = useState<Record<string, string>>(
    venue?.opening_hours ?? {}
  )
  const [photos, setPhotos] = useState<VenuePhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit' && venue?.id) {
      getVenuePhotos(venue.id).then(setPhotos).catch(() => {})
    }
  }, [mode, venue?.id])

  const coordLat = dragPos?.lat ?? venue?.lat ?? lat ?? 0
  const coordLng = dragPos?.lng ?? venue?.lng ?? lng ?? 0

  async function handleSave() {
    if (!name.trim()) {
      setError('Naam is verplicht.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        lat: coordLat,
        lng: coordLng,
        type,
        description: description.trim() || null,
        active,
        opening_hours: Object.keys(hours).length ? hours : null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis.')
    } finally {
      setDeleting(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !venue?.id) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const newPhoto = await uploadVenuePhoto(venue.id, fd)
      setPhotos(p => [...p, newPhoto])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeletePhoto(photo: VenuePhoto) {
    setDeletingPhotoId(photo.id)
    try {
      await deleteVenuePhoto(photo.id, photo.photo_url)
      setPhotos(p => p.filter(x => x.id !== photo.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt.')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 w-96 shrink-0 border-l border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-semibold text-base">
          {mode === 'create' ? 'Nieuw venue' : 'Venue bewerken'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Coördinaten */}
        <div className="flex items-center gap-2 text-xs bg-gray-800 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-gray-400 tabular-nums">{coordLat.toFixed(6)}, {coordLng.toFixed(6)}</span>
          {dragPos && <span className="ml-auto text-violet-400 font-medium">Versleept</span>}
        </div>
        <p className="text-xs text-gray-600">Sleep de pin op de kaart om de locatie te wijzigen</p>

        {/* Naam */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Café de Goudkust"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(type === opt.value ? null : opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  type === opt.value
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Omschrijving */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Omschrijving</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Korte beschrijving..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
          />
        </div>

        {/* Openingstijden */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Openingstijden</label>
          <div className="space-y-2">
            {DAYS.map(day => (
              <div key={day} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-7 shrink-0">{DAY_LABELS[day].slice(0, 2)}</span>
                <input
                  value={hours[day] ?? ''}
                  onChange={e => setHours(h => ({ ...h, [day]: e.target.value }))}
                  placeholder="22:00–04:00 of gesloten"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Foto's — alleen in edit modus */}
        {mode === 'edit' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Foto&apos;s</label>
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {photos.map(photo => (
                  <div key={photo.id} className="relative rounded-lg overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.photo_url} alt="Venue foto" className="w-full h-24 object-cover" />
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                    >
                      {deletingPhotoId === photo.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <X className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 w-full border border-dashed border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploaden...</>
                : <><ImagePlus className="w-4 h-4" /> Foto toevoegen</>}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        )}

        {/* Actief */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Actief in de app</span>
          <button
            onClick={() => setActive(a => !a)}
            className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-violet-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-gray-800 flex gap-2">
        {mode === 'edit' && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-800/50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Verwijderen...' : 'Verwijderen'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}
