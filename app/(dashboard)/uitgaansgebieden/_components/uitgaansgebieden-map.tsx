'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Uitgaansgebied } from '@/app/actions/uitgaansgebieden'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const AARDE_RADIUS_KM = 6371
const MIN_RADIUS_KM = 0.1

// Geodetische cirkel rond (lat, lng) met een gegeven straal in km, als gesloten polygoonring.
function cirkelPolygon(lat: number, lng: number, radiusKm: number, punten = 64): number[][] {
  const latRad = (lat * Math.PI) / 180
  const ring: number[][] = []
  for (let i = 0; i <= punten; i++) {
    const hoek = (i / punten) * 2 * Math.PI
    const dx = (radiusKm / AARDE_RADIUS_KM) * Math.cos(hoek)
    const dy = (radiusKm / AARDE_RADIUS_KM) * Math.sin(hoek)
    const puntLat = lat + (dy * 180) / Math.PI
    const puntLng = lng + ((dx * 180) / Math.PI) / Math.cos(latRad)
    ring.push([puntLng, puntLat])
  }
  return ring
}

// Punt exact oost van het centrum op de cirkelrand — waar de resize-handle staat.
function randPunt(lat: number, lng: number, radiusKm: number): [number, number] {
  const [lngPunt, latPunt] = cirkelPolygon(lat, lng, radiusKm, 4)[0]
  return [lngPunt, latPunt]
}

// Inverse van cirkelPolygon: straal (km) tussen centrum en een willekeurig punt, volgens dezelfde platte-aarde-benadering.
function radiusVanPunt(lat: number, lng: number, puntLat: number, puntLng: number): number {
  const latRad = (lat * Math.PI) / 180
  const dy = ((puntLat - lat) * Math.PI) / 180
  const dx = (((puntLng - lng) * Math.PI) / 180) * Math.cos(latRad)
  return AARDE_RADIUS_KM * Math.sqrt(dx * dx + dy * dy)
}

type Override = { id: string; lat?: number; lng?: number; radiusKm?: number }

// Bouwt de cirkel-GeoJSON, met optioneel een levend centrum/straal voor het gebied dat net wordt gesleept.
function buildCirkelsGeoJSON(gebieden: Uitgaansgebied[], override?: Override): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: gebieden.map(g => {
      const isOverride = override?.id === g.id
      const lat = isOverride && override.lat !== undefined ? override.lat : Number(g.centrum_lat)
      const lng = isOverride && override.lng !== undefined ? override.lng : Number(g.centrum_lng)
      const radiusKm = isOverride && override.radiusKm !== undefined ? override.radiusKm : Number(g.radius_km)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [cirkelPolygon(lat, lng, radiusKm)] },
        properties: { id: g.id, actief: g.actief },
      }
    }),
  }
}

function boundsVanGebieden(gebieden: Uitgaansgebied[]): mapboxgl.LngLatBounds | null {
  if (gebieden.length === 0) return null
  const bounds = new mapboxgl.LngLatBounds()
  for (const g of gebieden) {
    for (const [lng, lat] of cirkelPolygon(Number(g.centrum_lat), Number(g.centrum_lng), Number(g.radius_km), 16)) {
      bounds.extend([lng, lat])
    }
  }
  return bounds
}

function maakCentrumElement(gebied: Uitgaansgebied): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cursor = 'grab'
  el.style.position = 'relative'

  const dot = document.createElement('div')
  dot.className = 'opstap-gebied-marker-dot'
  dot.style.width = '14px'
  dot.style.height = '14px'
  dot.style.borderRadius = '9999px'
  dot.style.border = '2px solid #ffffff'
  dot.style.backgroundColor = gebied.actief ? '#7c3aed' : '#6b7280'
  dot.style.boxShadow = '0 0 4px rgba(0,0,0,0.6)'

  const label = document.createElement('span')
  label.className = 'opstap-gebied-marker-label'
  label.style.position = 'absolute'
  label.style.top = '100%'
  label.style.left = '50%'
  label.style.transform = 'translateX(-50%)'
  label.style.marginTop = '4px'
  label.style.whiteSpace = 'nowrap'
  label.style.fontSize = '12px'
  label.style.color = '#ffffff'
  label.style.textShadow = '0 0 2px #000000, 0 0 3px #000000'
  label.textContent = `${gebied.naam}  (${gebied.radius_km} km)`

  el.appendChild(dot)
  el.appendChild(label)
  return el
}

function updateCentrumElement(el: HTMLDivElement, gebied: Uitgaansgebied) {
  const dot = el.querySelector<HTMLDivElement>('.opstap-gebied-marker-dot')
  if (dot) dot.style.backgroundColor = gebied.actief ? '#7c3aed' : '#6b7280'
  const label = el.querySelector<HTMLSpanElement>('.opstap-gebied-marker-label')
  if (label) label.textContent = `${gebied.naam}  (${gebied.radius_km} km)`
}

