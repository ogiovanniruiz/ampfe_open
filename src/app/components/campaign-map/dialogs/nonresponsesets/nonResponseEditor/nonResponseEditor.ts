import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NonResponse } from '../../../../../models/nonResponseSet.model';

// What each type means to volunteers and to the rest of the system
export const NONRESPONSE_TYPES: {[type: string]: {label: string, tone: string, effect: string}} = {
  NONRESPONSE: {label: 'Non-response', tone: 'neutral', effect: 'Logged as an attempt. The person can be contacted again on a later pass.'},
  IMP: {label: 'Impression', tone: 'neutral', effect: 'Logged as an attempt that left an impression (e.g. a door hanger). The person can be contacted again.'},
  DNC: {label: 'Do Not Contact', tone: 'bad', effect: 'Marks the contact complete and removes the person from future groups and activities on this campaign.'},
  INVALIDPHONE: {label: 'Invalid phone', tone: 'warn', effect: 'Marks the contact complete and skips the person in future phonebank and texting activities.'},
  INVALIDADDRESS: {label: 'Invalid address', tone: 'warn', effect: 'Marks the contact complete and skips the person in future canvassing.'},
};

// The responses new campaigns start with (amp3server/services/campaign/createCampaign.js)
export const SUGGESTED_NONRESPONSES: NonResponse[] = [
  {nonResponse: 'Not Home', nonResponseType: 'NONRESPONSE'},
  {nonResponse: 'Voicemail', nonResponseType: 'NONRESPONSE'},
  {nonResponse: 'Inaccessible', nonResponseType: 'NONRESPONSE'},
  {nonResponse: 'Spanish Speaker', nonResponseType: 'IMP'},
  {nonResponse: 'Do Not Contact', nonResponseType: 'DNC'},
  {nonResponse: 'Moved', nonResponseType: 'DNC'},
  {nonResponse: 'Deceased', nonResponseType: 'DNC'},
  {nonResponse: 'Language Barrier-DNC', nonResponseType: 'DNC'},
  {nonResponse: 'Wrong Number', nonResponseType: 'INVALIDPHONE'},
  {nonResponse: 'Wrong Address', nonResponseType: 'INVALIDADDRESS'},
];

export interface EditableNonResponse extends NonResponse {
  // Text when the set was loaded; undefined for entries added in this session
  originalText?: string;
}

// Contacts recorded with each response of a set (amp3server getNonResponseSetUsage)
export interface NonResponseUsage {
  total: number;
  responses: {[text: string]: number};
}

export const normalizeText = (text: string) => (text || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const cleanText = (text: string) => (text || '').trim().replace(/\s+/g, ' ');

export function responseError(items: NonResponse[], index: number): string {
  const text = items[index].nonResponse
  if(!text || !text.trim()) return 'Text is required.'
  const key = normalizeText(text)
  if(items.some((nr, i) => i !== index && normalizeText(nr.nonResponse) === key)) return 'Duplicate of another response.'
  return ''
}

export function responsesValid(items: NonResponse[]): boolean {
  return items.length > 0 && items.every((nr, index) => !responseError(items, index))
}

/**
 * Ordered, editable list of non-responses plus the "add" row.
 * Edits `items` in place; the parent dialog owns saving.
 */
@Component({
  selector: 'app-nonresponse-editor',
  templateUrl: './nonResponseEditor.html',
  styleUrls: ['./nonResponseEditor.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class NonResponseEditorComponent {

  @Input() items: EditableNonResponse[] = [];
  // Offer the standard responses as one-tap chips (used when creating a set)
  @Input() showSuggestions: boolean = false;
  // Recorded counts; responses already recorded on contacts can't be renamed, retyped or removed
  @Input() usage: NonResponseUsage | null = null;

  types = NONRESPONSE_TYPES
  typeKeys = Object.keys(NONRESPONSE_TYPES)

  newText: string = ''
  newType: string = 'NONRESPONSE'
  addError: string = ''

  // Counted by the text the set was loaded with, so it follows the entry while reordering
  recordedCount(nr: EditableNonResponse): number {
    if(!this.usage || !nr.originalText) return 0
    return this.usage.responses[nr.originalText] || 0
  }

  locked(nr: EditableNonResponse): boolean {
    return this.recordedCount(nr) > 0
  }

  lockTooltip(nr: EditableNonResponse): string {
    const count = this.recordedCount(nr)
    const contacts = count === 1 ? '1 contact' : `${count.toLocaleString()} contacts`
    return `Recorded on ${contacts}. Changing or removing it would split summaries and break group filters. Add a new response instead.`
  }

  rowError(index: number): string {
    return responseError(this.items, index)
  }

  private exists(text: string): boolean {
    const key = normalizeText(text)
    return this.items.some(nr => normalizeText(nr.nonResponse) === key)
  }

  get availableSuggestions(): NonResponse[] {
    return SUGGESTED_NONRESPONSES.filter(s => !this.exists(s.nonResponse))
  }

  add(){
    const text = cleanText(this.newText)
    if(!text){
      this.addError = 'Enter the text volunteers will see.'
      return
    }
    if(!this.newType){
      this.addError = 'Choose a type.'
      return
    }
    if(this.exists(text)){
      this.addError = `"${text}" is already in this set.`
      return
    }

    this.items.push({nonResponse: text, nonResponseType: this.newType})
    this.newText = ''
    this.addError = ''
    // The type is kept, so several of the same type can be added in a row
  }

  addSuggestion(suggestion: NonResponse){
    if(this.exists(suggestion.nonResponse)) return
    this.items.push({...suggestion})
  }

  addAllSuggestions(){
    this.availableSuggestions.forEach(s => this.items.push({...s}))
  }

  remove(index: number){
    if(this.locked(this.items[index])) return
    this.items.splice(index, 1)
  }

  move(index: number, offset: number){
    const target = index + offset
    if(target < 0 || target >= this.items.length) return
    moveItemInArray(this.items, index, target)
  }

  drop(event: CdkDragDrop<EditableNonResponse[]>){
    moveItemInArray(this.items, event.previousIndex, event.currentIndex)
  }

  trackByIndex(index: number){ return index }
}
