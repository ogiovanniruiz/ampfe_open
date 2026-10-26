import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TextingService } from 'src/app/services/texting.service';
import { TextingTemplate } from 'src/app/models/activity.model';
import { formatInitTextPreview, sessionFirstName } from '../activityFormUtils';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

// Lists a campaign's texting templates and creates/edits them in place
@Component({
    templateUrl: './textingTemplatesDialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class TextingTemplatesDialog implements OnInit{

  view: 'list' | 'editor' = 'list'

  campaignID: number = -1
  orgID: string = ''
  campaignName: string = ''
  userFirstName: string = ''

  templates: TextingTemplate[] = []

  // Working copy being edited; the list keeps the saved version
  draft: TextingTemplate | null = null
  // Name of the template an unsaved draft was duplicated from
  cloneOf: string = ''
  private snapshot: string = ''

  loading: boolean = false
  loadFailed: boolean = false
  saving: boolean = false
  errorMessage: string = ''

  // A template was created, saved or deleted
  changed: boolean = false

  constructor(public dialogRef: MatDialogRef<TextingTemplatesDialog>,
        private textingService: TextingService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
        ) {}

  ngOnInit(){
    this.campaignID = parseInt(sessionStorage.getItem('campaignID') || '-1')
    this.orgID = sessionStorage.getItem('orgID') || ''
    this.campaignName = sessionStorage.getItem('campaignName') || ''
    this.userFirstName = sessionFirstName()

    this.load()
  }

  //////////////////////// LIST ////////////////////////

  load(){
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''

    this.textingService.getTextingTemplates(this.campaignID).subscribe(
      (templates: TextingTemplate[]) => {
        this.templates = templates || []
        this.loading = false
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load the texting templates.'
      }
    )
  }

  templateSummary(template: TextingTemplate): string {
    const msgs = template.initTextMsgs?.length || 0
    const responses = template.quickResponses?.length || 0
    return `${msgs} ${msgs === 1 ? 'message' : 'messages'} · ${responses} ${responses === 1 ? 'quick response' : 'quick responses'}`
  }

  firstPreview(template: TextingTemplate): string {
    const first = template.initTextMsgs?.[0]
    return first ? formatInitTextPreview(first, this.userFirstName) : ''
  }

  //////////////////////// EDITOR ////////////////////////

  newTemplate(){
    this.openEditor({name: '', campaignID: this.campaignID, orgID: this.orgID, initTextMsgs: [], quickResponses: []})
  }

  editTemplate(template: TextingTemplate){
    this.openEditor(template)
  }

  // Opens a new, unsaved copy; from the editor, unsaved edits are discarded first and the saved version is copied
  async cloneTemplate(template: TextingTemplate){
    if(this.saving) return
    if(this.view === 'editor' && this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this template will be lost.', danger: true}))) return
    const source = this.templates.find(t => t._id === template._id) || template

    this.openEditor({
      name: this.copyName(source.name),
      campaignID: this.campaignID,
      orgID: this.orgID,
      // Fresh messages: drop the saved sub-document IDs so the copy is independent
      initTextMsgs: (source.initTextMsgs || []).map(({_id, ...item}: any) => ({...item})),
      quickResponses: [...(source.quickResponses || [])],
    })
    this.cloneOf = source.name
    // Nothing saved yet: the copy can be saved as is, and leaving asks before discarding it
    this.snapshot = ''
  }

  // "Name (copy)", then "(copy 2)", "(copy 3)"… so copies are easy to tell apart in the list
  private copyName(name: string): string {
    const base = `${(name || 'Template').trim()} (copy`
    const taken = new Set(this.templates.map(t => (t.name || '').trim()))
    if(!taken.has(`${base})`)) return `${base})`
    let n = 2
    while(taken.has(`${base} ${n})`)) n++
    return `${base} ${n})`
  }

  private openEditor(template: TextingTemplate){
    this.cloneOf = ''
    // Deep copy so unsaved edits never show up in the list
    this.draft = {
      ...template,
      initTextMsgs: (template.initTextMsgs || []).map(item => ({...item})),
      quickResponses: [...(template.quickResponses || [])],
    }
    this.snapshot = this.serialize()
    this.errorMessage = ''
    this.view = 'editor'
  }

  private serialize(): string {
    if(!this.draft) return ''
    return JSON.stringify([this.draft.name.trim(), this.draft.initTextMsgs, this.draft.quickResponses])
  }

  get isNew(): boolean {
    return !this.draft?._id
  }

  get hasChanges(): boolean {
    return this.view === 'editor' && this.serialize() !== this.snapshot
  }

  get validationError(): string {
    if(!this.draft) return ''
    if(!this.draft.name.trim()) return 'The template needs a name.'
    if(!this.draft.initTextMsgs.length) return 'Add at least one initial text message.'
    return ''
  }

  async back(){
    if(this.saving) return
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this template will be lost.', danger: true}))) return
    this.draft = null
    this.cloneOf = ''
    this.errorMessage = ''
    this.view = 'list'
  }

  save(){
    if(!this.draft || this.saving) return
    if(this.validationError){
      this.errorMessage = this.validationError
      return
    }

    const template: TextingTemplate = {...this.draft, name: this.draft.name.trim()}
    const request = this.isNew ? this.textingService.createTextingTemplate(template) : this.textingService.editTextingTemplate(template)

    this.saving = true
    this.errorMessage = ''

    request.subscribe(
      (result: any) => {
        this.saving = false
        // The server answers false when the template doesn't pass validation
        if(!result){
          this.errorMessage = 'The template could not be saved. Check that every message has text or an image.'
          return
        }
        this.changed = true
        this.snackBar.open(`"${template.name}" saved.`, 'Dismiss', {duration: 2500})

        const saved: TextingTemplate = result?._id ? result : template
        const index = this.templates.findIndex(t => t._id === saved._id)
        if(index > -1) this.templates[index] = saved
        else this.templates.push(saved)

        this.draft = null
        this.cloneOf = ''
        this.view = 'list'
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented saving the template. Please try again.'
      }
    )
  }

  async deleteTemplate(template: TextingTemplate){
    if(this.saving || !template._id) return
    if(!(await confirmAction(this.dialog, {title: `Delete the template "${template.name}"?`, message: 'Activities that already used it keep their messages.', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.saving = true
    this.errorMessage = ''

    this.textingService.deleteTextingTemplate(this.campaignID, template._id).subscribe(
      () => {
        this.saving = false
        this.changed = true
        this.templates = this.templates.filter(t => t._id !== template._id)
        this.snackBar.open(`"${template.name}" deleted.`, 'Dismiss', {duration: 2500})
        if(this.view === 'editor'){
          this.draft = null
          this.view = 'list'
        }
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented deleting the template.'
      }
    )
  }

  //////////////////////// CLOSE ////////////////////////

  async close(){
    if(this.saving) return
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this template will be lost.', danger: true}))) return
    this.dialogRef.close(this.changed || null)
  }
}
