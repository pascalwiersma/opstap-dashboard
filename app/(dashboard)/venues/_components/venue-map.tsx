'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Venue, VenueInput } from '@/app/actions/venues'
import { createVenue, updateVenue, deleteVenue } from '@/app/actions/venues'
import { VenuePanel } from './venue-panel'
import { Plus } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const TYPE_COLORS: Record<string, string> = {
  bar: '#f59e0b',
  club: '#8b5cf6',
  cafe: '#10b981',
  default: '#6b7280',
}

type PanelState =
  | { mode: 'create'; lat: number; lng: number }
  | { mode: 'edit'; venue: Venue }
  | null

function buildGeoJSON(venueList: Venue[], excludeId?: string): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venueList
      .filter(v => v.id !== excludeId)
      .map(v => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(v.lng), Number(v.lat)] },
        properties: { id: v.id, type: v.type ?? 'default' },
      })),
  }
}

export function VenueMap({ initialVenues }: { initialVenues: Venue[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const dragMarker = useRef<mapboxgl.Marker | null>(null)
  const venuesRef = useRef<Venue[]>(initialVenues)

  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [panel, setPanel] = useState<PanelState>(null)
  const [addMode, setAddMode] = useState(false)
  const addModeRef = useRef(false)
  const panelRef = useRef<PanelState>(null)

  addModeRef.current = addMode
  venuesRef.current = venues
  panelRef.current = panel

  // Update GeoJSON source wanneer venues wijzigen
  const updateSource = useCallback((venueList: Venue[], excludeId?: string) => {
    const src = map.current?.getSource('venues') as mapboxgl.GeoJSONSource | undefined
    src?.setData(buildGeoJSON(venueList, excludeId))
  }, [])

  const closePanel = useCallback(() => {
    dragMarker.current?.remove()
    dragMarker.current = null
    setPanel(null)
    setAddMode(false)
    // Herstel volledige GeoJSON (geen excluded venue meer)
    updateSource(venuesRef.current)
  }, [updateSource])

  // Init kaart — één keer
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [6.5665, 53.2194],
      zoom: 15,
    })
    map.current = m

    m.addControl(new mapboxgl.NavigationControl(), 'top-right')

    m.on('load', () => {
      // GeoJSON source voor alle venues
      m.addSource('venues', {
        type: 'geojson',
        data: buildGeoJSON(venuesRef.current),
      })

      // CircleLayer — zelfde aanpak als de app (WebGL, altijd correct gepositioneerd)
      m.addLayer({
        id: 'venues-pins',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'match', ['get', 'type'],
            'bar', TYPE_COLORS.bar,
            'club', TYPE_COLORS.club,
            'cafe', TYPE_COLORS.cafe,
            TYPE_COLORS.default,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
        },
      })

      // Hover cursor
      m.on('mouseenter', 'venues-pins', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'venues-pins', () => {
        m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
      })

      // Eén centrale click-handler: pin of lege kaart
      m.on('click', (e) => {
        // Kijk of er een venue-pin onder de klik zit
        const features = m.queryRenderedFeatures(e.point, { layers: ['venues-pins'] })

        if (features.length > 0) {
          // Pin aangeklikt → open edit paneel
          const id = features[0].properties?.id as string
          const venue = venuesRef.current.find(v => v.id === id)
          if (!venue) return

          dragMarker.current?.remove()
          dragMarker.current = null

          // Verberg pin in GeoJSON en vervang door sleepbare marker
          updateSource(venuesRef.current, id)

          const el = makeDragEl(venue.type)
          const marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([Number(venue.lng), Number(venue.lat)])
            .addTo(m)
          dragMarker.current = marker

          setPanel({ mode: 'edit', venue })
          return
        }

        // Lege kaart → nieuw venue (alleen in addMode)
        if (!addModeRef.current) return

        const { lng, lat } = e.lngLat

        dragMarker.current?.remove()
        const el = makeDragEl(null)
        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(m)
        dragMarker.current = marker

        setPanel({ mode: 'create', lat, lng })
        setAddMode(false)
      })
    })

    return () => {
      dragMarker.current?.remove()
      dragMarker.current = null
      m.remove()
      map.current = null
    }
  }, [updateSource])

  // Sync GeoJSON wanneer venues wijzigen
  useEffect(() => {
    const excludeId = panelRef.current?.mode === 'edit' ? panelRef.current.venue.id : undefined
    updateSource(venues, excludeId)
  }, [venues, updateSource])

  function makeDragEl(type: string | null): HTMLDivElement {
    const color = TYPE_COLORS[type ?? 'default'] ?? TYPE_COLORS.default
    const el = document.createElement('div')
    el.style.cssText = `
      width: 22px; height: 22px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 0 0 2px ${color}55, 0 3px 10px rgba(0,0,0,0.5);
      cursor: grab;
    `
    return el
  }

  // Haal huidige positie van de drag-marker op
  function getDragLatLng(): { lat: number; lng: number } | null {
    if (!dragMarker.current) return null
    const { lat, lng } = dragMarker.current.getLngLat()
    return { lat, lng }
  }

  async function handleCreate(input: VenueInput) {
    const pos = getDragLatLng()
    const finalInput = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    await createVenue(finalInput)
    const newVenue: Venue = {
      id: crypto.randomUUID(),
      ...finalInput,
      photo_url: null,
      created_at: new Date().toISOString(),
    }
    dragMarker.current?.remove()
    dragMarker.current = null
    setVenues(v => [...v, newVenue])
  }

  async function handleUpdate(id: string, input: VenueInput) {
    const pos = getDragLatLng()
    const finalInput = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    await updateVenue(id, finalInput)
    dragMarker.current?.remove()
    dragMarker.current = null
    setVenues(v => v.map(venue => venue.id === id ? { ...venue, ...finalInput } : venue))
  }

  async function handleDelete(id: string) {
    await deleteVenue(id)
    dragMarker.current?.remove()
    dragMarker.current = null
    setVenues(v => v.filter(venue => venue.id !== id))
  }

  return (
    <div className="relative flex h-full w-full">
      <div
        ref={mapContainer}
        className="flex-1"
        style={{ cursor: addMode ? 'crosshair' : undefined }}
      />

      {!panel && (
        <button
          onClick={() => setAddMode(m => !m)}
          className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            addMode
              ? 'bg-violet-600 text-white ring-2 ring-violet-400'
              : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
          }`}
          style={{ cursor: addMode ? 'crosshair' : undefined }}
        >
          <Plus className="w-4 h-4" />
          {addMode ? 'Klik op de kaart...' : 'Venue toevoegen'}
        </button>
      )}

      <div className="absolute bottom-8 left-4 z-10 bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {venues.length} venues
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-gray-900/90 border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {(['bar', 'club', 'cafe'] as const).map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: TYPE_COLORS[type] }} />
            <span>{type === 'cafe' ? 'Café' : type === 'bar' ? 'Bar' : 'Club'}</span>
          </div>
        ))}
      </div>

      {panel?.mode === 'create' && (
        <VenuePanel
          key="create"
          mode="create"
          lat={panel.lat}
          lng={panel.lng}
          onSave={handleCreate}
          onClose={closePanel}
        />
      )}
      {panel?.mode === 'edit' && (
        <VenuePanel
          key={panel.venue.id}
          mode="edit"
          venue={panel.venue}
          onSave={(input) => handleUpdate(panel.venue.id, input)}
          onDelete={() => handleDelete(panel.venue.id)}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

// GeoJSON type declaraties
declare namespace GeoJSON {
  interface FeatureCollection { type: 'FeatureCollection'; features: Feature[] }
  interface Feature<G = Geometry> { type: 'Feature'; geometry: G; properties: Record<string, unknown> | null }
  type Geometry = { type: 'Point'; coordinates: number[] }
}
