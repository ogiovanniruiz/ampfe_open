import * as L from 'leaflet';

// Street and satellite base maps shared by the campaign and canvass maps.
// Only one may be on a map at a time: with both added, satellite tiles show through the street
// tiles while they load (flicker) and phones download and draw two full tile sets.
// updateWhenZooming: false keeps tiles from being re-requested mid-pinch.

export type BaseLayerChoice = 'streets' | 'satellite'

export interface BaseLayers {
  streets: L.TileLayer;
  satellite: L.TileLayer;
}

export function createBaseLayers(): BaseLayers {
  return {
    streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '...', updateWhenZooming: false, keepBuffer: 2 }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '...', updateWhenZooming: false, keepBuffer: 2 }),
  }
}

// Each map remembers its last base map on this device; Streets by default
export function savedBaseLayer(key: string): BaseLayerChoice {
  try {
    return localStorage.getItem(key) === 'satellite' ? 'satellite' : 'streets'
  } catch {
    return 'streets'
  }
}

export function saveBaseLayer(key: string, choice: BaseLayerChoice){
  try {
    localStorage.setItem(key, choice)
  } catch {
    // Storage unavailable (private browsing); the choice just isn't remembered
  }
}
