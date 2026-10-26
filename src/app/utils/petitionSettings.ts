import { PetitionMetadata } from '../models/activity.model';

export interface PetitionSettings {
  checkVoterfile: boolean;
  includeAddress: boolean;   // street address and city (zip is always asked)
  requireAddress: boolean;
  includeEmail: boolean;
  requireEmail: boolean;
}

// Older petitions only have requireFullAddress / requireEmail: a required field was the only way to show one
export function petitionSettings(meta: Partial<PetitionMetadata> | null | undefined): PetitionSettings {
  const includeAddress = meta?.includeAddress ?? !!meta?.requireFullAddress
  const includeEmail = meta?.includeEmail ?? !!meta?.requireEmail
  return {
    checkVoterfile: !!meta?.checkVoterfile,
    includeAddress,
    requireAddress: includeAddress && (meta?.requireAddress ?? !!meta?.requireFullAddress),
    includeEmail,
    requireEmail: includeEmail && !!meta?.requireEmail,
  }
}

// Stored shape; requireFullAddress stays in step for screens that still read it
export function petitionMetadata(settings: PetitionSettings): PetitionMetadata {
  const requireAddress = settings.includeAddress && settings.requireAddress
  const requireEmail = settings.includeEmail && settings.requireEmail
  return {
    checkVoterfile: settings.checkVoterfile,
    includeAddress: settings.includeAddress,
    requireAddress,
    requireFullAddress: requireAddress,
    includeEmail: settings.includeEmail,
    requireEmail,
  }
}

export function petitionSummary(settings: PetitionSettings): string {
  const address = !settings.includeAddress ? 'Zip only' : (settings.requireAddress ? 'Address required' : 'Address optional')
  const email = !settings.includeEmail ? 'No email' : (settings.requireEmail ? 'Email required' : 'Email optional')
  return `${address} · ${email}`
}
