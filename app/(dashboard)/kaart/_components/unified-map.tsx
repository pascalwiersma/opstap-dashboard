'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Venue, VenueInput } from '@/app/actions/venues'
import type { CityEvent, CityEventInput } from '@/app/actions/city-events'
import { createVenue, updateVenue, deleteVenue } from '@/app/actions/venues'
import { createCityEvent, updateCityEvent, deleteCityEvent } from '@/app/actions/city-events'
import { VenuePanel } from '../../venues/_components/venue-panel'
import { EventPanel } from '../../events/_components/event-panel'
import { MapPin, CalendarDays, Hexagon, X, Check, ChevronDown } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Kleuren
const VENUE_COLORS: Record<string, string> = {
  bar: '#f59e0b',
  club: '#8b5cf6',
  cafe: '#10b981',
  default: '#6b7280',
}
const EVENT_COLOR = '#0ea5e9'

type AddMode = 'venue' | 'event-point' | 'event-region' | null

type PanelState =
  | { kind: 'create-venue'; lat: number; lng: number }
  | { kind: 'edit-venue'; venue: Venue }
  | { kind: 'create-event-point'; lat: number; lng: number }
  | { kind: 'create-event-region'; polygon: [number, number][] }
  | { kind: 'edit-event'; event: CityEvent }
  | null

// --- GeoJSON builders ---

function venueGeoJSON(venues: Venue[], excludeId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: venues
      .filter(v => v.id !== excludeId)
      .map(v => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(v.lng), Number(v.lat)] },
        properties: { id: v.id, type: v.type ?? 'default' },
      })),
  }
}

function eventPointsGeoJSON(events: CityEvent[], excludeId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: events
      .filter(e => e.location_type === 'point' && e.lat != null && e.id !== excludeId)
      .map(e => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(e.lng), Number(e.lat)] },
        properties: { id: e.id, color: e.color ?? EVENT_COLOR },
      })),
  }
}

function eventRegionsGeoJSON(events: CityEvent[], excludeId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: events
      .filter(e => e.location_type === 'region' && e.polygon && e.polygon.length >= 3 && e.id !== excludeId)
      .map(e => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...e.polygon!, e.polygon![0]]],
        },
        properties: { id: e.id, color: e.color ?? EVENT_COLOR },
      })),
  }
}

function drawingGeoJSON(pts: [number, number][]) {
  if (pts.length === 0) return { type: 'FeatureCollection' as const, features: [] }
  const features: GeoJSON.Feature[] = []

  if (pts.length >= 2)
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} })

  if (pts.length >= 3) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [pts[pts.length - 1], pts[0]] },
      properties: {},
    })
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
      properties: {},
    })
  }

  for (const pt of pts)
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: pt }, properties: {} })

  return { type: 'FeatureCollection' as const, features }
}

declare namespace GeoJSON {
  interface Feature { type: 'Feature'; geometry: Geom; properties: Record<string, unknown> | null }
  type Geom =
    | { type: 'Point'; coordinates: number[] }
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'Polygon'; coordinates: number[][][] }
}

// ---

