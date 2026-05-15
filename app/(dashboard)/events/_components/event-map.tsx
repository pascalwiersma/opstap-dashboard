'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { CityEvent, CityEventInput } from '@/app/actions/city-events'
import { createCityEvent, updateCityEvent, deleteCityEvent } from '@/app/actions/city-events'
import { EventPanel } from './event-panel'
import { MapPin, Hexagon, X, Check } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const EVENT_COLOR = '#f59e0b'
const REGION_COLOR = '#f59e0b'

type AddMode = 'point' | 'region' | null

type PanelState =
  | { mode: 'create-point'; lat: number; lng: number }
  | { mode: 'create-region'; polygon: [number, number][] }
  | { mode: 'edit'; event: CityEvent }
  | null

// --- GeoJSON helpers ---

function buildPointsGeoJSON(events: CityEvent[], excludeId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: events
      .filter(e => e.location_type === 'point' && e.id !== excludeId)
      .map(e => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(e.lng), Number(e.lat)] },
        properties: { id: e.id },
      })),
  }
}

function buildRegionsGeoJSON(events: CityEvent[], excludeId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: events
      .filter(e => e.location_type === 'region' && e.polygon && e.id !== excludeId)
      .map(e => {
        const ring = [...e.polygon!, e.polygon![0]]
        return {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: { id: e.id },
        }
      }),
  }
}

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>

function buildDrawingGeoJSON(points: [number, number][]): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  if (points.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }
  const features: GeoFeature[] = []

  if (points.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
      properties: {},
    })
  }

  if (points.length >= 3) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [points[points.length - 1], points[0]],
      },
      properties: { dashed: true },
    })
  }

  for (const pt of points) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pt },
      properties: {},
    })
  }

  return { type: 'FeatureCollection', features }
}

