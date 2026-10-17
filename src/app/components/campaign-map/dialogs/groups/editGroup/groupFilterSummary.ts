import { indivContactConfigTemplate, indivGeneralConfigTemplate, indivVoteHistoryConfigTemplate, indivGeoConfigTemplate, memberConfigTemplate } from '../createGroup/groupConfigs/indivConfig';
import { hhConfigTemplate } from '../createGroup/groupConfigs/hhConfig';

export interface FilterSummary {
  key: string;
  label: string;
  values: string[];
}

export interface FilterSection {
  title: string;
  filters: FilterSummary[];
}

// Names for IDs stored in the queries, from data the map already has
export interface FilterLookups {
  polygons?: {_id: string, properties: {name: string}}[];
  surveys?: {_id?: string, name: string}[];
  districts?: {properties: {identifier: string, name: string}}[];
}

const SECTIONS: {title: string, templates: any[]}[] = [
  {title: 'Geography', templates: [indivGeoConfigTemplate]},
  {title: 'Demographics', templates: [hhConfigTemplate, indivGeneralConfigTemplate]},
  {title: 'Vote history', templates: [indivVoteHistoryConfigTemplate]},
  {title: 'Contact history', templates: [indivContactConfigTemplate]},
  {title: 'Membership', templates: [memberConfigTemplate]},
]

// Plain-language labels for the creator's $AND / $OR / $NOT names
const LABELS: {[key: string]: string} = {
  and_surveys: 'Answered all of',
  or_surveys: 'Answered any of',
  not_surveys: 'Did not answer',
  or_nonResponseSets: 'Marked with any of',
  not_nonResponseSets: 'Not marked with',
  or_survey_contacts: 'Contacted in any of these surveys',
  and_survey_contacts: 'Contacted in all of these surveys',
  not_survey_contacts: 'Not contacted in these surveys',
  pdiIDs: 'PDI ID list',
  tagValues: 'Tags',
}

// Lists of IDs that are only meaningful as a count
const COUNTED: {[key: string]: [string, string]} = {
  pdiIDs: ['PDI ID', 'PDI IDs'],
  contacted_by: ['team member', 'team members'],
  uploads: ['upload', 'uploads'],
  activities: ['activity', 'activities'],
}

const humanize = (key: string) => key.replace(/^(and|or|not)_/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())

const isEmpty = (value: any) => value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)

const formatDate = (value: any): string => {
  const date = new Date(value)
  return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
}

function findConfig(key: string): {section: string, config: any} | null {
  for(const section of SECTIONS){
    for(const template of section.templates){
      if(template[key]) return {section: section.title, config: template[key]}
    }
  }
  return null
}

function formatValue(key: string, value: any, config: any, lookups: FilterLookups): string {
  if(value && typeof value === 'object'){
    if(value.question) return `${value.name ? value.name + ': ' : ''}${value.question} → ${value.response}`
    if(value.nonResponse) return `${value.name ? value.name + ': ' : ''}${value.nonResponse}`
    return JSON.stringify(value)
  }

  if(key === 'polygons'){
    return lookups.polygons?.find(p => p._id === value)?.properties?.name || `Polygon ${String(value).slice(-6)}`
  }
  if(key === 'or_survey_contacts' || key === 'and_survey_contacts' || key === 'not_survey_contacts'){
    return lookups.surveys?.find(s => s._id === value)?.name || `Survey ${String(value).slice(-6)}`
  }
  // Any stored value means the whole list (older groups stored false)
  if(key === 'ignoreDistrict') return 'Yes'
  if(key === 'districts'){
    return lookups.districts?.find(d => d.properties?.identifier === value)?.properties?.name || String(value)
  }

  const option = (config?.options || []).find((o: any) => o.value === value)
  if(option) return option.name
  if(typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * Turns stored group queries into readable sections.
 * The group creator stores each filter as [selected, ''] and dates as [start, end, ''].
 */
export function summarizeQueries(queries: any, lookups: FilterLookups = {}): FilterSection[] {
  const sections = new Map<string, FilterSummary[]>()

  Object.keys(queries || {}).forEach(key => {
    const raw = queries[key]
    const parts = Array.isArray(raw) ? raw : [raw]
    const found = findConfig(key)
    const config = found?.config
    const label = LABELS[key] || config?.name || humanize(key)
    let values: string[] = []

    if(key === 'tagValues'){
      // [{label, values}] -> "Immigrant Justice: 4, 5"
      const rows = Array.isArray(parts[0]) ? parts[0] : []
      values = rows.filter((row: any) => row?.label)
        .map((row: any) => row.values?.length ? `${row.label}: ${row.values.map((v: string) => v === '' ? 'No value' : v).join(', ')}` : row.label)
    } else if(config?.date){
      const [start, end] = parts
      if(!isEmpty(start) && !isEmpty(end)) values = [`${formatDate(start)} – ${formatDate(end)}`]
      else if(!isEmpty(start)) values = [`From ${formatDate(start)}`]
      else if(!isEmpty(end)) values = [`Until ${formatDate(end)}`]
    } else {
      const selected = parts[0]
      const list = (Array.isArray(selected) ? selected : [selected]).filter(v => !isEmpty(v))

      if(COUNTED[key]){
        const [one, many] = COUNTED[key]
        if(list.length) values = [`${list.length.toLocaleString()} ${list.length === 1 ? one : many}`]
      } else {
        values = list.map(v => formatValue(key, v, config, lookups))
      }
    }

    if(!values.length) return
    const section = found?.section || 'Other'
    if(!sections.has(section)) sections.set(section, [])
    sections.get(section).push({key, label, values})
  })

  const order = [...SECTIONS.map(s => s.title), 'Other']
  return order.filter(title => sections.has(title)).map(title => ({title, filters: sections.get(title)}))
}
