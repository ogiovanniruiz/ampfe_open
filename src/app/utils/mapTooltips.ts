import * as L from 'leaflet';

// Map tooltips are rendered by Leaflet as HTML, and names come from users, so every value is escaped here.
// Styles live in src/styles.scss (.amp-map-tooltip), since tooltips render outside the component.

export interface TooltipBarSegment {
  label: string;
  value: number;  // percent, 0-100
  color: string;
}

export interface TooltipBlock {
  label: string;
  color?: string;  // dot before the label
  lines: string[];
}

export interface MapTooltip {
  title: string;
  subtitle?: string;
  rows?: [string, string | number][];
  // Stacked, left-aligned entries for text too long for a label/value row (e.g. opening hours)
  blocks?: TooltipBlock[];
  bar?: TooltipBarSegment[];
  note?: string;
  hint?: string;
}

// Follows the cursor so tooltips on large shapes stay in view
export const TOOLTIP_OPTIONS: L.TooltipOptions = {
  sticky: true,
  direction: 'top',
  offset: [0, -8],
  opacity: 1,
  className: 'amp-map-tooltip',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatValue(value: unknown): string {
  if(typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 1}) : '—'
  if(value === null || value === undefined || value === '') return '—'
  return String(value)
}

// totalHHs → "Total HHs", unique_contacts → "Unique contacts"; keys that already read well are kept
export function humanizeKey(key: string): string {
  if(/\s/.test(key)) return key
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

export function mapTooltip(tooltip: MapTooltip): string {
  const parts: string[] = []

  parts.push(`<div class="amp-tt-title">${escapeHtml(tooltip.title)}</div>`)
  if(tooltip.subtitle) parts.push(`<div class="amp-tt-subtitle">${escapeHtml(tooltip.subtitle)}</div>`)

  if(tooltip.rows?.length){
    const rows = tooltip.rows.map(([label, value]) =>
      `<div class="amp-tt-row"><span class="amp-tt-label">${escapeHtml(label)}</span><span class="amp-tt-value">${escapeHtml(formatValue(value))}</span></div>`)
    parts.push(`<div class="amp-tt-rows">${rows.join('')}</div>`)
  }

  if(tooltip.blocks?.length){
    const blocks = tooltip.blocks.map(block => {
      const dot = block.color ? `<i style="background:${escapeHtml(block.color)}"></i>` : ''
      const lines = block.lines.map(line => `<div class="amp-tt-line">${escapeHtml(line)}</div>`).join('')
      return `<div class="amp-tt-block"><div class="amp-tt-block-label">${dot}${escapeHtml(block.label)}</div>${lines}</div>`
    })
    parts.push(blocks.join(''))
  }

  const segments = (tooltip.bar || []).filter(s => s.value > 0)
  if(segments.length){
    const bar = segments.map(s => `<span style="width:${Math.min(100, s.value).toFixed(2)}%;background:${escapeHtml(s.color)}"></span>`).join('')
    const legend = segments.map(s =>
      `<span class="amp-tt-key"><i style="background:${escapeHtml(s.color)}"></i>${escapeHtml(s.label)} ${Math.round(s.value)}%</span>`).join('')
    parts.push(`<div class="amp-tt-bar">${bar}</div><div class="amp-tt-legend">${legend}</div>`)
  }

  if(tooltip.note) parts.push(`<div class="amp-tt-note">${escapeHtml(tooltip.note)}</div>`)
  if(tooltip.hint) parts.push(`<div class="amp-tt-hint">${escapeHtml(tooltip.hint)}</div>`)

  return parts.join('')
}

// Binds once, or updates in place when the layer already has a tooltip
export function setMapTooltip(layer: L.Layer, tooltip: MapTooltip, options: L.TooltipOptions = TOOLTIP_OPTIONS){
  const html = mapTooltip(tooltip)
  if(layer.getTooltip()) layer.setTooltipContent(html)
  else layer.bindTooltip(html, options)
}
