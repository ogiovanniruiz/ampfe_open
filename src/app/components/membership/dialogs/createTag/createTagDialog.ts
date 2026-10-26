import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, ElementRef, Inject, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { OrganizationService } from '../../../../services/organization/organization.service';
import { TagDefinition, TagValue } from 'src/app/models/organization.model';
import { User } from 'src/app/models/user.model';
import { DEFAULT_TAG_COLOR, TAG_SWATCHES, colorScale, isHexColor, textColorOn } from 'src/app/utils/tagColors';

export interface CreateTagDialogData {
  // The org's current (label-only) tags
  tags: string[];
  // Editing: the tag's name, and its values and colors when it has them
  label?: string;
  definition?: TagDefinition;
}

// What an edit will do to members and saved groups (from the server's preview)
interface EditPreview {
  membersCleared: number;
  membersRenamed: number;
  membersRelabeled: number;
  groupsAffected: number;
  removed: string[];
}

type ValueType = 'none' | 'range' | 'list';

const MAX_VALUES = 10

@Component({
  templateUrl: './createTagDialog.html',
  // Same look as the Tag lists / Merge tags dialogs (ge-* and bt-*)
  styleUrls: [
    '../../../../styles/dialog-common.scss',
    '../bulkTag/bulkTagDialog.scss',
    './createTagDialog.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CreateTagDialog {

  readonly swatches = TAG_SWATCHES;
  readonly maxValues = MAX_VALUES;

  label: string = '';
  valueType: ValueType = 'range';
  min: number = 1;
  max: number = 5;
  words: string[] = [];
  newWord: string = '';
  // Editing: each word's text when the dialog opened (by its current text), so a renamed word follows on members
  private wordFrom = new Map<string, string>();
  editingWord: number = -1;
  editingText: string = '';
  @ViewChild('renameInput') renameInput: ElementRef<HTMLInputElement>;
  @ViewChild('confirmPanel') confirmPanel: ElementRef<HTMLElement>;

  baseColor: string = DEFAULT_TAG_COLOR;
  singleColor: string = DEFAULT_TAG_COLOR;
  // Colors picked by hand, by value; everything else follows the scale
  private pickedColors = new Map<string, string>();

  definitions: TagDefinition[] = [];
  saving: boolean = false;
  errorMessage: string = '';
  // Editing: changes that clear member values or touch saved groups wait for a second click
  confirming: EditPreview | null = null;
  // The edit the preview was for; any change after it is previewed again
  private confirmedEdit: string = '';

  constructor(
    private dialogRef: MatDialogRef<CreateTagDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CreateTagDialogData,
    private orgService: OrganizationService,
    private snackBar: MatSnackBar,
  ) {
    this.data.tags = data?.tags || []
    if(this.editing) this.prefill()
    const orgID: string = sessionStorage.getItem('orgID') || ''
    this.orgService.getTagDefinitions(orgID).subscribe(
      (definitions: TagDefinition[]) => this.definitions = definitions || [],
      error => console.log(error)
    )
  }

  get editing(): boolean {
    return !!this.data?.label
  }

  // The form starts from the tag as it is; its colors count as picked so they're kept
  private prefill(){
    const definition = this.data.definition
    this.label = this.data.label
    if(!definition){
      this.valueType = 'none'
      return
    }
    this.valueType = definition.valueType || 'none'
    if(definition.valueType === 'range' && definition.range){
      this.min = definition.range.min
      this.max = definition.range.max
    }
    if(definition.valueType === 'list'){
      this.words = definition.values.map(v => v.value)
      this.words.forEach(word => this.wordFrom.set(word, word))
    }
    // Start from the swatch whose scale these colors came from, so only real overrides count as picked
    const colors = definition.values.map(v => (v.color || '').toLowerCase())
    const base = TAG_SWATCHES.find(swatch => colorScale(colors.length, swatch).every((c, i) => c.toLowerCase() === colors[i]))
    if(base) this.baseColor = base
    definition.values.forEach(v => this.pickedColors.set(v.value.toUpperCase(), v.color))
    if(definition.color) this.singleColor = definition.color
  }

  private isEditedTag(name: string): boolean {
    return this.editing && name.toUpperCase() === this.data.label.toUpperCase()
  }

  //////////////////////// LABEL ////////////////////////

  get tagName(): string {
    return (this.label || '').trim()
  }

  // A tag with values already uses this name
  get duplicateDefinition(): boolean {
    const name = this.tagName.toUpperCase()
    return !!name && !this.isEditedTag(name) && this.definitions.some(d => d.label.toUpperCase() === name)
  }

  // Editing: the new name belongs to another tag
  get nameClash(): string | undefined {
    const name = this.tagName.toUpperCase()
    if(!this.editing || !name || this.isEditedTag(name)) return undefined
    return this.data.tags.find(tag => tag.toUpperCase() === name)
  }

  // The name matches one of today's plain tags; this gives it values
  get existingPlainTag(): string | undefined {
    const name = this.tagName.toUpperCase()
    return name && !this.editing ? this.data.tags.find(tag => tag.toUpperCase() === name) : undefined
  }

  get isConsentName(): boolean {
    return ['OPTIN-TEXTING', 'OPTIN-EMAIL'].includes(this.tagName.toUpperCase())
  }

  //////////////////////// VALUES ////////////////////////

  // Why the values can't be saved yet, or '' when they can
  get valuesProblem(): string {
    if(this.valueType === 'range'){
      if(!Number.isInteger(this.min) || !Number.isInteger(this.max)) return 'Use whole numbers.'
      if(this.min >= this.max) return 'The first number must be smaller than the last.'
      if(this.max - this.min + 1 > MAX_VALUES) return `A range can have at most ${MAX_VALUES} values.`
    }
    if(this.valueType === 'list' && this.words.length < 2) return 'Add at least two words.'
    return ''
  }

  get valueNames(): string[] {
    if(this.valueType === 'range'){
      if(this.valuesProblem) return []
      return Array.from({length: this.max - this.min + 1}, (_, i) => String(this.min + i))
    }
    if(this.valueType === 'list') return this.words
    return []
  }

  // Each value with its color: picked by hand, otherwise from the scale
  get values(): TagValue[] {
    const names = this.valueNames
    const scale = colorScale(names.length, this.baseColor)
    return names.map((value, i) => ({value, color: this.pickedColors.get(value.toUpperCase()) || scale[i]}))
  }

  get wordProblem(): string {
    const word = this.newWord.trim()
    if(!word) return ''
    if(word.length > 30) return 'At most 30 characters.'
    if(this.words.some(w => w.toUpperCase() === word.toUpperCase())) return 'Already added.'
    if(this.words.length >= MAX_VALUES) return `At most ${MAX_VALUES} words.`
    return ''
  }

  addWord(){
    const word = this.newWord.trim()
    if(!word || this.wordProblem) return
    this.words = [...this.words, word]
    this.newWord = ''
  }

  removeWord(word: string){
    this.words = this.words.filter(w => w !== word)
    this.wordFrom.delete(word)
  }

  startRenameWord(index: number){
    this.editingWord = index
    this.editingText = this.words[index]
    setTimeout(() => this.renameInput?.nativeElement.select())
  }

  get renameProblem(): string {
    const text = this.editingText.trim()
    if(!text) return 'Enter a word.'
    if(text.length > 30) return 'At most 30 characters.'
    if(this.words.some((w, i) => i !== this.editingWord && w.toUpperCase() === text.toUpperCase())) return 'Already a value.'
    return ''
  }

  // The word keeps its color and, when editing, where it came from
  finishRenameWord(){
    const index = this.editingWord
    if(index < 0) return
    const text = this.editingText.trim()
    if(this.renameProblem){ this.editingWord = -1; return }
    const old = this.words[index]
    if(text !== old){
      this.words = this.words.map((w, i) => i === index ? text : w)
      const color = this.pickedColors.get(old.toUpperCase())
      if(color){ this.pickedColors.delete(old.toUpperCase()); this.pickedColors.set(text.toUpperCase(), color) }
      if(this.wordFrom.has(old)){ this.wordFrom.set(text, this.wordFrom.get(old)); this.wordFrom.delete(old) }
    }
    this.editingWord = -1
  }

  moveWord(index: number, step: number){
    const target = index + step
    if(target < 0 || target >= this.words.length) return
    const words = [...this.words];
    [words[index], words[target]] = [words[target], words[index]]
    this.words = words
  }

  //////////////////////// COLORS ////////////////////////

  // A new base color re-fills the scale; hand-picked colors are dropped so the whole scale follows it
  setBaseColor(color: string){
    if(!isHexColor(color)) return
    this.baseColor = color
    this.pickedColors.clear()
  }

  setValueColor(value: string, color: string){
    if(isHexColor(color)) this.pickedColors.set(value.toUpperCase(), color)
  }

  // A color picked by hand that differs from the scale (only then is "Use scale" worth offering)
  isPicked(value: string): boolean {
    const picked = this.pickedColors.get(value.toUpperCase())
    if(!picked) return false
    const names = this.valueNames
    const scale = colorScale(names.length, this.baseColor)[names.findIndex(n => n.toUpperCase() === value.toUpperCase())]
    return picked.toLowerCase() !== String(scale || '').toLowerCase()
  }

  resetValueColor(value: string){
    this.pickedColors.delete(value.toUpperCase())
  }

  // Rows stay put while colors change, so an open color menu isn't torn down
  trackValue(index: number, item: TagValue){
    return item.value
  }

  textOn(color: string): string {
    return textColorOn(color)
  }

  //////////////////////// SAVE ////////////////////////

  get canSave(): boolean {
    return !!this.tagName && this.tagName.length <= 60 && !this.duplicateDefinition && !this.nameClash && !this.isConsentName && !this.valuesProblem && !this.saving
  }

  save(){
    if(!this.canSave) return
    if(this.editing) return this.saveEdit()
    const orgID: string = sessionStorage.getItem('orgID') || ''
    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')

    const definition = {
      label: this.tagName,
      valueType: this.valueType,
      range: this.valueType === 'range' ? {min: this.min, max: this.max} : undefined,
      values: this.values,
      color: this.valueType === 'none' ? this.singleColor : undefined,
    }

    this.saving = true
    this.errorMessage = ''
    this.orgService.createTagDefinition(orgID, user?._id, definition).subscribe(
      (result: {success: boolean, msg?: string, definition?: TagDefinition}) => {
        this.saving = false
        if(result?.success){
          this.snackBar.open(`Tag "${definition.label}" created.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(result.definition)
        }
        else this.errorMessage = result?.msg || 'The tag could not be created.'
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      })
  }

  // Asks the server what the edit will do first; anything that clears member values or touches saved groups
  // is shown for a second click
  private saveEdit(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    const update = {
      newLabel: this.tagName,
      valueType: this.valueType,
      range: this.valueType === 'range' ? {min: this.min, max: this.max} : undefined,
      values: this.values.map(v => ({...v, from: this.valueType === 'list' ? this.wordFrom.get(v.value) : undefined})),
      color: this.valueType === 'none' ? this.singleColor : undefined,
      userID: user?._id,
    }

    const send = (preview: boolean) => {
      this.saving = true
      this.errorMessage = ''
      this.orgService.updateTagDefinition(orgID, this.data.label, update, preview).subscribe(
        (result: any) => {
          this.saving = false
          if(!result?.success){
            this.errorMessage = result?.msg || 'The tag could not be saved.'
            this.confirming = null
            return
          }
          if(preview){
            const p: EditPreview = result.preview
            if(p.membersCleared > 0 || p.groupsAffected > 0){
              this.confirming = p
              this.confirmedEdit = JSON.stringify(update)
              // The warning sits at the end of the scrolling content; bring it into view
              setTimeout(() => this.confirmPanel?.nativeElement.scrollIntoView({block: 'nearest', behavior: 'smooth'}))
            }
            else send(false)
            return
          }
          this.snackBar.open(`Tag "${result.label || this.tagName}" saved.`, 'Dismiss', {duration: 2500})
          this.dialogRef.close({definition: result.definition, label: result.label})
        },
        error => {
          console.log(error)
          this.saving = false
          this.confirming = null
          this.errorMessage = 'There was a problem with the server. Please try again.'
        })
    }

    send(!this.confirming || this.confirmedEdit !== JSON.stringify(update))
  }

  close(){
    if(!this.saving) this.dialogRef.close(null)
  }
}
