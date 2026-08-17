'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { X, Trash2, Save, ImagePlus, Loader2 } from 'lucide-react'
import type { Venue, VenueInput, VenueType, VenuePhoto } from '@/app/actions/venues'
import { getVenuePhotos, uploadVenuePhoto, deleteVenuePhoto } from '@/app/actions/venues'

const OmschrijvingEditor = dynamic(
  () => import('../../events-beheer/_components/omschrijving-editor').then(m => m.OmschrijvingEditor),
  { ssr: false, loading: () => <div className="w-full h-52 rounded-lg bg-gray-800 animate-pulse" /> }
)

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
  kanOpslaan?: boolean
}

const DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  ma: 'Maandag', di: 'Dinsdag', wo: 'Woensdag', do: 'Donderdag',
  vr: 'Vrijdag', za: 'Zaterdag', zo: 'Zondag',
}

const TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'club', label: 'Club' },
  { value: 'cafe', label: 'Café' },
]

const TIJDSTAPPEN: string[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

type DagTijden = { open: boolean; van: string; tot: string }

function parseDagWaarde(raw: string | undefined): DagTijden {
  if (!raw || raw.toLowerCase() === 'gesloten') {
    return { open: false, van: '16:00', tot: '01:00' }
  }
  const matches = raw.match(/(\d{1,2}):(\d{2})/g)
  if (!matches || matches.length < 2) {
    return { open: false, van: '16:00', tot: '01:00' }
  }
  const normaliseer = (t: string) => {
    const [h, m] = t.split(':')
    return `${h.padStart(2, '0')}:${m}`
  }
  return { open: true, van: normaliseer(matches[0]), tot: normaliseer(matches[1]) }
}

function startTijden(hours: Record<string, string> | null | undefined): Record<(typeof DAYS)[number], DagTijden> {
  const init = {} as Record<(typeof DAYS)[number], DagTijden>
  for (const day of DAYS) {
    init[day] = parseDagWaarde(hours?.[day])
  }
  return init
}

export function VenuePanel({ mode, venue, lat, lng, dragPos, onSave, onDelete, onClose, kanOpslaan = true }: Props) {
  const [name, setName] = useState(venue?.name ?? '')
  const [type, setType] = useState<VenueType | null>(venue?.type ?? null)
  const [description, setDescription] = useState(venue?.description ?? '')
  const [descriptionEn, setDescriptionEn] = useState(venue?.description_en ?? '')
  const [active, setActive] = useState(venue?.active ?? true)
  const [hours, setHours] = useState<Record<(typeof DAYS)[number], DagTijden>>(
    () => startTijden(venue?.opening_hours ?? null)
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

  function zetDag(day: (typeof DAYS)[number], patch: Partial<DagTijden>) {
    setHours(h => ({ ...h, [day]: { ...h[day], ...patch } }))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Naam is verplicht.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const opening_hours: Record<string, string> = {}
      for (const day of DAYS) {
        if (hours[day].open) {
          opening_hours[day] = `${hours[day].van}–${hours[day].tot}`
        }
      }
      await onSave({
        name: name.trim(),
        lat: coordLat,
        lng: coordLng,
        type,
        description: description || null,
        description_en: descriptionEn || null,
        active,
        opening_hours: Object.keys(opening_hours).length ? opening_hours : null,
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
    <div className="flex flex-col h-full bg-gray-900 w-[26rem] shrink-0 border-l border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-semibold text-base">
          {mode === 'create' ? 'Nieuw venue' : 'Venue bewerken'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <p className="text-xs text-gray-500">Sleep de pin op de kaart om de locatie te wijzigen.</p>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Naam *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Café de Goudkust"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(type === opt.value ? null : opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  type === opt.value
                    ? 'bg-opstap-orange-600 border-opstap-orange-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Omschrijving (Nederlands)</label>
            <OmschrijvingEditor
              value={description}
              onChange={setDescription}
              placeholder="Sfeer, muziek, wat je er kunt verwachten..."
              height={200}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (English)</label>
            <OmschrijvingEditor
              value={descriptionEn}
              onChange={setDescriptionEn}
              placeholder="Vibe, music, what to expect..."
              height={200}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Openingstijden</label>
          <div className="space-y-1.5">
            {DAYS.map(day => {
              const dag = hours[day]
              return (
                <div key={day} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => zetDag(day, { open: !dag.open })}
                    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${dag.open ? 'bg-opstap-orange-600' : 'bg-gray-700'}`}
                    aria-pressed={dag.open}
                    aria-label={`${DAY_LABELS[day]} ${dag.open ? 'open' : 'gesloten'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dag.open ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-xs w-20 shrink-0 ${dag.open ? 'text-gray-300' : 'text-gray-600'}`}>
                    {DAY_LABELS[day]}
                  </span>
                  {dag.open ? (
                    <>
                      <select
                        value={dag.van}
                        onChange={e => zetDag(day, { van: e.target.value })}
                        className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-opstap-orange-500"
                      >
                        {(TIJDSTAPPEN.includes(dag.van) ? TIJDSTAPPEN : [dag.van, ...TIJDSTAPPEN]).map(t => (
                          <option key={`${day}-van-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-gray-600 text-xs shrink-0">–</span>
                      <select
                        value={dag.tot}
                        onChange={e => zetDag(day, { tot: e.target.value })}
                        className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-opstap-orange-500"
                      >
                        {(TIJDSTAPPEN.includes(dag.tot) ? TIJDSTAPPEN : [dag.tot, ...TIJDSTAPPEN]).map(t => (
                          <option key={`${day}-tot-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="text-xs text-gray-600">Gesloten</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

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

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Actief in de app</span>
          <button
            onClick={() => setActive(a => !a)}
            className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-opstap-orange-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

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
        {kanOpslaan && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
        )}
      </div>
    </div>
  )
}