export function UnifiedMap({
  initialVenues,
  initialEvents,
}: {
  initialVenues: Venue[]
  initialEvents: CityEvent[]
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const dragMarker = useRef<mapboxgl.Marker | null>(null)

  const [venues, setVenues] = useState(initialVenues)
  const [events, setEvents] = useState(initialEvents)
  const [panel, setPanel] = useState<PanelState>(null)
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [drawingPts, setDrawingPts] = useState<[number, number][]>([])
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [draggedPos, setDraggedPos] = useState<{ lat: number; lng: number } | null>(null)

  const panelRef = useRef<PanelState>(null)
  const addModeRef = useRef<AddMode>(null)
  const drawingPtsRef = useRef<[number, number][]>([])
  const venuesRef = useRef(venues)
  const eventsRef = useRef(events)

  panelRef.current = panel
  addModeRef.current = addMode
  drawingPtsRef.current = drawingPts
  venuesRef.current = venues
  eventsRef.current = events

  // Source updaters
  const updVenues = useCallback((v: Venue[], ex?: string) => {
    const src = map.current?.getSource('venues') as mapboxgl.GeoJSONSource | undefined
    src?.setData(venueGeoJSON(v, ex))
  }, [])

  const updEventPts = useCallback((e: CityEvent[], ex?: string) => {
    const src = map.current?.getSource('event-points') as mapboxgl.GeoJSONSource | undefined
    src?.setData(eventPointsGeoJSON(e, ex))
  }, [])

  const updEventRegs = useCallback((e: CityEvent[], ex?: string) => {
    const src = map.current?.getSource('event-regions') as mapboxgl.GeoJSONSource | undefined
    src?.setData(eventRegionsGeoJSON(e, ex))
  }, [])

  const updDrawing = useCallback((pts: [number, number][]) => {
    const src = map.current?.getSource('drawing') as mapboxgl.GeoJSONSource | undefined
    src?.setData(drawingGeoJSON(pts))
  }, [])

  const closePanel = useCallback(() => {
    dragMarker.current?.remove()
    dragMarker.current = null
    setPanel(null)
    setAddMode(null)
    setDrawingPts([])
    setDraggedPos(null)
    updDrawing([])
    updVenues(venuesRef.current)
    updEventPts(eventsRef.current)
    updEventRegs(eventsRef.current)
  }, [updVenues, updEventPts, updEventRegs, updDrawing])

  const cancelDraw = useCallback(() => {
    setAddMode(null)
    setDrawingPts([])
    updDrawing([])
  }, [updDrawing])

  // Init map
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
      // Sources
      m.addSource('event-regions', { type: 'geojson', data: eventRegionsGeoJSON(eventsRef.current) })
      m.addSource('event-points', { type: 'geojson', data: eventPointsGeoJSON(eventsRef.current) })
      m.addSource('venues', { type: 'geojson', data: venueGeoJSON(venuesRef.current) })
      m.addSource('drawing', { type: 'geojson', data: drawingGeoJSON([]) })

      // Layers — event regions first (achterste laag)
      m.addLayer({
        id: 'event-regions-fill',
        type: 'fill',
        source: 'event-regions',
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], EVENT_COLOR] as unknown as string,
          'fill-opacity': 0.15,
        },
      })
      m.addLayer({
        id: 'event-regions-outline',
        type: 'line',
        source: 'event-regions',
        paint: {
          'line-color': ['coalesce', ['get', 'color'], EVENT_COLOR] as unknown as string,
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
      })

      // Drawing preview
      m.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: 'drawing',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': EVENT_COLOR, 'fill-opacity': 0.12 },
      })
      m.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': EVENT_COLOR, 'line-width': 1.5, 'line-dasharray': [3, 2] },
      })
      m.addLayer({
        id: 'drawing-dots',
        type: 'circle',
        source: 'drawing',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': EVENT_COLOR, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      })

      // Venue pins
      m.addLayer({
        id: 'venues-pins',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'match', ['get', 'type'],
            'bar', VENUE_COLORS.bar,
            'club', VENUE_COLORS.club,
            'cafe', VENUE_COLORS.cafe,
            VENUE_COLORS.default,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fff',
        },
      })

      // Event point pins (bovenste laag)
      m.addLayer({
        id: 'event-pins',
        type: 'circle',
        source: 'event-points',
        paint: {
          'circle-radius': 10,
          'circle-color': ['coalesce', ['get', 'color'], EVENT_COLOR] as unknown as string,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fff',
        },
      })

      // Cursor on hover
      const hoverLayers = ['venues-pins', 'event-pins', 'event-regions-fill']
      hoverLayers.forEach(layer => {
        m.on('mouseenter', layer, () => {
          if (!addModeRef.current) m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', layer, () => {
          if (!addModeRef.current) m.getCanvas().style.cursor = ''
        })
      })

      m.on('click', e => {
        const mode = addModeRef.current

        // Region drawing
        if (mode === 'event-region') {
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          const next = [...drawingPtsRef.current, pt]
          drawingPtsRef.current = next
          setDrawingPts(next)
          updDrawing(next)
          return
        }

        // Point add modes
        if (mode === 'venue') {
          const { lng, lat } = e.lngLat
          dragMarker.current?.remove()
          const el = makeDragEl(null)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'create-venue', lat, lng })
          setAddMode(null)
          setModeMenuOpen(false)
          return
        }

        if (mode === 'event-point') {
          const { lng, lat } = e.lngLat
          dragMarker.current?.remove()
          const el = makeDragEl(EVENT_COLOR, true)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'create-event-point', lat, lng })
          setAddMode(null)
          setModeMenuOpen(false)
          return
        }

        // Click on existing features
        const venuePinHits = m.queryRenderedFeatures(e.point, { layers: ['venues-pins'] })
        if (venuePinHits.length > 0) {
          const id = venuePinHits[0].properties?.id as string
          const v = venuesRef.current.find(x => x.id === id)
          if (!v) return
          dragMarker.current?.remove()
          updVenues(venuesRef.current, id)
          const el = makeDragEl(v.type)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([Number(v.lng), Number(v.lat)]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'edit-venue', venue: v })
          return
        }

        const eventPinHits = m.queryRenderedFeatures(e.point, { layers: ['event-pins'] })
        if (eventPinHits.length > 0) {
          const id = eventPinHits[0].properties?.id as string
          const ev = eventsRef.current.find(x => x.id === id)
          if (!ev) return
          dragMarker.current?.remove()
          updEventPts(eventsRef.current, id)
          const el = makeDragEl(ev.color ?? EVENT_COLOR, true)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([Number(ev.lng), Number(ev.lat)]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'edit-event', event: ev })
          return
        }

        const regionHits = m.queryRenderedFeatures(e.point, {
          layers: ['event-regions-fill', 'event-regions-outline'],
        })
        if (regionHits.length > 0) {
          const id = regionHits[0].properties?.id as string
          const ev = eventsRef.current.find(x => x.id === id)
          if (!ev) return
          updEventRegs(eventsRef.current, id)
          setPanel({ kind: 'edit-event', event: ev })
        }
      })
    })

    return () => {
      dragMarker.current?.remove()
      dragMarker.current = null
      m.remove()
      map.current = null
    }
  }, [updVenues, updEventPts, updEventRegs, updDrawing])

  // Sync sources on state change
  useEffect(() => {
    const exVenue = panelRef.current?.kind === 'edit-venue' ? panelRef.current.venue.id : undefined
    const exEvent = panelRef.current?.kind === 'edit-event' ? panelRef.current.event.id : undefined
    updVenues(venues, exVenue)
    updEventPts(events, exEvent)
    updEventRegs(events, exEvent)
  }, [venues, events, updVenues, updEventPts, updEventRegs])

  // Cursor
  useEffect(() => {
    if (!map.current) return
    map.current.getCanvas().style.cursor = addMode ? 'crosshair' : ''
  }, [addMode])

  function attachDragListener(marker: mapboxgl.Marker) {
    marker.on('drag', () => {
      const { lat, lng } = marker.getLngLat()
      setDraggedPos({ lat, lng })
    })
  }

  function makeDragEl(type: string | null, isHexColor = false): HTMLDivElement {
    const color = isHexColor ? (type ?? EVENT_COLOR) : (VENUE_COLORS[type ?? 'default'] ?? VENUE_COLORS.default)
    const el = document.createElement('div')
    el.style.cssText = `
      width: 22px; height: 22px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 0 0 2px ${color}55, 0 3px 10px rgba(0,0,0,0.5);
      cursor: grab;
    `
    return el
  }

  function getDragPos(): { lat: number; lng: number } | null {
    if (!dragMarker.current) return null
    const { lat, lng } = dragMarker.current.getLngLat()
    return { lat, lng }
  }

  function finishRegion() {
    if (drawingPts.length < 3) return
    setPanel({ kind: 'create-event-region', polygon: drawingPts })
    setAddMode(null)
    setDrawingPts([])
    updDrawing([])
  }

  // CRUD
  async function handleCreateVenue(input: VenueInput) {
    const pos = getDragPos()
    const final = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    const nv = await createVenue(final)
    dragMarker.current?.remove(); dragMarker.current = null
    setVenues(v => [...v, nv])
  }

  async function handleUpdateVenue(id: string, input: VenueInput) {
    const pos = getDragPos()
    const final = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    await updateVenue(id, final)
    dragMarker.current?.remove(); dragMarker.current = null
    setVenues(v => v.map(x => x.id === id ? { ...x, ...final } : x))
  }

  async function handleDeleteVenue(id: string) {
    await deleteVenue(id)
    dragMarker.current?.remove(); dragMarker.current = null
    setVenues(v => v.filter(x => x.id !== id))
  }

  async function handleCreateEvent(input: CityEventInput) {
    const pos = getDragPos()
    const final = input.location_type === 'point' && pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    const ne = await createCityEvent(final)
    dragMarker.current?.remove(); dragMarker.current = null
    setEvents(v => [...v, ne])
  }

  async function handleUpdateEvent(id: string, input: CityEventInput) {
    const pos = getDragPos()
    const final = input.location_type === 'point' && pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
    await updateCityEvent(id, final)
    dragMarker.current?.remove(); dragMarker.current = null
    setEvents(v => v.map(x => x.id === id ? { ...x, ...final } : x))
  }

  async function handleDeleteEvent(id: string) {
    await deleteCityEvent(id)
    dragMarker.current?.remove(); dragMarker.current = null
    setEvents(v => v.filter(x => x.id !== id))
  }

  const isDrawing = addMode === 'event-region'
  const canFinish = drawingPts.length >= 3

  return (
    <div className="relative flex h-full w-full">
      <div ref={mapContainer} className="flex-1" />

      {/* Toolbar */}
      {!panel && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {!isDrawing ? (
            <div className="flex flex-col gap-2">
              {/* Venue toevoegen */}
              <button
                onClick={() => setAddMode(m => m === 'venue' ? null : 'venue')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
                  addMode === 'venue'
                    ? 'bg-violet-600 text-white ring-2 ring-violet-400'
                    : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                {addMode === 'venue' ? 'Klik op de kaart...' : 'Venue toevoegen'}
              </button>

              {/* Event divider */}
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px flex-1 bg-gray-700" />
                <span className="text-xs text-gray-500">Evenement</span>
                <div className="h-px flex-1 bg-gray-700" />
              </div>

              {/* Event punt */}
              <button
                onClick={() => setAddMode(m => m === 'event-point' ? null : 'event-point')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
                  addMode === 'event-point'
                    ? 'ring-2 text-white'
                    : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
                }`}
                style={addMode === 'event-point' ? { backgroundColor: EVENT_COLOR } : {}}
              >
                <CalendarDays className="w-4 h-4" />
                {addMode === 'event-point' ? 'Klik op de kaart...' : 'Event punt'}
              </button>

              {/* Regio tekenen */}
              <button
                onClick={() => setAddMode('event-region')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700"
              >
                <Hexagon className="w-4 h-4" />
                Regio tekenen
              </button>
            </div>
          ) : (
            /* Drawing controls */
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3 flex flex-col gap-2 min-w-52">
              <p className="text-xs text-gray-400 font-medium">Regio tekenen</p>
              <p className="text-xs text-gray-500">
                {drawingPts.length === 0
                  ? 'Klik op de kaart om punten te plaatsen'
                  : drawingPts.length < 3
                  ? `${drawingPts.length} punt${drawingPts.length === 1 ? '' : 'en'} — minimaal 3 nodig`
                  : `${drawingPts.length} punten — klaar om af te ronden`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const next = drawingPts.slice(0, -1)
                    setDrawingPts(next)
                    updDrawing(next)
                  }}
                  disabled={drawingPts.length === 0}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Ongedaan
                </button>
                <button
                  onClick={cancelDraw}
                  className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={finishRegion}
                disabled={!canFinish}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  canFinish
                    ? 'text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                style={canFinish ? { backgroundColor: EVENT_COLOR } : {}}
              >
                <Check className="w-4 h-4" />
                Regio afronden
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tellers */}
      <div className="absolute bottom-8 left-4 z-10 flex gap-2">
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
          {venues.length} venues
        </div>
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
          {events.length} evenement{events.length !== 1 ? 'en' : ''}
        </div>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-gray-900/90 border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {(['bar', 'club', 'cafe'] as const).map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: VENUE_COLORS[t] }} />
            <span>{t === 'cafe' ? 'Café' : t === 'bar' ? 'Bar' : 'Club'}</span>
          </div>
        ))}
        <div className="w-px h-3 bg-gray-700" />
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: EVENT_COLOR }} />
          <span>Evenement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded border" style={{ background: `${EVENT_COLOR}25`, borderColor: EVENT_COLOR }} />
          <span>Regio</span>
        </div>
      </div>

      {/* Panels */}
      {panel?.kind === 'create-venue' && (
        <VenuePanel
          key="create-venue"
          mode="create"
          lat={panel.lat}
          lng={panel.lng}
          dragPos={draggedPos ?? undefined}
          onSave={handleCreateVenue}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'edit-venue' && (
        <VenuePanel
          key={panel.venue.id}
          mode="edit"
          venue={panel.venue}
          dragPos={draggedPos ?? undefined}
          onSave={input => handleUpdateVenue(panel.venue.id, input)}
          onDelete={() => handleDeleteVenue(panel.venue.id)}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'create-event-point' && (
        <EventPanel
          key="create-event-point"
          mode="create"
          locationSnap={{ lat: panel.lat, lng: panel.lng }}
          dragPos={draggedPos ?? undefined}
          onSave={handleCreateEvent}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'create-event-region' && (
        <EventPanel
          key="create-event-region"
          mode="create"
          polygon={panel.polygon}
          onSave={handleCreateEvent}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'edit-event' && (
        <EventPanel
          key={panel.event.id}
          mode="edit"
          event={panel.event}
          dragPos={draggedPos ?? undefined}
          onSave={input => handleUpdateEvent(panel.event.id, input)}
          onDelete={() => handleDeleteEvent(panel.event.id)}
          onClose={closePanel}
        />
      )}
    </div>
  )
}
