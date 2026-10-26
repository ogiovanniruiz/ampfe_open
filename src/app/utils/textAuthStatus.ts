// Texting authorization of a number, from the state of its SignalWire 10DLC campaign assignment
export type TextAuthTone = 'good' | 'pending' | 'bad' | 'neutral';

// Shown with the ge-tone-* classes in styles/dialog-common.scss
export function textAuthStatus(state: string): {label: string, tone: TextAuthTone} {
  const value = (state || '').toLowerCase()
  const label = value ? value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Unknown'

  if(/active|approved|verified|complete/.test(value)) return {label, tone: 'good'}
  if(/pending|progress|review|submitted|processing/.test(value)) return {label, tone: 'pending'}
  if(/fail|reject|denied|error|cancel/.test(value)) return {label, tone: 'bad'}
  return {label, tone: 'neutral'}
}
