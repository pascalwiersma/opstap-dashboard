'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Venue, VenueInput } from '@/app/actions/venues'
import type { CityEvent, CityEventInput } from '@/app/actions/city-events'
import type { MeetingArea } from '@/app/actions/meeting-areas'
import type { ZoneCategorie } from '@/app/lib/zone-utils'
import type { Province } from '@/app/actions/provinces'
import { createVenue, updateVenue, deleteVenue } from '@/app/actions/venues'
import { createCityEvent, updateCityEvent, deleteCityEvent } from '@/app/actions/city-events'
import { createMeetingArea, updateMeetingArea, deleteMeetingArea } from '@/app/actions/meeting-areas'
import { ZONE_CATEGORIEEN, zonekleur } from '@/app/lib/zone-utils'
import { VenuePanel } from '../../venues/_components/venue-panel'
import { EventPanel } from '../../events/_components/event-panel'
import { MapPin, CalendarDays, Hexagon, X, Check, PenLine, Trash2, Layers } from 'lucide-react'
import { pointInPolygon, polygonCentroid } from '@/lib/geo'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const VENUE_COLORS: Record<string, string> = {
  bar: '#f59e0b',
  club: '#8b5cf6',
  cafe: '#10b981',
  default: '#6b7280',
}
const EVENT_COLOR = '#0ea5e9'
const MEETING_COLOR = '#f97316'

type AddMode = 'venue' | 'event-point' | 'event-region' | null

type PanelState =
  | { kind: 'create-venue'; lat: number; lng: number }
  | { kind: 'edit-venue'; venue: Venue }
  | { kind: 'create-event-point'; lat: number; lng: number }
  | { kind: 'create-event-region'; polygon: [number, number][] }
  | { kind: 'edit-event'; event: CityEvent }
  | null

type MeetingPanelState =
  | { mode: 'create'; featureId: string }
  | { mode: 'edit'; area: MeetingArea; featureId: string }
  | null

// --- GeoJSON builders ---

function meetingLabelsGeoJSON(areas: MeetingArea[]) {
  return {
    type: 'FeatureCollection' as const,
    features: areas.map(area => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [area.center_lng, area.center_lat] },
      properties: { naam: area.naam },
    })),
  }
}

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
  interface Feature { type: 'Feature'; id?: string | number; geometry: Geom; properties: Record<string, unknown> | null }
  type Geom =
    | { type: 'Point'; coordinates: number[] }
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'Polygon'; coordinates: number[][][] }
}

// ---