export function EventMap({ initialEvents }: { initialEvents: CityEvent[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const dragMarker = useRef<mapboxgl.Marker | null>(null)
  const eventsRef = useRef<CityEvent[]>(initialEvents)

  const [events, setEvents] = useState<CityEvent[]>(initialEvents)
  const [panel, setPanel] = useState<PanelState>(null)
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([])

  const addModeRef = useRef<AddMode>(null)
  const drawingPointsRef = useRef<[number, number][]>([])
  const panelRef = useRef<PanelState>(null)

  addModeRef.current = addMode
  drawingPointsRef.current = drawingPoints
  eventsRef.current = events
  panelRef.current = panel

  const updatePointsSource = useCallback((list: CityEvent[], excludeId?: string) => {
    const src = map.current?.getSource('city-events-points') as mapboxgl.GeoJSONSource | undefined
    src?.setData(buildPointsGeoJSON(list, excludeId))
  }, [])

  const updateRegionsSource = useCallback((list: CityEvent[], excludeId?: string) => {
    const src = map.current?.getSource('city-events-regions') as mapboxgl.GeoJSONSource | undefined
    src?.setData(buildRegionsGeoJSON(list, excludeId))
  }, [])

  const updateDrawingSource = useCallback((points: [number, number][]) => {
    const src = map.current?.getSource('drawing') as mapboxgl.GeoJSONSource | undefined
    src?.setData(buildDrawingGeoJSON(points))
  }, [])

  const closePanel = useCallback(() => {
    dragMarker.current?.remove()
    dragMarker.current = null
    setPanel(null)
    setAddMode(null)
    setDrawingPoints([])
    updateDrawingSource([])
    updatePointsSource(eventsRef.current)
    updateRegionsSource(eventsRef.current)
  }, [updatePointsSource, updateRegionsSource, updateDrawingSource])

  const cancelDrawing = useCallback(() => {
    setAddMode(null)
    setDrawingPoints([])
    updateDrawingSource([])
    if (map.current) map.current.getCanvas().style.cursor = ''
  }, [updateDrawingSource])

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
      // --- Sources ---
      m.addSource('city-events-points', {
        type: 'geojson',
        data: buildPointsGeoJSON(eventsRef.current),
      })
      m.addSource('city-events-regions', {
        type: 'geojson',
        data: buildRegionsGeoJSON(eventsRef.current),
      })
      m.addSource('drawing', {
        type: 'geojson',
        data: buildDrawingGeoJSON([]),
      })

      // --- Layers: regions ---
      m.addLayer({
        id: 'city-events-regions-fill',
        type: 'fill',
        source: 'city-events-regions',
        paint: {
          'fill-color': REGION_COLOR,
          'fill-opacity': 0.18,
        },
      })
      m.addLayer({
        id: 'city-events-regions-outline',
        type: 'line',
        source: 'city-events-regions',
        paint: {
          'line-color': REGION_COLOR,
          'line-width': 2.5,
          'line-opacity': 0.85,
        },
      })

      // --- Layers: points ---
      m.addLayer({
        id: 'city-events-pins',
        type: 'circle',
        source: 'city-events-points',
        paint: {
          'circle-radius': 9,
          'circle-color': EVENT_COLOR,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      // --- Layers: drawing ---
      m.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': EVENT_COLOR,
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      })
      m.addLayer({
        id: 'drawing-dots',
        type: 'circle',
        source: 'drawing',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': EVENT_COLOR,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // --- Cursor on hover ---
      const hoverLayers = ['city-events-pins', 'city-events-regions-fill']
      hoverLayers.forEach(layer => {
        m.on('mouseenter', layer, () => {
          if (!addModeRef.current) m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', layer, () => {
          if (!addModeRef.current) m.getCanvas().style.cursor = ''
        })
      })

      // --- Click handler ---
      m.on('click', (e) => {
        const mode = addModeRef.current

        // Region draw mode: add point
        if (mode === 'region') {
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          const next = [...drawingPointsRef.current, pt]
          drawingPointsRef.current = next
          setDrawingPoints(next)
          updateDrawingSource(next)
          return
        }

        // Point add mode: place marker
        if (mode === 'point') {
          const { lng, lat } = e.lngLat
          dragMarker.current?.remove()
          const el = makeDragEl()
          const marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat])
            .addTo(m)
          dragMarker.current = marker
          setPanel({ mode: 'create-point', lat, lng })
          setAddMode(null)
          return
        }

        // No add mode: check if clicking an existing event
        const pinFeatures = m.queryRenderedFeatures(e.point, { layers: ['city-events-pins'] })
        if (pinFeatures.length > 0) {
          const id = pinFeatures[0].properties?.id as string
          const ev = eventsRef.current.find(v => v.id === id)
          if (!ev) return
          dragMarker.current?.remove()
          updatePointsSource(eventsRef.current, id)
          const el = makeDragEl()
          const marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([Number(ev.lng), Number(ev.lat)])
            .addTo(m)
          dragMarker.current = marker
          setPanel({ mode: 'edit', event: ev })
          return
        }

        const regionFeatures = m.queryRenderedFeatures(e.point, {
          layers: ['city-events-regions-fill', 'city-events-regions-outline'],
        })
        if (regionFeatures.length > 0) {
          const id = regionFeatures[0].properties?.id as string
          const ev = eventsRef.current.find(v => v.id === id)
          if (!ev) return
          updateRegionsSource(eventsRef.current, id)
          setPanel({ mode: 'edit', event: ev })
        }
      })
    })

    return () => {
      dragMarker.current?.remove()
      dragMarker.current = null
      m.remove()
      map.current = null
    }
  }, [updatePointsSource, updateRegionsSource, updateDrawingSource])

  // Sync sources when events change
  useEffect(() => {
    const excludeId = panelRef.current?.mode === 'edit' ? panelRef.current.event.id : undefined
    updatePointsSource(events, excludeId)
    updateRegionsSource(events, excludeId)
  }, [events, updatePointsSource, updateRegionsSource])

  // Cursor style on map
  useEffect(() => {
    if (!map.current) return
    map.current.getCanvas().style.cursor =
      addMode === 'point' || addMode === 'region' ? 'crosshair' : ''
  }, [addMode])

  function makeDragEl(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      width: 22px; height: 22px; border-radius: 50%;
      background: ${EVENT_COLOR}; border: 3px solid white;
      box-shadow: 0 0 0 2px ${EVENT_COLOR}55, 0 3px 10px rgba(0,0,0,0.5);
      cursor: grab;
    `
    return el
  }

  function getDragLatLng(): { lat: number; lng: number } | null {
    if (!dragMarker.current) return null
    const { lat, lng } = dragMarker.current.getLngLat()
    return { lat, lng }
  }

  function finishRegion() {
    if (drawingPoints.length < 3) return
    setAddMode(null)
    updateDrawingSource([])
    setPanel({ mode: 'create-region', polygon: drawingPoints })
    setDrawingPoints([])
  }

  function undoLastPoint() {
    const next = drawingPoints.slice(0, -1)
    setDrawingPoints(next)
    updateDrawingSource(next)
  }

  async function handleCreate(input: CityEventInput) {
    const pos = getDragLatLng()
    const finalInput =
      input.location_type === 'point' && pos
        ? { ...input, lat: pos.lat, lng: pos.lng }
        : input
    await createCityEvent(finalInput)
    const newEvent: CityEvent = {
      id: crypto.randomUUID(),
      ...finalInput,
      created_at: new Date().toISOString(),
    }
    dragMarker.current?.remove()
    dragMarker.current = null
    setEvents(v => [...v, newEvent])
  }

  async function handleUpdate(id: string, input: CityEventInput) {
    const pos = getDragLatLng()
    const finalInput =
      input.location_type === 'point' && pos
        ? { ...input, lat: pos.lat, lng: pos.lng }
        : input
    await updateCityEvent(id, finalInput)
    dragMarker.current?.remove()
    dragMarker.current = null
    setEvents(v => v.map(ev => ev.id === id ? { ...ev, ...finalInput } : ev))
  }

  async function handleDelete(id: string) {
    await deleteCityEvent(id)
    dragMarker.current?.remove()
    dragMarker.current = null
    setEvents(v => v.filter(ev => ev.id !== id))
  }

  const isDrawing = addMode === 'region'
  const canFinish = drawingPoints.length >= 3

  return (
    <div className="relative flex h-full w-full">
      <div ref={mapContainer} className="flex-1" />

      {/* Toolbar (alleen zichtbaar als er geen paneel open is) */}
      {!panel && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {!isDrawing ? (
            <>
              <button
                onClick={() => setAddMode(m => m === 'point' ? null : 'point')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
                  addMode === 'point'
                    ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                    : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                {addMode === 'point' ? 'Klik op de kaart...' : 'Punt toevoegen'}
              </button>
              <button
                onClick={() => setAddMode('region')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700"
              >
                <Hexagon className="w-4 h-4" />
                Regio tekenen
              </button>
            </>
          ) : (
            /* Drawing controls */
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3 flex flex-col gap-2 min-w-48">
              <p className="text-xs text-gray-400">
                {drawingPoints.length === 0
                  ? 'Klik op de kaart om punten te plaatsen'
                  : drawingPoints.length < 3
                  ? `${drawingPoints.length} punt${drawingPoints.length === 1 ? '' : 'en'} — minimaal 3 nodig`
                  : `${drawingPoints.length} punten — klaar om af te ronden`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={undoLastPoint}
                  disabled={drawingPoints.length === 0}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Ongedaan
                </button>
                <button
                  onClick={cancelDrawing}
                  className="p-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={finishRegion}
                disabled={!canFinish}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  canFinish
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                Regio afronden
              </button>
            </div>
          )}
        </div>
      )}

      {/* Event count */}
      <div className="absolute bottom-8 left-4 z-10 bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {events.length} evenement{events.length !== 1 ? 'en' : ''}
      </div>

      {/* Legenda */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-gray-900/90 border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: EVENT_COLOR }} />
          <span>Punt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded border" style={{ background: `${REGION_COLOR}30`, borderColor: REGION_COLOR }} />
          <span>Regio</span>
        </div>
      </div>

      {/* Panels */}
      {panel?.mode === 'create-point' && (
        <EventPanel
          key="create-point"
          mode="create"
          locationSnap={{ lat: panel.lat, lng: panel.lng }}
          onSave={handleCreate}
          onClose={closePanel}
        />
      )}
      {panel?.mode === 'create-region' && (
        <EventPanel
          key="create-region"
          mode="create"
          polygon={panel.polygon}
          onSave={handleCreate}
          onClose={closePanel}
        />
      )}
      {panel?.mode === 'edit' && (
        <EventPanel
          key={panel.event.id}
          mode="edit"
          event={panel.event}
          onSave={(input) => handleUpdate(panel.event.id, input)}
          onDelete={() => handleDelete(panel.event.id)}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

declare namespace GeoJSON {
  interface FeatureCollection<G = Geometry> { type: 'FeatureCollection'; features: Feature<G>[] }
  interface Feature<G = Geometry> { type: 'Feature'; geometry: G; properties: Record<string, unknown> | null }
  type Geometry = { type: 'Point'; coordinates: number[] }
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'Polygon'; coordinates: number[][][] }
}
