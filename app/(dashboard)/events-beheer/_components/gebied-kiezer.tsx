'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Check, RotateCcw, Undo2 } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type Punt = [number, number]

function centroid(pts: Punt[]): { lat: number; lng: number } {
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
  return { lat, lng }
}

function buildPolygonGeoJSON(pts: Punt[]): GeoJSON.FeatureCollection {
  if (pts.length < 3) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
      properties: {},
    }],
  }
}

function buildLijnGeoJSON(pts: Punt[], voltooid: boolean): GeoJSON.FeatureCollection {
  if (pts.length < 2) return { type: 'FeatureCollection', features: [] }
  const coords = voltooid ? [...pts, pts[0]] : pts
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    }],
  }
}

function buildPuntenGeoJSON(pts: Punt[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pts.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: {},
    })),
  }
}

type Props = {
  cityCenter?: { lat: number; lng: number }
  onChange: (locatie: { lat: number; lng: number } | null) => void
}

export function GebiedKiezer({ cityCenter, onChange }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const puntRef = useRef<Punt[]>([])
  const voltooideRef = useRef(false)

  const [punten, setPunten] = useState<Punt[]>([])
  const [voltooid, setVoltooid] = useState(false)

  const updateSources = useCallback((pts: Punt[], done: boolean) => {
    const m = mapRef.current
    if (!m) return
    ;(m.getSource('polygon') as mapboxgl.GeoJSONSource)?.setData(buildPolygonGeoJSON(pts))
    ;(m.getSource('lijn') as mapboxgl.GeoJSONSource)?.setData(buildLijnGeoJSON(pts, done))
    ;(m.getSource('punten') as mapboxgl.GeoJSONSource)?.setData(buildPuntenGeoJSON(pts))
  }, [])

  useEffect(() => {
    if (!container.current || mapRef.current) return

    const center: [number, number] = cityCenter
      ? [cityCenter.lng, cityCenter.lat]
      : [5.2913, 52.1326]

    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: cityCenter ? 13 : 7,
    })
    mapRef.current = m
    m.addControl(new mapboxgl.NavigationControl(), 'top-right')

    m.on('load', () => {
      m.addSource('polygon', { type: 'geojson', data: buildPolygonGeoJSON([]) })
      m.addSource('lijn', { type: 'geojson', data: buildLijnGeoJSON([], false) })
      m.addSource('punten', { type: 'geojson', data: buildPuntenGeoJSON([]) })

      m.addLayer({ id: 'polygon-fill', type: 'fill', source: 'polygon',
        paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.2 } })
      m.addLayer({ id: 'polygon-outline', type: 'line', source: 'polygon',
        paint: { 'line-color': '#7c3aed', 'line-width': 2 } })
      m.addLayer({ id: 'lijn', type: 'line', source: 'lijn',
        paint: { 'line-color': '#7c3aed', 'line-width': 2, 'line-dasharray': [2, 2] } })
      m.addLayer({ id: 'punten', type: 'circle', source: 'punten',
        paint: { 'circle-radius': 5, 'circle-color': '#7c3aed', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })

      m.getCanvas().style.cursor = 'crosshair'

      m.on('click', (e) => {
        if (voltooideRef.current) return
        const pt: Punt = [e.lngLat.lng, e.lngLat.lat]
        const next = [...puntRef.current, pt]
        puntRef.current = next
        setPunten(next)
        updateSources(next, false)
      })
    })

    return () => {
      m.remove()
      mapRef.current = null
    }
  }, [cityCenter, updateSources])

  // Fly to city when it changes
  useEffect(() => {
    if (!cityCenter || !mapRef.current) return
    mapRef.current.flyTo({ center: [cityCenter.lng, cityCenter.lat], zoom: 13 })
  }, [cityCenter])

  function onAfronden() {
    if (punten.length < 3) return
    voltooideRef.current = true
    setVoltooid(true)
    updateSources(punten, true)
    mapRef.current?.getCanvas().setAttribute('style', 'cursor: default')
    onChange(centroid(punten))
  }

  function onOngedaan() {
    const next = punten.slice(0, -1)
    puntRef.current = next
    setPunten(next)
    updateSources(next, false)
  }

  function onOpnieuw() {
    puntRef.current = []
    voltooideRef.current = false
    setPunten([])
    setVoltooid(false)
    updateSources([], false)
    mapRef.current?.getCanvas().setAttribute('style', 'cursor: crosshair')
    onChange(null)
  }

  return (
    <div className="relative">
      <div ref={container} className="w-full h-72 rounded-xl overflow-hidden" />

      {/* Controls */}
      <div className="absolute top-3 left-3 z-10">
        {!voltooid ? (
          <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 flex flex-col gap-2 min-w-44 shadow-xl">
            <p className="text-xs text-gray-400">
              {punten.length === 0
                ? 'Klik op de kaart om het gebied te tekenen'
                : punten.length < 3
                ? `${punten.length} punt${punten.length === 1 ? '' : 'en'} — minimaal 3 nodig`
                : `${punten.length} punten — klaar om af te ronden`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onOngedaan}
                disabled={punten.length === 0}
                className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Ongedaan
              </button>
              <button
                onClick={onOpnieuw}
                disabled={punten.length === 0}
                className="p-1.5 rounded-lg text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                title="Opnieuw"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={onAfronden}
              disabled={punten.length < 3}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                punten.length >= 3
                  ? 'bg-opstap-orange-600 hover:bg-opstap-orange-500 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Afronden
            </button>
          </div>
        ) : (
          <button
            onClick={onOpnieuw}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-gray-900/95 border border-gray-700 text-gray-300 hover:text-white shadow-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Opnieuw tekenen
          </button>
        )}
      </div>
    </div>
  )
}

declare namespace GeoJSON {
  interface FeatureCollection { type: 'FeatureCollection'; features: Feature[] }
  interface Feature { type: 'Feature'; geometry: Geometry; properties: Record<string, unknown> | null }
  type Geometry =
    | { type: 'Point'; coordinates: number[] }
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'Polygon'; coordinates: number[][][] }
}
