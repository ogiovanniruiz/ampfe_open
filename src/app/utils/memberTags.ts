import { MemberTag } from '../models/person.model';
import { TagDefinition } from '../models/organization.model';
import { isConsentTag } from './consent';

// Plain tags (no definition) are shown in a neutral grey
export const PLAIN_TAG_COLOR = '#e0e0e0'

const key = (label: string) => String(label || '').trim().toUpperCase()

export const findDefinition = (label: string, definitions: TagDefinition[]): TagDefinition | undefined =>
  (definitions || []).find(d => key(d.label) === key(label))

// The value's color, the definition's single color, or grey for a plain tag
export function tagColor(tag: MemberTag, definitions: TagDefinition[]): string {
  const definition = findDefinition(tag?.label, definitions)
  if(!definition) return PLAIN_TAG_COLOR
  if(tag.value) return definition.values.find(v => key(v.value) === key(tag.value))?.color || PLAIN_TAG_COLOR
  return definition.color || PLAIN_TAG_COLOR
}

export const tagText = (tag: MemberTag): string => tag?.value ? `${tag.label} · ${tag.value}` : (tag?.label || '')

// Member tags as objects, whatever shape they arrived in, without the old consent tags
export const asMemberTags = (tags: (MemberTag | string)[]): MemberTag[] => (tags || [])
  .map(tag => typeof tag === 'string' ? {label: tag} : tag)
  .filter(tag => !!tag?.label && !isConsentTag(tag.label))

// The org's tags an activity still offers: those it hides are left out (names match exactly)
export const visibleTags = (orgTags: string[], hidden: string[] = []): string[] =>
  (orgTags || []).filter(tag => !!tag && !(hidden || []).includes(tag))

export const tagLabels = (tags: (MemberTag | string)[]): string[] => asMemberTags(tags).map(tag => tag.label)
