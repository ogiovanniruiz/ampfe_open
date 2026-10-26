// Shared by the Create and Edit Campaign dialogs

export const ELECTION_TYPES = ['General', 'Primary', 'Special', 'Political Purpose', 'Nonpolitical Purpose']

const FIRST_ELECTION_YEAR = 2018

// Next year back to 2018, plus the campaign's own year if it's outside that range
export function buildElectionYears(current?: string): string[] {
  const years = new Set<string>()
  for(let year = new Date().getFullYear() + 1; year >= FIRST_ELECTION_YEAR; year--) years.add(String(year))
  if(current) years.add(String(current))
  return [...years].sort((a, b) => Number(b) - Number(a))
}

// Stored types are upper-case ("BOARD OF EQUALIZATION"); the selects use the service's names
export function matchDistrictType(types: {name: string}[], stored: string): string {
  if(!stored) return ''
  const key = stored.toLowerCase().replace(/[\s_]+/g, '')
  return types.find(t => t.name.toLowerCase().replace(/[\s_]+/g, '') === key)?.name || ''
}

// Selected districts stay listed so the search never hides a choice
export function filterDistricts(districts: any[], term: string, selectedIDs: string[]): any[] {
  const search = (term || '').trim().toLowerCase()
  if(!search) return districts
  return districts.filter(d => (d.properties?.name || '').toLowerCase().includes(search) || selectedIDs.includes(d.properties?.identifier))
}
