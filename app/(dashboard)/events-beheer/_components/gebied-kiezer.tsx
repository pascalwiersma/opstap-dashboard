'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Check, RotateCcw, Undo2 } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type Punt = [number, number]

const KLEUR = '#f1a74e'
const GRONINGEN: [number, number] = [6.5665, 53.2194]

function centroid(pts: Punt[]): { lat: number; lng: number } {
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length
  return { lat, lng }
}

function buildPolygonGeoJSON(pts: Punt[]): GeoJsonFeatureCollection {
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

function buildLijnGeoJSON(pts: Punt[], voltooid: boolean): GeoJsonFeatureCollection {
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

function buildPuntenGeoJSON(pts: Punt[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pts.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: {},
    })),
  }
}

export type GetekendeLocatie = { lat: number; lng: number }

type Props = {
  initialCenter?: { lat: number; lng: number } | null
  onChange: (locatie: GetekendeLocatie | null) => void
}

export function GebiedKiezer({ initialCenter, onChange }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
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

  const startLat = initialCenter?.lat
  const startLng = initialCenter?.lng

  useEffect(() => {
    if (!container.current || mapRef.current) return

    const heeftStart = startLat != null && startLng != null
    const center: [number, number] = heeftStart ? [startLng!, startLat!] : GRONINGEN

    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: heeftStart ? 13 : 11,
    })
    mapRef.current = m
    m.addControl(new mapboxgl.NavigationControl(), 'top-right')

    m.on('load', () => {
      m.addSource('polygon', { type: 'geojson', data: buildPolygonGeoJSON([]) })
      m.addSource('lijn', { type: 'geojson', data: buildLijnGeoJSON([], false) })
      m.addSource('punten', { type: 'geojson', data: buildPuntenGeoJSON([]) })

      m.addLayer({
        id: 'polygon-fill', type: 'fill', source: 'polygon',
        paint: { 'fill-color': KLEUR, 'fill-opacity': 0.22 },
      })
      m.addLayer({
        id: 'polygon-outline', type: 'line', source: 'polygon',
        paint: { 'line-color': KLEUR, 'line-width': 2 },
      })
      m.addLayer({
        id: 'lijn', type: 'line', source: 'lijn',
        paint: { 'line-color': KLEUR, 'line-width': 2, 'line-dasharray': [2, 2] },
      })
      m.addLayer({
        id: 'punten', type: 'circle', source: 'punten',
        paint: {
          'circle-radius': 5,
          'circle-color': KLEUR,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      if (heeftStart) {
        markerRef.current = new mapboxgl.Marker({ color: KLEUR })
          .setLngLat([startLng!, startLat!])
          .addTo(m)
      }

      m.getCanvas().style.cursor = 'crosshair'

      m.on('click', (e) => {
        if (voltooideRef.current) return
        markerRef.current?.remove()
        markerRef.current = null
        const pt: Punt = [e.lngLat.lng, e.lngLat.lat]
        const next = [...puntRef.current, pt]
        puntRef.current = next
        setPunten(next)
        updateSources(next, false)
      })
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      m.remove()
      mapRef.current = null
    }
  }, [startLat, startLng, updateSources])

  function onAfronden() {
    if (punten.length < 3) return
    voltooideRef.current = true
    setVoltooid(true)
    updateSources(punten, true)
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'default'
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
    markerRef.current?.remove()
    markerRef.current = null
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'crosshair'
    onChange(null)
  }

  return (
    <div className="relative">
      <div ref={container} className="w-full h-72 rounded-xl overflow-hidden" />

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
                type="button"
                onClick={onOngedaan}
                disabled={punten.length === 0}
                className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Ongedaan
              </button>
              <button
                type="button"
                onClick={onOpnieuw}
                disabled={punten.length === 0}
                className="p-1.5 rounded-lg text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                title="Opnieuw"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
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
            type="button"
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

interface GeoJsonFeatureCollection { type: 'FeatureCollection'; features: GeoJsonFeature[] }
interface GeoJsonFeature { type: 'Feature'; geometry: GeoJsonGeometry; properties: Record<string, unknown> | null }
type GeoJsonGeometry =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'Polygon'; coordinates: number[][][] }
