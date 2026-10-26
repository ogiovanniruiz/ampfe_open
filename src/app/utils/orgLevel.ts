export function isAdminOrOwner(level: string | undefined): boolean {
  return level === 'ADMINISTRATOR' || level === 'OWNER'
}

export function isOwner(level: string | undefined): boolean {
  return level === 'OWNER'
}

// An org has one owner; developers and the owner can hand it to another member
// (the server makes the previous owner an administrator)
export function canTransferOwnership(viewerIsDev: boolean, viewerLevel: string | undefined): boolean {
  return viewerIsDev || viewerLevel === 'OWNER'
}

// Front-end only rules for who may change/remove an org member.
// Devs can do anything. Owners can manage admins and volunteers, never other owners.
// Admins can only manage volunteers. Only devs can assign OWNER.
export function canManageOrgUser(viewerIsDev: boolean, viewerLevel: string | undefined, targetLevel: string | undefined, newLevel?: string): boolean {
  if(viewerIsDev) return true
  if(newLevel === 'OWNER') return false
  if(targetLevel === 'OWNER') return false
  if(targetLevel === 'ADMINISTRATOR') return viewerLevel === 'OWNER'
  return isAdminOrOwner(viewerLevel)
}
