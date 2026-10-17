// Joins the parts of an address, leaving out missing ones instead of printing "undefined"
export function formatAddress(address: any, includeUnit: boolean = true): string {
  if(!address) return ''
  const parts = [address.streetNum, address.prefix, address.street, address.suffix]
  if(includeUnit) parts.push(address.unit)
  return parts.filter(part => part !== undefined && part !== null && String(part).trim() !== '')
              .map(part => String(part).trim())
              .join(' ')
}

// A building is done when every unit in it is complete or passed
export function syncBuildingStatus(building: any): boolean {
  building.complete = building.records.map(record => !!record.complete)
  building.passed = building.records.map(record => !!record.passed)
  return building.records.every(record => record.complete || record.passed)
}
