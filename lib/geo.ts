/** Ray-casting algorithm: is [lng, lat] inside the given polygon ring? */
export function pointInPolygon(lng: number, lat: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Average center of a polygon ring */
export function polygonCentroid(polygon: [number, number][]): [number, number] {
  const lng = polygon.reduce((s, p) => s + p[0], 0) / polygon.length
  const lat = polygon.reduce((s, p) => s + p[1], 0) / polygon.length
  return [lng, lat]
}

/**
 * Genereert een cirkel-polygon (equirectangular benadering, voldoende voor
 * kaartweergave) rond een punt. Retourneert [lng, lat]-paren, zoals de rest
 * van dit bestand.
 */
export function circlePolygon(lat: number, lng: number, radiusKm: number, steps = 64): [number, number][] {
  const R = 6371
  const latRad = (lat * Math.PI) / 180
  const points: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dLat = (radiusKm / R) * Math.cos(angle)
    const dLng = ((radiusKm / R) * Math.sin(angle)) / Math.cos(latRad)
    points.push([lng + (dLng * 180) / Math.PI, lat + (dLat * 180) / Math.PI])
  }
  points.push(points[0])
  return points
}
