'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Stad } from '@/app/actions/steden'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const AARDE_RADIUS_KM = 6371

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

function buildCirkelsGeoJSON(steden: Stad[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: steden.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [cirkelPolygon(Number(s.lat), Number(s.lng), Number(s.radius_km))] },
      properties: { id: s.id, actief: s.actief },
    })),
  }
}

function buildPuntenGeoJSON(steden: Stad[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: steden.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(s.lng), Number(s.lat)] },
      properties: { id: s.id, naam: s.naam, radius_km: s.radius_km, actief: s.actief },
    })),
  }
}

function boundsVanSteden(steden: Stad[]): mapboxgl.LngLatBounds | null {
  if (steden.length === 0) return null
  const bounds = new mapboxgl.LngLatBounds()
  for (const s of steden) {
    for (const [lng, lat] of cirkelPolygon(Number(s.lat), Number(s.lng), Number(s.radius_km), 16)) {
      bounds.extend([lng, lat])
    }
  }
  return bounds
}

export function StedenMap({ steden, onSelect }: { steden: Stad[]; onSelect: (stad: Stad) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const stedenRef = useRef<Stad[]>(steden)
  const onSelectRef = useRef(onSelect)
  stedenRef.current = steden
  onSelectRef.current = onSelect

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
      m.addSource('steden-cirkels', { type: 'geojson', data: buildCirkelsGeoJSON(stedenRef.current) })
      m.addSource('steden-punten', { type: 'geojson', data: buildPuntenGeoJSON(stedenRef.current) })

      m.addLayer({
        id: 'steden-cirkels-fill',
        type: 'fill',
        source: 'steden-cirkels',
        paint: {
          'fill-color': ['case', ['get', 'actief'], '#7c3aed', '#6b7280'],
          'fill-opacity': 0.15,
        },
      })
      m.addLayer({
        id: 'steden-cirkels-lijn',
        type: 'line',
        source: 'steden-cirkels',
        paint: {
          'line-color': ['case', ['get', 'actief'], '#a78bfa', '#9ca3af'],
          'line-width': 2,
        },
      })
      m.addLayer({
        id: 'steden-punten-pin',
        type: 'circle',
        source: 'steden-punten',
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['get', 'actief'], '#7c3aed', '#6b7280'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      m.addLayer({
        id: 'steden-punten-label',
        type: 'symbol',
        source: 'steden-punten',
        layout: {
          'text-field': ['concat', ['get', 'naam'], '  (', ['get', 'radius_km'], ' km)'],
          'text-size': 12,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.2,
        },
      })

      const bounds = boundsVanSteden(stedenRef.current)
      if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 })

      const klikbareLagen = ['steden-cirkels-fill', 'steden-punten-pin']

      m.on('click', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: klikbareLagen })
        if (features.length === 0) return
        const id = features[0].properties?.id as string
        const stad = stedenRef.current.find(s => s.id === id)
        if (stad) onSelectRef.current(stad)
      })

      m.on('mouseenter', klikbareLagen, () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', klikbareLagen, () => { m.getCanvas().style.cursor = '' })
    })

    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Sync data wanneer steden wijzigen (na toevoegen/bewerken/verwijderen)
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const cirkelBron = m.getSource('steden-cirkels') as mapboxgl.GeoJSONSource | undefined
    const puntenBron = m.getSource('steden-punten') as mapboxgl.GeoJSONSource | undefined
    cirkelBron?.setData(buildCirkelsGeoJSON(steden))
    puntenBron?.setData(buildPuntenGeoJSON(steden))
  }, [steden])

  return <div ref={mapContainer} className="w-full h-[420px] rounded-xl overflow-hidden border border-gray-800" />
}

// GeoJSON type declaraties
declare namespace GeoJSON {
  interface FeatureCollection { type: 'FeatureCollection'; features: Feature[] }
  interface Feature<G = Geometry> { type: 'Feature'; geometry: G; properties: Record<string, unknown> | null }
  type Geometry = { type: 'Point'; coordinates: number[] } | { type: 'Polygon'; coordinates: number[][][] }
}
