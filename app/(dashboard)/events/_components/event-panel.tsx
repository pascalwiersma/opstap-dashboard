'use client'

import { useRef, useState } from 'react'
import { X, Trash2, Save, MapPin, Hexagon, Calendar, ImagePlus, Loader2 } from 'lucide-react'
import type { CityEvent, CityEventInput, CityEventType } from '@/app/actions/city-events'
import { uploadEventPhoto, deleteEventPhoto } from '@/app/actions/city-events'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
  event?: CityEvent
  locationSnap?: { lat: number; lng: number } | null
  polygon?: [number, number][] | null
  dragPos?: { lat: number; lng: number }
  onSave: (input: CityEventInput) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

const TYPE_OPTIONS: { value: CityEventType; label: string }[] = [
  { value: 'kermis', label: 'Kermis' },
  { value: 'festival', label: 'Festival' },
  { value: 'markt', label: 'Markt' },
  { value: 'concert', label: 'Concert' },
  { value: 'sport', label: 'Sport' },
  { value: 'overig', label: 'Overig' },
]

const COLOR_SWATCHES = [
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#ec4899', // pink
  '#84cc16', // lime
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function EventPanel({ mode, event, locationSnap, polygon, dragPos, onSave, onDelete, onClose }: Props) {
  const locationType = event?.location_type ?? (polygon ? 'region' : 'point')

  const [name, setName] = useState(event?.name ?? '')
  const [eventType, setEventType] = useState<CityEventType | null>(event?.event_type ?? null)
  const [description, setDescription] = useState(event?.description ?? '')
  const [startDate, setStartDate] = useState(event?.start_date ?? today())
  const [endDate, setEndDate] = useState(event?.end_date ?? today())
  const [color, setColor] = useState(event?.color ?? '#0ea5e9')
  const [photoUrl, setPhotoUrl] = useState<string | null>(event?.photo_url ?? null)
  const [active, setActive] = useState(event?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lat = dragPos?.lat ?? event?.lat ?? locationSnap?.lat
  const lng = dragPos?.lng ?? event?.lng ?? locationSnap?.lng
  const poly = event?.polygon ?? polygon

  async function handleSave() {
    if (!name.trim()) { setError('Naam is verplicht.'); return }
    if (endDate < startDate) { setError('Einddatum mag niet voor de begindatum liggen.'); return }
    setSaving(true); setError(null)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        event_type: eventType,
        location_type: locationType,
        lat: locationType === 'point' ? (lat ?? null) : null,
        lng: locationType === 'point' ? (lng ?? null) : null,
        polygon: locationType === 'region' ? (poly ?? null) : null,
        start_date: startDate,
        end_date: endDate,
        color,
        photo_url: photoUrl,
        active,
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
    try { await onDelete(); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : 'Er ging iets mis.') }
    finally { setDeleting(false) }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !event?.id) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = await uploadEventPhoto(event.id, fd)
      setPhotoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeletePhoto() {
    if (!event?.id || !photoUrl) return
    setUploading(true)
    try {
      await deleteEventPhoto(event.id, photoUrl)
      setPhotoUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 w-96 shrink-0 border-l border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-semibold text-base">
          {mode === 'create' ? 'Nieuw evenement' : 'Evenement bewerken'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Locatie info */}
        <div className="flex items-center gap-2 text-xs bg-gray-800 rounded-lg px-3 py-2">
          {locationType === 'point' ? (
            <><MapPin className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="text-gray-400 tabular-nums">{lat != null && lng != null ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : 'Punt evenement'}</span>
            {dragPos && <span className="ml-auto font-medium" style={{ color }}>Versleept</span>}</>
          ) : (
            <><Hexagon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="text-gray-400">Regio — {poly?.length ?? 0} punten</span></>
          )}
        </div>
        {locationType === 'point' && (
          <p className="text-xs text-gray-600">Sleep de pin op de kaart om de locatie te wijzigen</p>
        )}

        {/* Naam */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Kermis Groningen"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEventType(eventType === opt.value ? null : opt.value)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                  eventType === opt.value
                    ? 'text-white border-transparent'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
                style={eventType === opt.value ? { backgroundColor: color, borderColor: color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kleur */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Kleur</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `3px solid white` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
            {/* Custom kleur invoer */}
            <div className="flex items-center gap-1.5 ml-1">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                title="Aangepaste kleur"
              />
            </div>
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
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
          />
        </div>

        {/* Periode */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            <Calendar className="inline w-3.5 h-3.5 mr-1" style={{ color }} />
            Periode
          </label>
          <div className="flex gap-2 items-center">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors" />
            <span className="text-gray-500 text-xs shrink-0">t/m</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors" />
          </div>
        </div>

        {/* Foto — alleen in edit modus */}
        {mode === 'edit' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Foto</label>
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Event foto" className="w-full h-36 object-cover" />
                <button
                  onClick={handleDeletePhoto}
                  disabled={uploading}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 w-full border border-dashed border-gray-700 hover:border-gray-500 rounded-xl px-4 py-4 text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploaden...</>
                  : <><ImagePlus className="w-4 h-4" /> Foto toevoegen</>}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        )}

        {/* Actief */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Actief in de app</span>
          <button
            onClick={() => setActive(a => !a)}
            className={`relative w-11 h-6 rounded-full transition-colors`}
            style={{ backgroundColor: active ? color : '#374151' }}
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
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-800/50 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Verwijderen...' : 'Verwijderen'}
          </button>
        )}
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: color }}>
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}
