'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export function VenueKaart({ lat, lng }: { lat: number; lng: number }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: 15,
      interactive: false,
    })
    new mapboxgl.Marker({ color: '#7c3aed' }).setLngLat([lng, lat]).addTo(m)
    return () => { m.remove() }
  }, [lat, lng])

  return <div ref={container} className="w-full h-44 rounded-xl overflow-hidden" />
}
