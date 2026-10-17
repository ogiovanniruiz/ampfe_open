// Colors for tag values. colorScale matches the server's services/organization/tags/tagColors.js.

export const DEFAULT_TAG_COLOR = '#1e6fd9'

// Distinct, readable colors to pick from
export const TAG_SWATCHES = [
  '#1e6fd9', '#0f9d9a', '#2e7d32', '#7cb342', '#f9a825', '#ef6c00',
  '#c62828', '#d81b60', '#8e24aa', '#5e35b1', '#6d4c41', '#546e7a',
]

const HEX = /^#[0-9a-f]{6}$/i

const toRGB = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb: number[]) => '#' + rgb.map(c => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')
const mix = (a: number[], b: number[], t: number) => a.map((c, i) => c + (b[i] - c) * t)

export const isHexColor = (value: string): boolean => HEX.test(value || '')

// `count` colors from light to dark around `base`: a pale tint first, the base color near the end, a little darker last
export function colorScale(count: number, base: string = DEFAULT_TAG_COLOR): string[] {
  const rgb = toRGB(isHexColor(base) ? base : DEFAULT_TAG_COLOR)
  if(count <= 1) return [toHex(rgb)]
  const white = [255, 255, 255], black = [0, 0, 0]
  return Array.from({length: count}, (_, i) => {
    const w = 0.2 + i / (count - 1)
    return toHex(w <= 1 ? mix(white, rgb, w) : mix(rgb, black, w - 1))
  })
}

// Black or white, whichever reads better on this background
export function textColorOn(background: string): string {
  if(!isHexColor(background)) return '#000'
  const [r, g, b] = toRGB(background).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000' : '#fff'
}
