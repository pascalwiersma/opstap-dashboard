/**
 * Haalt de officiële provinciegrenzen van Nederland op van cartomap.github.io
 * en zet ze in de Supabase `provinces` tabel.
 *
 * Gebruik:
 *   node scripts/seed-provinces.mjs
 *
 * Vereist .env.local met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Laad .env.local handmatig (geen dotenv nodig)
const envPath = resolve(__dirname, '../.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Ontbrekende env vars: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Officiële CBS provinciegrenzen 2024 via cartomap.github.io
const GEOJSON_URL = 'https://cartomap.github.io/nl/wgs84/provincie_2024.geojson'

// Naam-mapping: GeoJSON naam → Nederlandse weergavenaam
const NAAM_MAP = {
  'Groningen': 'Groningen',
  'Friesland (Fryslân)': 'Friesland',
  'Fryslân': 'Friesland',
  'Drenthe': 'Drenthe',
  'Overijssel': 'Overijssel',
  'Flevoland': 'Flevoland',
  'Gelderland': 'Gelderland',
  'Utrecht': 'Utrecht',
  'Noord-Holland': 'Noord-Holland',
  'Zuid-Holland': 'Zuid-Holland',
  'Zeeland': 'Zeeland',
  'Noord-Brabant': 'Noord-Brabant',
  'Limburg': 'Limburg',
}

/**
 * Extraheert de grootste buitenring van een Polygon of MultiPolygon.
 * Geeft coördinaten als [[lng, lat], ...] zonder sluitend punt.
 */
function extractPolygon(geometry) {
  let rings = []

  if (geometry.type === 'Polygon') {
    rings = [geometry.coordinates[0]]
  } else if (geometry.type === 'MultiPolygon') {
    // Neem de grootste ring (meeste punten)
    for (const polygon of geometry.coordinates) {
      rings.push(polygon[0])
    }
    rings.sort((a, b) => b.length - a.length)
  } else {
    throw new Error(`Onverwacht geometrietype: ${geometry.type}`)
  }

  // Verwijder het sluitende punt (GeoJSON herhaalt eerste punt als laatste)
  const ring = rings[0]
  const last = ring[ring.length - 1]
  const first = ring[0]
  const closed = last[0] === first[0] && last[1] === first[1]
  return closed ? ring.slice(0, -1) : ring
}

function computeCenter(polygon) {
  const lngs = polygon.map(p => p[0])
  const lats = polygon.map(p => p[1])
  return {
    center_lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    center_lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  }
}

async function main() {
  console.log('GeoJSON ophalen van cartomap.github.io...')
  const res = await fetch(GEOJSON_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const geojson = await res.json()

  console.log(`${geojson.features.length} features gevonden.\n`)

  for (const feature of geojson.features) {
    const geoNaam = feature.properties?.statnaam || feature.properties?.name || ''
    const naam = NAAM_MAP[geoNaam] ?? geoNaam

    let polygon
    try {
      polygon = extractPolygon(feature.geometry)
    } catch (e) {
      console.warn(`  ⚠ Overgeslagen (${naam}): ${e.message}`)
      continue
    }

    const { center_lat, center_lng } = computeCenter(polygon)

    console.log(`Invoegen: ${naam} (${polygon.length} punten, center ${center_lat.toFixed(4)}, ${center_lng.toFixed(4)})`)

    const { error } = await supabase
      .from('provinces')
      .upsert(
        { name: naam, polygon, center_lat, center_lng },
        { onConflict: 'name' }
      )

    if (error) {
      console.error(`  ✗ Fout bij ${naam}: ${error.message}`)
    } else {
      console.log(`  ✓ ${naam}`)
    }
  }

  console.log('\nKlaar!')
}

main().catch(err => {
  console.error('Fatale fout:', err)
  process.exit(1)
})
