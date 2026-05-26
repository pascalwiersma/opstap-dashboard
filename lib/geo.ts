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
