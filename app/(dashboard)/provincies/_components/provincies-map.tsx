'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Province } from '@/app/actions/provinces'
import { createProvince, updateProvince, deleteProvince } from '@/app/actions/provinces'
import { PenLine, Trash2, Check, X } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const KLEUR = '#6366f1'

type PanelState =
  | { mode: 'create'; featureId: string }
  | { mode: 'edit'; province: Province; featureId: string }
  | null

export function ProvinciesMap({ initialProvinces }: { initialProvinces: Province[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const provincesRef = useRef<Province[]>(initialProvinces)

  const [provinces, setProvinces] = useState<Province[]>(initialProvinces)
  const [panel, setPanel] = useState<PanelState>(null)
  const [naam, setNaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [tekenModus, setTekenModus] = useState(false)

  provincesRef.current = provinces

  const tekenProvincies = useCallback((list: Province[], uitgeslotenId?: string) => {
    if (!draw.current) return
    draw.current.deleteAll()
    for (const p of list) {
      if (!p.polygon || p.id === uitgeslotenId) continue
      draw.current.add({
        type: 'Feature',
        id: p.id,
        geometry: { type: 'Polygon', coordinates: [p.polygon] },
        properties: { naam: p.name },
      })
    }
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [5.29, 52.15],
      zoom: 7,
    })
    map.current = m

    const d = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        { id: 'gl-draw-polygon-fill', type: 'fill', filter: ['all', ['==', '$type', 'Polygon']], paint: { 'fill-color': KLEUR, 'fill-opacity': 0.15 } },
        { id: 'gl-draw-polygon-stroke', type: 'line', filter: ['all', ['==', '$type', 'Polygon']], paint: { 'line-color': KLEUR, 'line-width': 2, 'line-opacity': 0.9 } },
        { id: 'gl-draw-polygon-fill-active', type: 'fill', filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']], paint: { 'fill-color': KLEUR, 'fill-opacity': 0.3 } },
        { id: 'gl-draw-polygon-stroke-active', type: 'line', filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']], paint: { 'line-color': KLEUR, 'line-width': 2.5 } },
        { id: 'gl-draw-point-midpoint', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']], paint: { 'circle-radius': 4, 'circle-color': KLEUR } },
        { id: 'gl-draw-point-vertex', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']], paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-color': KLEUR, 'circle-stroke-width': 2 } },
      ],
    })

    m.addControl(d as unknown as mapboxgl.IControl)
    m.addControl(new mapboxgl.NavigationControl(), 'top-right')
    draw.current = d

    m.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0]
      if (!feature || feature.geometry.type !== 'Polygon') return
      setPanel({ mode: 'create', featureId: feature.id as string })
      setNaam('')
      setTekenModus(false)
    })

    m.on('draw.selectionchange', (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length === 0) return
      const feature = e.features[0]
      if (!feature) return
      const province = provincesRef.current.find(p => p.id === feature.id)
      if (!province) return
      setPanel({ mode: 'edit', province, featureId: feature.id as string })
      setNaam(province.name)
    })

    m.on('load', () => {
      tekenProvincies(provincesRef.current)
    })

    return () => {
      draw.current = null
      m.remove()
      map.current = null
    }
  }, [tekenProvincies])

  useEffect(() => {
    if (panel !== null) return
    tekenProvincies(provinces)
  }, [provinces, panel, tekenProvincies])

  function annuleer() {
    if (panel?.mode === 'create' && draw.current) draw.current.delete(panel.featureId)
    if (panel?.mode === 'edit') tekenProvincies(provincesRef.current)
    setPanel(null)
    setNaam('')
    draw.current?.changeMode('simple_select')
    setTekenModus(false)
  }

  function startTekenen() {
    draw.current?.changeMode('draw_polygon')
    setTekenModus(true)
    setPanel(null)
  }

  function getPolygoon(featureId: string): [number, number][] | null {
    const feature = draw.current?.get(featureId)
    if (!feature || feature.geometry.type !== 'Polygon') return null
    return (feature.geometry as { type: 'Polygon'; coordinates: number[][][] }).coordinates[0] as [number, number][]
  }

  async function slaOp() {
    if (!naam.trim() || !panel) return
    setBezig(true)
    try {
      if (panel.mode === 'create') {
        const polygon = getPolygoon(panel.featureId)
        if (!polygon) return
        const nieuw = await createProvince(naam.trim(), polygon)
        draw.current?.delete(panel.featureId)
        setProvinces(prev => [...prev, nieuw])
      } else {
        const polygon = getPolygoon(panel.featureId) ?? (panel.province.polygon as [number, number][])
        await updateProvince(panel.province.id, naam.trim(), polygon)
        setProvinces(prev => prev.map(p => p.id === panel.province.id ? { ...p, name: naam.trim(), polygon } : p))
      }
      setPanel(null)
      setNaam('')
      draw.current?.changeMode('simple_select')
    } finally {
      setBezig(false)
    }
  }

  async function verwijder() {
    if (panel?.mode !== 'edit') return
    setBezig(true)
    try {
      await deleteProvince(panel.province.id)
      draw.current?.delete(panel.featureId)
      setProvinces(prev => prev.filter(p => p.id !== panel.province.id))
      setPanel(null)
      setNaam('')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="relative flex h-full w-full">
      <div ref={mapContainer} className="flex-1" />

      {!panel && (
        <button
          onClick={startTekenen}
          className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            tekenModus
              ? 'text-white ring-2 ring-indigo-400'
              : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
          }`}
          style={tekenModus ? { backgroundColor: KLEUR } : {}}
        >
          <PenLine className="w-4 h-4" />
          {tekenModus ? 'Teken de grens... (dubbelklik om af te ronden)' : 'Provincie tekenen'}
        </button>
      )}

      {panel && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {panel.mode === 'create' ? 'Nieuwe provincie' : 'Provincie bewerken'}
            </span>
            <button onClick={annuleer} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            value={naam}
            onChange={e => setNaam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && slaOp()}
            placeholder="Naam (bijv. Groningen)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={slaOp}
              disabled={bezig || !naam.trim()}
              className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: KLEUR }}
            >
              <Check className="w-4 h-4" />
              {bezig ? 'Opslaan...' : 'Opslaan'}
            </button>
            {panel.mode === 'edit' && (
              <button
                onClick={verwijder}
                disabled={bezig}
                className="flex items-center justify-center px-3 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-8 left-4 z-10 bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {provinces.length} provincie{provinces.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

declare namespace GeoJSON {
  interface Feature<G = Geometry> { type: 'Feature'; id?: string | number; geometry: G; properties: Record<string, unknown> | null }
  type Geometry = Point | Polygon
  interface Point { type: 'Point'; coordinates: number[] }
  interface Polygon { type: 'Polygon'; coordinates: number[][][] }
}
