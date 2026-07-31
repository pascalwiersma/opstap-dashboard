'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Uitgaansgebied } from '@/app/actions/uitgaansgebieden'

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

function buildCirkelsGeoJSON(gebieden: Uitgaansgebied[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: gebieden.map(g => ({
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [cirkelPolygon(Number(g.centrum_lat), Number(g.centrum_lng), Number(g.radius_km))] },
      properties: { id: g.id, actief: g.actief },
    })),
  }
}

function buildPuntenGeoJSON(gebieden: Uitgaansgebied[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: gebieden.map(g => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(g.centrum_lng), Number(g.centrum_lat)] },
      properties: { id: g.id, naam: g.naam, radius_km: g.radius_km, actief: g.actief },
    })),
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

export function UitgaansgebiedenMap({ gebieden, onSelect }: { gebieden: Uitgaansgebied[]; onSelect: (gebied: Uitgaansgebied) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const gebiedenRef = useRef<Uitgaansgebied[]>(gebieden)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    gebiedenRef.current = gebieden
    onSelectRef.current = onSelect
  }, [gebieden, onSelect])

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
      m.addSource('gebieden-punten', { type: 'geojson', data: buildPuntenGeoJSON(gebiedenRef.current) })

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
      m.addLayer({
        id: 'gebieden-punten-pin',
        type: 'circle',
        source: 'gebieden-punten',
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['get', 'actief'], '#7c3aed', '#6b7280'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      m.addLayer({
        id: 'gebieden-punten-label',
        type: 'symbol',
        source: 'gebieden-punten',
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

      const bounds = boundsVanGebieden(gebiedenRef.current)
      if (bounds) m.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 })

      const klikbareLagen = ['gebieden-cirkels-fill', 'gebieden-punten-pin']

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

    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Sync data wanneer gebieden wijzigen (na toevoegen/bewerken/verwijderen)
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const cirkelBron = m.getSource('gebieden-cirkels') as mapboxgl.GeoJSONSource | undefined
    const puntenBron = m.getSource('gebieden-punten') as mapboxgl.GeoJSONSource | undefined
    cirkelBron?.setData(buildCirkelsGeoJSON(gebieden))
    puntenBron?.setData(buildPuntenGeoJSON(gebieden))
  }, [gebieden])

  return <div ref={mapContainer} className="w-full h-[420px] rounded-xl overflow-hidden border border-gray-800" />
}

// GeoJSON type declaraties
interface GeoJsonFeatureCollection { type: 'FeatureCollection'; features: GeoJsonFeature[] }
interface GeoJsonFeature<G = GeoJsonGeometry> { type: 'Feature'; geometry: G; properties: Record<string, unknown> | null }
type GeoJsonGeometry = { type: 'Point'; coordinates: number[] } | { type: 'Polygon'; coordinates: number[][][] }
