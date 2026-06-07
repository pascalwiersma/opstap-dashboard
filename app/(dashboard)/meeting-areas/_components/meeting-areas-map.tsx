'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MeetingArea, ZoneCategorie } from '@/app/actions/meeting-areas'
import { createMeetingArea, updateMeetingArea, deleteMeetingArea, toggleMeetingArea, ZONE_CATEGORIEEN, zonekleur } from '@/app/actions/meeting-areas'
import { PenLine, Trash2, Check, X, Eye, EyeOff } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const INACTIEF_KLEUR = '#6b7280'  // grijs
const FALLBACK_KLEUR = '#f97316'  // oranje fallback

type PanelState =
  | { mode: 'create'; featureId: string }
  | { mode: 'edit'; area: MeetingArea; featureId: string }
  | null

export function MeetingAreasMap({ initialAreas }: { initialAreas: MeetingArea[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const areasRef = useRef<MeetingArea[]>(initialAreas)

  const [areas, setAreas] = useState<MeetingArea[]>(initialAreas)
  const [panel, setPanel] = useState<PanelState>(null)
  const [naam, setNaam] = useState('')
  const [categorie, setCategorie] = useState<ZoneCategorie>('overig')
  const [bezig, setBezig] = useState(false)
  const [tekenModus, setTekenModus] = useState(false)

  areasRef.current = areas

  // Teken alle gebieden op de kaart
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

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [6.5665, 53.2194],
      zoom: 14,
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
          paint: { 'fill-color': ['coalesce', ['get', 'user_kleur'], FALLBACK_KLEUR], 'fill-opacity': 0.2 },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
          paint: { 'line-color': ['coalesce', ['get', 'user_kleur'], FALLBACK_KLEUR], 'line-width': 2, 'line-opacity': 0.9 },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: { 'fill-color': ['coalesce', ['get', 'user_kleur'], FALLBACK_KLEUR], 'fill-opacity': 0.35 },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: { 'line-color': ['coalesce', ['get', 'user_kleur'], FALLBACK_KLEUR], 'line-width': 2.5, 'line-opacity': 1 },
        },
        {
          id: 'gl-draw-point-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: { 'circle-radius': 4, 'circle-color': FALLBACK_KLEUR },
        },
        {
          id: 'gl-draw-point-vertex',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
          paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-color': FALLBACK_KLEUR, 'circle-stroke-width': 2 },
        },
      ],
    })

    m.addControl(d as unknown as mapboxgl.IControl)
    m.addControl(new mapboxgl.NavigationControl(), 'top-right')
    draw.current = d

    m.on('load', () => {
      tekenGebieden(areasRef.current)
    })

    // Nieuw gebied getekend
    m.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0]
      if (!feature || feature.geometry.type !== 'Polygon') return
      setPanel({ mode: 'create', featureId: feature.id as string })
      setNaam('')
      setTekenModus(false)
    })

    // Klik op bestaand gebied → edit modus
    m.on('draw.selectionchange', (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length === 0) return
      const feature = e.features[0]
      if (!feature) return
      const area = areasRef.current.find(a => a.id === feature.id)
      if (!area) return
      setPanel({ mode: 'edit', area, featureId: feature.id as string })
      setNaam(area.naam)
      setCategorie(area.categorie ?? 'overig')
    })

    return () => {
      draw.current = null
      m.remove()
      map.current = null
    }
  }, [tekenGebieden])

  useEffect(() => {
    if (map.current?.loaded()) {
      const uitgeslotenId = panel?.mode === 'edit' ? panel.area.id : undefined
      tekenGebieden(areas, uitgeslotenId)
    }
  }, [areas, tekenGebieden, panel])

  function annuleer() {
    if (panel?.mode === 'create' && draw.current) {
      draw.current.delete(panel.featureId)
    }
    if (panel?.mode === 'edit') {
      tekenGebieden(areasRef.current)
    }
    setPanel(null)
    setNaam('')
    setCategorie('overig')
    draw.current?.changeMode('simple_select')
    setTekenModus(false)
  }

  function startTekenen() {
    draw.current?.changeMode('draw_polygon')
    setTekenModus(true)
    setPanel(null)
  }

  function getHuidigePolygoon(featureId: string): [number, number][] | null {
    const feature = draw.current?.get(featureId)
    if (!feature || feature.geometry.type !== 'Polygon') return null
    const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0]
    return coords as [number, number][]
  }

  async function slaOp() {
    if (!naam.trim() || !panel) return
    setBezig(true)
    try {
      if (panel.mode === 'create') {
        const polygon = getHuidigePolygoon(panel.featureId)
        if (!polygon) return
        const nieuw = await createMeetingArea(naam.trim(), categorie, polygon)
        // Vervang tijdelijke draw feature door echte area
        draw.current?.delete(panel.featureId)
        setAreas(prev => [...prev, nieuw])
      } else {
        const polygon = getHuidigePolygoon(panel.featureId) ??
          (panel.area.polygon as [number, number][])
        await updateMeetingArea(panel.area.id, naam.trim(), categorie, polygon, panel.area.active)
        setAreas(prev => prev.map(a => a.id === panel.area.id
          ? { ...a, naam: naam.trim(), categorie, polygon }
          : a
        ))
      }
      setPanel(null)
      setNaam('')
      setCategorie('overig')
    } finally {
      setBezig(false)
    }
  }

  async function verwijder() {
    if (panel?.mode !== 'edit') return
    setBezig(true)
    try {
      await deleteMeetingArea(panel.area.id)
      draw.current?.delete(panel.featureId)
      setAreas(prev => prev.filter(a => a.id !== panel.area.id))
      setPanel(null)
      setNaam('')
    } finally {
      setBezig(false)
    }
  }

  async function toggleActief(area: MeetingArea) {
    await toggleMeetingArea(area.id, !area.active)
    setAreas(prev => prev.map(a => a.id === area.id ? { ...a, active: !a.active } : a))
  }

  return (
    <div className="relative flex h-full w-full">
      <div ref={mapContainer} className="flex-1" />

      {/* Teken knop */}
      {!panel && (
        <button
          onClick={startTekenen}
          className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            tekenModus
              ? 'bg-violet-600 text-white ring-2 ring-violet-400'
              : 'bg-gray-900 text-gray-200 hover:bg-gray-800 border border-gray-700'
          }`}
        >
          <PenLine className="w-4 h-4" />
          {tekenModus ? 'Teken het gebied...' : 'Gebied tekenen'}
        </button>
      )}

      {/* Lijst met bestaande gebieden */}
      {!panel && areas.length > 0 && (
        <div className="absolute top-4 right-4 z-10 w-56 bg-gray-900/95 border border-gray-800 rounded-xl shadow-xl backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Gebieden ({areas.length})
            </span>
          </div>
          <div className="divide-y divide-gray-800 max-h-72 overflow-y-auto">
            {areas.map(area => (
              <div key={area.id} className="flex items-center gap-2 px-3 py-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: area.active ? zonekleur(area.categorie) : INACTIEF_KLEUR }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-200 truncate block">{area.naam}</span>
                  <span className="text-xs text-gray-500">{ZONE_CATEGORIEEN.find(c => c.value === area.categorie)?.label ?? area.categorie}</span>
                </div>
                <button
                  onClick={() => toggleActief(area)}
                  className="text-gray-500 hover:text-gray-200 transition-colors shrink-0"
                  title={area.active ? 'Deactiveren' : 'Activeren'}
                >
                  {area.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paneel: opslaan / bewerken */}
      {panel && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {panel.mode === 'create' ? 'Nieuw gebied' : 'Gebied bewerken'}
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
            placeholder="Naam (bijv. Vismarkt)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
          />

          <div className="flex flex-wrap gap-1.5">
            {ZONE_CATEGORIEEN.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategorie(cat.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  categorie === cat.value
                    ? 'text-white border-transparent'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
                style={categorie === cat.value ? { background: cat.kleur, borderColor: cat.kleur } : undefined}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={slaOp}
              disabled={bezig || !naam.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              {bezig ? 'Opslaan...' : 'Opslaan'}
            </button>
            {panel.mode === 'edit' && (
              <button
                onClick={verwijder}
                disabled={bezig}
                className="flex items-center justify-center gap-1.5 px-3 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="absolute bottom-8 left-4 z-10 flex items-center gap-3 bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400 shadow-lg backdrop-blur-sm">
        {ZONE_CATEGORIEEN.map(cat => (
          <div key={cat.value} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: cat.kleur }} />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// GeoJSON type declaraties
declare namespace GeoJSON {
  interface Feature<G = Geometry> { type: 'Feature'; id?: string | number; geometry: G; properties: Record<string, unknown> | null }
  type Geometry = Point | Polygon
  interface Point { type: 'Point'; coordinates: number[] }
  interface Polygon { type: 'Polygon'; coordinates: number[][][] }
}