function maakHandleElement(gebied: Uitgaansgebied): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '10px'
  el.style.height = '10px'
  el.style.borderRadius = '2px'
  el.style.border = '2px solid #ffffff'
  el.style.backgroundColor = gebied.actief ? '#a78bfa' : '#9ca3af'
  el.style.boxShadow = '0 0 4px rgba(0,0,0,0.6)'
  el.style.cursor = 'ew-resize'
  return el
}

function updateHandleElement(el: HTMLDivElement, gebied: Uitgaansgebied) {
  el.style.backgroundColor = gebied.actief ? '#a78bfa' : '#9ca3af'
}

export function UitgaansgebiedenMap({
  gebieden,
  onSelect,
  onGebiedChange,
  geselecteerdId,
}: {
  gebieden: Uitgaansgebied[]
  onSelect: (gebied: Uitgaansgebied) => void
  onGebiedChange: (gebied: Uitgaansgebied, updates: { centrum_lat?: number; centrum_lng?: number; radius_km?: number }) => void
  geselecteerdId?: string | null
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const gebiedenRef = useRef<Uitgaansgebied[]>(gebieden)
  const onSelectRef = useRef(onSelect)
  const onGebiedChangeRef = useRef(onGebiedChange)
  const vorigeSelectieRef = useRef<string | null>(null)
  const centrumMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const handleMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const sleeptId = useRef<string | null>(null)
  const nietGeklikt = useRef(false)

  useEffect(() => {
    gebiedenRef.current = gebieden
    onSelectRef.current = onSelect
    onGebiedChangeRef.current = onGebiedChange
  }, [gebieden, onSelect, onGebiedChange])

  function syncMarkers(m: mapboxgl.Map) {
    const huidigeIds = new Set(gebiedenRef.current.map(g => g.id))

    for (const [id, marker] of centrumMarkersRef.current) {
      if (!huidigeIds.has(id)) { marker.remove(); centrumMarkersRef.current.delete(id) }
    }
    for (const [id, marker] of handleMarkersRef.current) {
      if (!huidigeIds.has(id)) { marker.remove(); handleMarkersRef.current.delete(id) }
    }

    for (const gebied of gebiedenRef.current) {
      const lat = Number(gebied.centrum_lat)
      const lng = Number(gebied.centrum_lng)
      const radiusKm = Number(gebied.radius_km)

      const bestaandCentrum = centrumMarkersRef.current.get(gebied.id)
      if (bestaandCentrum) {
        updateCentrumElement(bestaandCentrum.getElement() as HTMLDivElement, gebied)
        if (sleeptId.current !== gebied.id) bestaandCentrum.setLngLat([lng, lat])
      } else {
        const el = maakCentrumElement(gebied)
        const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(m)

        marker.on('dragstart', () => {
          sleeptId.current = gebied.id
          nietGeklikt.current = true
          el.style.cursor = 'grabbing'
        })

        marker.on('drag', () => {
          const { lat: nLat, lng: nLng } = marker.getLngLat()
          const cirkelBron = m.getSource('gebieden-cirkels') as mapboxgl.GeoJSONSource | undefined
          cirkelBron?.setData(buildCirkelsGeoJSON(gebiedenRef.current, { id: gebied.id, lat: nLat, lng: nLng }))
          const handle = handleMarkersRef.current.get(gebied.id)
          const actueel = gebiedenRef.current.find(g => g.id === gebied.id) ?? gebied
          if (handle) handle.setLngLat(randPunt(nLat, nLng, Number(actueel.radius_km)))
        })

        marker.on('dragend', () => {
          sleeptId.current = null
          el.style.cursor = 'grab'
          const { lat: nLat, lng: nLng } = marker.getLngLat()
          const actueel = gebiedenRef.current.find(g => g.id === gebied.id) ?? gebied
          onGebiedChangeRef.current(actueel, { centrum_lat: nLat, centrum_lng: nLng })
          setTimeout(() => { nietGeklikt.current = false }, 0)
        })

        el.addEventListener('click', () => {
          if (nietGeklikt.current) return
          const actueel = gebiedenRef.current.find(g => g.id === gebied.id) ?? gebied
          onSelectRef.current(actueel)
        })

        centrumMarkersRef.current.set(gebied.id, marker)
      }

      const bestaandeHandle = handleMarkersRef.current.get(gebied.id)
      if (bestaandeHandle) {
        updateHandleElement(bestaandeHandle.getElement() as HTMLDivElement, gebied)
        if (sleeptId.current !== `${gebied.id}-radius`) bestaandeHandle.setLngLat(randPunt(lat, lng, radiusKm))
      } else {
        const el = maakHandleElement(gebied)
        const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'center' })
          .setLngLat(randPunt(lat, lng, radiusKm))
          .addTo(m)

        marker.on('dragstart', () => {
          sleeptId.current = `${gebied.id}-radius`
        })

        marker.on('drag', () => {
          const actueel = gebiedenRef.current.find(g => g.id === gebied.id) ?? gebied
          const centrumLat = Number(actueel.centrum_lat)
          const centrumLng = Number(actueel.centrum_lng)
          const { lat: pLat, lng: pLng } = marker.getLngLat()
          const nieuweRadius = Math.max(MIN_RADIUS_KM, radiusVanPunt(centrumLat, centrumLng, pLat, pLng))
          const cirkelBron = m.getSource('gebieden-cirkels') as mapboxgl.GeoJSONSource | undefined
          cirkelBron?.setData(buildCirkelsGeoJSON(gebiedenRef.current, { id: gebied.id, radiusKm: nieuweRadius }))
        })

        marker.on('dragend', () => {
          sleeptId.current = null
          const actueel = gebiedenRef.current.find(g => g.id === gebied.id) ?? gebied
          const centrumLat = Number(actueel.centrum_lat)
          const centrumLng = Number(actueel.centrum_lng)
          const { lat: pLat, lng: pLng } = marker.getLngLat()
          const nieuweRadius = Math.round(Math.max(MIN_RADIUS_KM, radiusVanPunt(centrumLat, centrumLng, pLat, pLng)) * 100) / 100
          marker.setLngLat(randPunt(centrumLat, centrumLng, nieuweRadius))
          onGebiedChangeRef.current(actueel, { radius_km: nieuweRadius })
        })

        handleMarkersRef.current.set(gebied.id, marker)
      }
    }
  }

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [5.2913, 52.1326],
      zoom: 6.5,
    })
    map.current = m

    m.addControl(new mapboxgl.NavigationControl(), 'top-right')

    m.on('load', () => {
      m.addSource('gebieden-cirkels', { type: 'geojson', data: buildCirkelsGeoJSON(gebiedenRef.current) })

      m.addLayer({
        id: 'gebieden-cirkels-fill',
        type: 'fill',
        source: 'gebieden-cirkels',
        paint: {
          'fill-color': ['case', ['get', 'actief'], '#7c3aed', '#6b7280'],
          'fill-opacity': 0.15,
        },
      })
      m.addLayer({
        id: 'gebieden-cirkels-lijn',
        type: 'line',
        source: 'gebieden-cirkels',
        paint: {
          'line-color': ['case', ['get', 'actief'], '#a78bfa', '#9ca3af'],
          'line-width': 2,
        },
      })

      syncMarkers(m)

      const bounds = boundsVanGebieden(gebiedenRef.current)
      if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 })

      const klikbareLagen = ['gebieden-cirkels-fill']

      m.on('click', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: klikbareLagen })
        if (features.length === 0) return
        const id = features[0].properties?.id as string
        const gebied = gebiedenRef.current.find(g => g.id === id)
        if (gebied) onSelectRef.current(gebied)
      })

      m.on('mouseenter', klikbareLagen, () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', klikbareLagen, () => { m.getCanvas().style.cursor = '' })
    })

    const centrumMarkers = centrumMarkersRef.current
    const handleMarkers = handleMarkersRef.current
    return () => {
      for (const marker of centrumMarkers.values()) marker.remove()
      for (const marker of handleMarkers.values()) marker.remove()
      centrumMarkers.clear()
      handleMarkers.clear()
      m.remove()
      map.current = null
    }
  }, [])

  // Sync data wanneer gebieden wijzigen (na toevoegen/bewerken/verwijderen/slepen)
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const cirkelBron = m.getSource('gebieden-cirkels') as mapboxgl.GeoJSONSource | undefined
    cirkelBron?.setData(buildCirkelsGeoJSON(gebieden))
    syncMarkers(m)
  }, [gebieden])

  // Zoom in op het geselecteerde gebied — vooral nodig bij een kleine (binnenstad-)radius,
  // die op de landelijke overzichtszoom onzichtbaar klein is naast het sleepstipje.
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    if (!geselecteerdId || geselecteerdId === vorigeSelectieRef.current) {
      vorigeSelectieRef.current = geselecteerdId ?? null
      return
    }
    vorigeSelectieRef.current = geselecteerdId
    const gebied = gebiedenRef.current.find(g => g.id === geselecteerdId)
    if (!gebied) return
    const bounds = boundsVanGebieden([gebied])
    if (bounds) m.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 600 })
  }, [geselecteerdId])

  return <div ref={mapContainer} className="w-full h-[420px] rounded-xl overflow-hidden border border-gray-800" />
}

// GeoJSON type declaraties
interface GeoJsonFeatureCollection { type: 'FeatureCollection'; features: GeoJsonFeature[] }
interface GeoJsonFeature<G = GeoJsonGeometry> { type: 'Feature'; geometry: G; properties: Record<string, unknown> | null }
type GeoJsonGeometry = { type: 'Polygon'; coordinates: number[][][] }
