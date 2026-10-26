import { Estimate, Group } from 'src/app/models/group.model';

// Shared by the create and edit polygon dialogs: estimate a shape against a
// campaign-wide rule set, and build a group limited to a saved polygon

export const EVERYONE_RULE_SET = 'ALL'

// Copies so the campaign group objects in the dialog's list are never modified
export function copyQueries(ruleSet: Group | null): any {
  return ruleSet?.queries ? JSON.parse(JSON.stringify(ruleSet.queries)) : {}
}

export function ruleSetName(ruleSet: Group | null): string {
  return ruleSet?.name || 'All'
}

// shape is any GeoJSON feature; the server's temp_shape filter reads its geometry
export function polygonEstimate(ruleSet: Group | null, shape: any): Estimate {
  const queries = copyQueries(ruleSet)
  queries['temp_shape'] = [shape]
  return {
    orgID: sessionStorage.getItem('orgID'),
    campaignID: parseInt(sessionStorage.getItem('campaignID')),
    queries: queries,
    groupBy: ruleSet?.groupBy || 'INDIVIDUAL',
    campaignWide: !!ruleSet?.campaignWide,
  }
}

export function polygonGroup(ruleSet: Group | null, polygonID: string, name: string): Group {
  const queries = copyQueries(ruleSet)
  delete queries['temp_shape']
  // Same [selected, ''] shape the group creator stores
  queries['polygons'] = [polygonID, '']

  return {
    name: name.trim(),
    groupBy: ruleSet?.groupBy || 'INDIVIDUAL',
    queries: queries,
    campaignID: parseInt(sessionStorage.getItem('campaignID')),
    orgID: sessionStorage.getItem('orgID'),
    campaignWide: false,
    includesPolygon: true,
    includesSurvey: !!ruleSet?.includesSurvey,
    active: true,
  }
}