export function UnifiedMap({
  initialVenues,
  initialEvents,
  initialAreas,
  userProvinceId,
  userProvince,
  userRole,
}: {
  initialVenues: Venue[]
  initialEvents: CityEvent[]
  initialAreas: MeetingArea[]
  userProvinceId?: string | null
  userProvince?: Province | null
  userRole?: string
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const dragMarker = useRef<mapboxgl.Marker | null>(null)
  const draw = useRef<MapboxDraw | null>(null)

  const [venues, setVenues] = useState(initialVenues)
  const [events, setEvents] = useState(initialEvents)
  const [areas, setAreas] = useState<MeetingArea[]>(initialAreas)
  const [panel, setPanel] = useState<PanelState>(null)
  const [meetingPanel, setMeetingPanel] = useState<MeetingPanelState>(null)
  const [meetingNaam, setMeetingNaam] = useState('')
  const [meetingCategorie, setMeetingCategorie] = useState<ZoneCategorie>('overig')
  const [meetingBezig, setMeetingBezig] = useState(false)
  const [meetingTekenModus, setMeetingTekenModus] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [osmVisible, setOsmVisible] = useState(true)
  const [drawingPts, setDrawingPts] = useState<[number, number][]>([])
  const [draggedPos, setDraggedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [buitenGrens, setBuitenGrens] = useState(false)

  const panelRef = useRef<PanelState>(null)
  const addModeRef = useRef<AddMode>(null)
  const drawingPtsRef = useRef<[number, number][]>([])
  const venuesRef = useRef(venues)
  const eventsRef = useRef(events)
  const areasRef = useRef<MeetingArea[]>(areas)

  panelRef.current = panel
  addModeRef.current = addMode
  drawingPtsRef.current = drawingPts
  venuesRef.current = venues
  eventsRef.current = events
  areasRef.current = areas

  const updMeetingLabels = useCallback((a: MeetingArea[]) => {
    const src = map.current?.getSource('meeting-labels') as mapboxgl.GeoJSONSource | undefined
    src?.setData(meetingLabelsGeoJSON(a))
  }, [])

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

  const tekenGebieden = useCallback((areaList: MeetingArea[], uitgeslotenId?: string) => {
    if (!draw.current) return
    draw.current.deleteAll()
    for (const area of areaList) {
      if (!area.polygon || area.id === uitgeslotenId) continue
      draw.current.add({
        type: 'Feature',
        id: area.id,
        geometry: { type: 'Polygon', coordinates: [area.polygon] },
        properties: { naam: area.naam, active: area.active, kleur: zonekleur(area.categorie) },
      })
    }
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
      center: userProvince
        ? [userProvince.center_lng, userProvince.center_lat]
        : [6.5665, 53.2194],
      zoom: userProvince ? 11 : 15,
    })
    map.current = m

    const d = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
          paint: { 'fill-color': ['coalesce', ['get', 'user_kleur'], MEETING_COLOR], 'fill-opacity': 0.18 },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
          paint: { 'line-color': ['coalesce', ['get', 'user_kleur'], MEETING_COLOR], 'line-width': 2, 'line-opacity': 0.9 },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: { 'fill-color': ['coalesce', ['get', 'user_kleur'], MEETING_COLOR], 'fill-opacity': 0.35 },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: { 'line-color': ['coalesce', ['get', 'user_kleur'], MEETING_COLOR], 'line-width': 2.5, 'line-opacity': 1 },
        },
        {
          id: 'gl-draw-point-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: { 'circle-radius': 4, 'circle-color': MEETING_COLOR },
        },
        {
          id: 'gl-draw-point-vertex',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': MEETING_COLOR,
            'circle-stroke-width': 2,
          },
        },
      ],
    })

    m.addControl(d as unknown as mapboxgl.IControl)
    m.addControl(new mapboxgl.NavigationControl(), 'top-right')
    draw.current = d

    // Meeting area events (no need to wait for load)
    m.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0]
      if (!feature || feature.geometry.type !== 'Polygon') return
      if (userProvince?.polygon) {
        const ring = (feature.geometry as { type: 'Polygon'; coordinates: number[][][] }).coordinates[0] as [number, number][]
        const [cLng, cLat] = polygonCentroid(ring)
        if (!pointInPolygon(cLng, cLat, userProvince.polygon)) {
          draw.current?.delete(feature.id as string)
          setBuitenGrens(true)
          setTimeout(() => setBuitenGrens(false), 2500)
          return
        }
      }
      setMeetingPanel({ mode: 'create', featureId: feature.id as string })
      setMeetingNaam('')
      setMeetingTekenModus(false)
    })

    m.on('draw.selectionchange', (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length === 0) return
      const feature = e.features[0]
      if (!feature) return
      const area = areasRef.current.find(a => a.id === feature.id)
      if (!area) return
      setMeetingPanel({ mode: 'edit', area, featureId: feature.id as string })
      setMeetingNaam(area.naam)
      setMeetingCategorie(area.categorie ?? 'overig')
    })

    m.on('load', () => {
      m.addSource('event-regions', { type: 'geojson', data: eventRegionsGeoJSON(eventsRef.current) })
      m.addSource('event-points', { type: 'geojson', data: eventPointsGeoJSON(eventsRef.current) })
      m.addSource('venues', { type: 'geojson', data: venueGeoJSON(venuesRef.current) })
      m.addSource('drawing', { type: 'geojson', data: drawingGeoJSON([]) })
      m.addSource('meeting-labels', { type: 'geojson', data: meetingLabelsGeoJSON(areasRef.current) })

      // OSM referentielaag
      m.addSource('osm-horeca', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'osm-horeca-pins',
        type: 'circle',
        source: 'osm-horeca',
        paint: {
          'circle-radius': 4,
          'circle-color': '#ffffff',
          'circle-opacity': 0.3,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.5,
        },
      })
      m.addLayer({
        id: 'osm-horeca-labels',
        type: 'symbol',
        source: 'osm-horeca',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': 0.4,
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      })

      const overpassQuery = [
        '[out:json][timeout:15];',
        '(',
        'node["amenity"="bar"](53.17,6.50,53.27,6.64);',
        'node["amenity"="cafe"](53.17,6.50,53.27,6.64);',
        'node["amenity"="nightclub"](53.17,6.50,53.27,6.64);',
        'node["amenity"="pub"](53.17,6.50,53.27,6.64);',
        ');',
        'out body;',
      ].join('\n')

      fetch(`https://overpass-api.de/api/interpreter`, {
        method: 'POST',
        body: overpassQuery,
      })
        .then(r => r.json())
        .then((data: { elements: { type: string; lat: number; lon: number; tags?: Record<string, string> }[] }) => {
          const src = m.getSource('osm-horeca') as mapboxgl.GeoJSONSource | undefined
          if (!src) return
          src.setData({
            type: 'FeatureCollection',
            features: data.elements
              .filter(el => el.type === 'node')
              .map(el => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [el.lon, el.lat] },
                properties: { name: el.tags?.name ?? '', amenity: el.tags?.amenity ?? '' },
              })),
          })
        })
        .catch(() => { /* stil falen */ })

      if (userProvince?.polygon) {
        m.addSource('user-province', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [userProvince.polygon] },
            properties: {},
          },
        })
        m.addLayer({
          id: 'user-province-fill',
          type: 'fill',
          source: 'user-province',
          paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.06 },
        })
        m.addLayer({
          id: 'user-province-outline',
          type: 'line',
          source: 'user-province',
          paint: { 'line-color': '#6366f1', 'line-width': 2, 'line-dasharray': [5, 3] },
        })
      }

      tekenGebieden(areasRef.current)

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

      m.addLayer({
        id: 'meeting-labels-text',
        type: 'symbol',
        source: 'meeting-labels',
        layout: {
          'text-field': ['get', 'naam'],
          'text-size': 12,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'text-max-width': 10,
        },
        paint: {
          'text-color': MEETING_COLOR,
          'text-halo-color': '#111827',
          'text-halo-width': 1.5,
        },
      })

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
        const provincePoly = userProvince?.polygon ?? null

        const buiten = (lng: number, lat: number) => {
          if (!provincePoly) return false
          if (!pointInPolygon(lng, lat, provincePoly)) {
            setBuitenGrens(true)
            setTimeout(() => setBuitenGrens(false), 2500)
            return true
          }
          return false
        }

        if (mode === 'event-region') {
          const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          if (buiten(pt[0], pt[1])) return
          const next = [...drawingPtsRef.current, pt]
          drawingPtsRef.current = next
          setDrawingPts(next)
          updDrawing(next)
          return
        }

        if (mode === 'venue') {
          const { lng, lat } = e.lngLat
          if (buiten(lng, lat)) return
          dragMarker.current?.remove()
          const el = makeDragEl(null)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'create-venue', lat, lng })
          setAddMode(null)
          return
        }

        if (mode === 'event-point') {
          const { lng, lat } = e.lngLat
          if (buiten(lng, lat)) return
          dragMarker.current?.remove()
          const el = makeDragEl(EVENT_COLOR, true)
          dragMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat]).addTo(m)
          attachDragListener(dragMarker.current)
          setDraggedPos(null)
          setPanel({ kind: 'create-event-point', lat, lng })
          setAddMode(null)
          return
        }

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
      draw.current = null
      dragMarker.current?.remove()
      dragMarker.current = null
      m.remove()
      map.current = null
    }
  }, [updVenues, updEventPts, updEventRegs, updDrawing, tekenGebieden, updMeetingLabels])

  // Sync venue/event sources
  useEffect(() => {
    const exVenue = panelRef.current?.kind === 'edit-venue' ? panelRef.current.venue.id : undefined
    const exEvent = panelRef.current?.kind === 'edit-event' ? panelRef.current.event.id : undefined
    updVenues(venues, exVenue)
    updEventPts(events, exEvent)
    updEventRegs(events, exEvent)
  }, [venues, events, updVenues, updEventPts, updEventRegs])

  // Sync meeting areas — only when panel is closed, to preserve drawn/selected polygons
  useEffect(() => {
    if (meetingPanel !== null) return
    tekenGebieden(areas)
  }, [areas, meetingPanel, tekenGebieden])

  // Labels altijd synchroon houden
  useEffect(() => {
    updMeetingLabels(areas)
  }, [areas, updMeetingLabels])

  // Cursor
  useEffect(() => {
    if (!map.current) return
    map.current.getCanvas().style.cursor = addMode ? 'crosshair' : ''
  }, [addMode])

  const kanAreas = userRole === 'admin' || userRole === 'national'
  const provincePoly = userProvince?.polygon ?? null

  function attachDragListener(marker: mapboxgl.Marker) {
    marker.on('drag', () => {
      const { lat, lng } = marker.getLngLat()
      // Snap terug naar grens als marker buiten provincie gesleept wordt
      if (provincePoly && !pointInPolygon(lng, lat, provincePoly)) {
        setBuitenGrens(true)
        setTimeout(() => setBuitenGrens(false), 2000)
      }
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

  // Meeting area handlers
  function startMeetingTekenen() {
    setAddMode(null)
    setDrawingPts([])
    updDrawing([])
    setPanel(null)
    draw.current?.changeMode('draw_polygon')
    setMeetingTekenModus(true)
    setMeetingPanel(null)
  }

  function annuleerMeeting() {
    if (meetingPanel?.mode === 'create' && draw.current) {
      draw.current.delete(meetingPanel.featureId)
    }
    if (meetingPanel?.mode === 'edit') {
      tekenGebieden(areasRef.current)
    }
    setMeetingPanel(null)
    setMeetingNaam('')
    setMeetingCategorie('overig')
    draw.current?.changeMode('simple_select')
    setMeetingTekenModus(false)
  }

  function getHuidigePolygoon(featureId: string): [number, number][] | null {
    const feature = draw.current?.get(featureId)
    if (!feature || feature.geometry.type !== 'Polygon') return null
    const coords = (feature.geometry as { type: 'Polygon'; coordinates: number[][][] }).coordinates[0]
    return coords as [number, number][]
  }

  async function slaOpMeeting() {
    if (!meetingNaam.trim() || !meetingPanel) return
    setMeetingBezig(true)
    try {
      if (meetingPanel.mode === 'create') {
        const polygon = getHuidigePolygoon(meetingPanel.featureId)
        if (!polygon) return
        const nieuw = await createMeetingArea(meetingNaam.trim(), meetingCategorie, polygon, userProvinceId ?? null)
        draw.current?.delete(meetingPanel.featureId)
        setAreas(prev => [...prev, nieuw])
      } else {
        const polygon =
          getHuidigePolygoon(meetingPanel.featureId) ??
          (meetingPanel.area.polygon as [number, number][])
        await updateMeetingArea(meetingPanel.area.id, meetingNaam.trim(), meetingCategorie, polygon, meetingPanel.area.active)
        setAreas(prev =>
          prev.map(a =>
            a.id === meetingPanel.area.id ? { ...a, naam: meetingNaam.trim(), categorie: meetingCategorie, polygon } : a
          )
        )
      }
      setMeetingPanel(null)
      setMeetingNaam('')
      setMeetingCategorie('overig')
      draw.current?.changeMode('simple_select')
    } finally {
      setMeetingBezig(false)
    }
  }

  async function verwijderMeeting() {
    if (meetingPanel?.mode !== 'edit') return
    setMeetingBezig(true)
    try {
      await deleteMeetingArea(meetingPanel.area.id)
      draw.current?.delete(meetingPanel.featureId)
      setAreas(prev => prev.filter(a => a.id !== meetingPanel.area.id))
      setMeetingPanel(null)
      setMeetingNaam('')
    } finally {
      setMeetingBezig(false)
    }
  }

  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const vis = osmVisible ? 'visible' : 'none'
    if (m.getLayer('osm-horeca-pins')) m.setLayoutProperty('osm-horeca-pins', 'visibility', vis)
    if (m.getLayer('osm-horeca-labels')) m.setLayoutProperty('osm-horeca-labels', 'visibility', vis)
  }, [osmVisible])

  const isDrawing = addMode === 'event-region'
  const canFinish = drawingPts.length >= 3

  return (
    <div className="relative flex h-full w-full">
      <div ref={mapContainer} className="flex-1" />

      {/* Buiten-grens waarschuwing */}
      {buitenGrens && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900/95 border border-orange-500/40 text-orange-300 text-sm rounded-xl shadow-lg pointer-events-none">
          Klik binnen de grenzen van {userProvince?.name ?? 'jouw provincie'}
        </div>
      )}

      {/* Toolbar links — venues & events */}
      {!panel && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {!isDrawing && !meetingTekenModus ? (
            <div className="flex flex-col gap-2">
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

              <button
                onClick={() => setOsmVisible(v => !v)}
                title="OpenStreetMap horeca referentie aan/uit"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all border ${
                  osmVisible
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-900 text-gray-500 border-gray-700 hover:bg-gray-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                OSM horeca
              </button>

              <div className="flex items-center gap-2 mt-1">
                <div className="h-px flex-1 bg-gray-700" />
                <span className="text-xs text-gray-500">Evenement</span>
                <div className="h-px flex-1 bg-gray-700" />
              </div>

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

              <button
                onClick={() => setAddMode('event-region')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700"
              >
                <Hexagon className="w-4 h-4" />
                Regio tekenen
              </button>

              {kanAreas && (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-px flex-1 bg-gray-700" />
                    <span className="text-xs text-gray-500">Meeting</span>
                    <div className="h-px flex-1 bg-gray-700" />
                  </div>
                  <button
                    onClick={startMeetingTekenen}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700"
                  >
                    <PenLine className="w-4 h-4" />
                    Gebied tekenen
                  </button>
                </>
              )}
            </div>
          ) : isDrawing ? (
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
          ) : (
            /* Meeting gebied teken-indicator */
            <div className="bg-gray-900 border border-orange-700/50 rounded-xl shadow-lg p-3 flex flex-col gap-2 min-w-52">
              <p className="text-xs font-medium" style={{ color: MEETING_COLOR }}>Meeting gebied tekenen</p>
              <p className="text-xs text-gray-500">
                Klik punten op de kaart. Dubbelklik om het gebied af te ronden.
              </p>
              <button
                onClick={annuleerMeeting}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Annuleren
              </button>
            </div>
          )}
        </div>
      )}


      {/* Meeting gebied paneel — opslaan / bewerken (alleen admin/landelijk) */}
      {meetingPanel && kanAreas && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {meetingPanel.mode === 'create' ? 'Nieuw meeting gebied' : 'Gebied bewerken'}
            </span>
            <button onClick={annuleerMeeting} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            value={meetingNaam}
            onChange={e => setMeetingNaam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && slaOpMeeting()}
            placeholder="Naam (bijv. Vismarkt)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {ZONE_CATEGORIEEN.map(cat => (
              <button
                key={cat.value}
                onClick={() => setMeetingCategorie(cat.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  meetingCategorie === cat.value
                    ? 'text-white border-transparent'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
                style={meetingCategorie === cat.value ? { background: cat.kleur, borderColor: cat.kleur } : undefined}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={slaOpMeeting}
              disabled={meetingBezig || !meetingNaam.trim()}
              className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: zonekleur(meetingCategorie) }}
            >
              <Check className="w-4 h-4" />
              {meetingBezig ? 'Opslaan...' : 'Opslaan'}
            </button>
            {meetingPanel.mode === 'edit' && (
              <button
                onClick={verwijderMeeting}
                disabled={meetingBezig}
                className="flex items-center justify-center gap-1.5 px-3 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
          {areas.length} meeting{areas.length !== 1 ? 'gebieden' : 'gebied'}
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
        <div className="w-px h-3 bg-gray-700" />
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded border" style={{ background: `${MEETING_COLOR}30`, borderColor: MEETING_COLOR }} />
          <span>Meeting</span>
        </div>
      </div>

      {/* Venue / event panels */}
      {panel?.kind === 'create-venue' && (
        <VenuePanel
          key="create-venue"
          mode="create"
          lat={panel.lat}
          lng={panel.lng}
          dragPos={draggedPos ?? undefined}
          onSave={async (input: VenueInput) => {
            const pos = getDragPos()
            const final = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
            const nv = await createVenue({ ...final, province_id: userProvinceId ?? null })
            dragMarker.current?.remove(); dragMarker.current = null
            setVenues(v => [...v, nv])
          }}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'edit-venue' && (
        <VenuePanel
          key={panel.venue.id}
          mode="edit"
          venue={panel.venue}
          dragPos={draggedPos ?? undefined}
          onSave={async (input: VenueInput) => {
            if (panel.kind !== 'edit-venue') return
            const pos = getDragPos()
            const final = pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
            await updateVenue(panel.venue.id, final)
            dragMarker.current?.remove(); dragMarker.current = null
            setVenues(v => v.map(x => x.id === panel.venue.id ? { ...x, ...final } : x))
          }}
          onDelete={async () => {
            if (panel.kind !== 'edit-venue') return
            await deleteVenue(panel.venue.id)
            dragMarker.current?.remove(); dragMarker.current = null
            setVenues(v => v.filter(x => x.id !== panel.venue.id))
          }}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'create-event-point' && (
        <EventPanel
          key="create-event-point"
          mode="create"
          locationSnap={{ lat: panel.lat, lng: panel.lng }}
          dragPos={draggedPos ?? undefined}
          onSave={async (input: CityEventInput) => {
            const pos = getDragPos()
            const final = input.location_type === 'point' && pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
            const ne = await createCityEvent({ ...final, province_id: userProvinceId ?? null })
            dragMarker.current?.remove(); dragMarker.current = null
            setEvents(v => [...v, ne])
          }}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'create-event-region' && (
        <EventPanel
          key="create-event-region"
          mode="create"
          polygon={panel.polygon}
          onSave={async (input: CityEventInput) => {
            const ne = await createCityEvent({ ...input, province_id: userProvinceId ?? null })
            setEvents(v => [...v, ne])
          }}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'edit-event' && (
        <EventPanel
          key={panel.event.id}
          mode="edit"
          event={panel.event}
          dragPos={draggedPos ?? undefined}
          onSave={async (input: CityEventInput) => {
            if (panel.kind !== 'edit-event') return
            const pos = getDragPos()
            const final = input.location_type === 'point' && pos ? { ...input, lat: pos.lat, lng: pos.lng } : input
            await updateCityEvent(panel.event.id, final)
            dragMarker.current?.remove(); dragMarker.current = null
            setEvents(v => v.map(x => x.id === panel.event.id ? { ...x, ...final } : x))
          }}
          onDelete={async () => {
            if (panel.kind !== 'edit-event') return
            await deleteCityEvent(panel.event.id)
            dragMarker.current?.remove(); dragMarker.current = null
            setEvents(v => v.filter(x => x.id !== panel.event.id))
          }}
          onClose={closePanel}
        />
      )}
    </div>
  )
}
