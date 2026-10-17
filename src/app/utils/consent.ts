import { Membership } from '../models/person.model';

// Texting / email consent lives on member.enrollment. These are the tags it used to be recorded as;
// they're kept out of tag pickers so nobody re-creates them.
export const CONSENT_TAGS = ['Optin-Texting', 'Optin-Email']

export const isConsentTag = (tag: string): boolean =>
  CONSENT_TAGS.some(consent => consent.toUpperCase() === String(tag || '').trim().toUpperCase())

export const withoutConsentTags = (tags: string[]): string[] => (tags || []).filter(tag => !isConsentTag(tag))

export const hasTextingConsent = (member: Membership): boolean => !!member?.enrollment?.optinTexting?.status

export const hasEmailConsent = (member: Membership): boolean => !!member?.enrollment?.optinEmail?.status
