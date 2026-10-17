import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InitTextMsg } from 'src/app/models/activity.model';
import { TextingService } from 'src/app/services/texting.service';
import { shrinkImage } from 'src/app/utils/shrinkImage';
import { formatInitTextPreview, sessionFirstName } from '../activityFormUtils';

// Initial text messages + quick responses editor shared by the activity and texting template dialogs.
// The arrays are edited in place so the parent's dirty checks see every change.
@Component({
    selector: 'app-text-messages-editor',
    templateUrl: './textMessagesEditor.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class TextMessagesEditor {

  @Input() initTextMsgs: InitTextMsg[] = []
  @Input() quickResponses: string[] = []
  @Input() showQuickResponses: boolean = true
  @Input() showDefaultSelect: boolean = false

  @Input() defaultInitTextMsg: InitTextMsg | undefined
  @Output() defaultInitTextMsgChange = new EventEmitter<InitTextMsg | undefined>()

  userFirstName: string = sessionFirstName()

  // New initial message draft
  draftMsg: string = ''
  draftImageUrl: string = ''
  draftSender: boolean = false
  draftReceiver: boolean = false
  draftAttachImage: boolean = false
  uploadingImage: boolean = false
  draftImageFailed: boolean = false
  newQuickResponse: string = ''

  // The listed message being changed in the composer (null while adding a new one)
  editing: InitTextMsg | null = null
  @ViewChild('msgInput') msgInput: ElementRef<HTMLTextAreaElement>

  constructor(private snackBar: MatSnackBar, private textingService: TextingService) {}

  // Uploads to our server so the text doesn't depend on an external image host
  async uploadImage(input: HTMLInputElement){
    const picked = input.files?.[0]
    input.value = ''
    if(!picked || this.uploadingImage) return

    if(!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(picked.type)){
      this.snackBar.open('The image must be a JPEG, PNG, GIF or WebP.', 'Dismiss', {duration: 3000})
      return
    }
    if(picked.size > 20000000){
      this.snackBar.open('Image file is too large. Max size is 20 MB.', 'Dismiss', {duration: 3000})
      return
    }

    this.uploadingImage = true
    let file: File
    try {
      file = await shrinkImage(picked)
    } catch(e: any) {
      this.uploadingImage = false
      this.snackBar.open(e?.message || 'The image could not be prepared for sending.', 'Dismiss', {duration: 3000})
      return
    }

    const formData = new FormData()
    formData.append('orgID', sessionStorage.getItem('orgID') || '')
    formData.append('image', file)

    this.textingService.uploadTextImage(formData).subscribe(
      (result: any) => {
        this.uploadingImage = false
        if(!result?.success){
          this.snackBar.open(result?.msg || 'The image could not be uploaded.', 'Dismiss', {duration: 3000})
          return
        }
        this.draftImageUrl = result.url
        this.draftImageFailed = false
      },
      error => {
        console.log(error)
        this.uploadingImage = false
        this.snackBar.open('A problem with the server prevented the upload. Please try again.', 'Dismiss', {duration: 3000})
      })
  }

  // Enter and the composer button: add a new message, or save the one being edited
  submitDraft(){
    if(this.editing) this.saveInitTextMsg()
    else this.addInitTextMsg()
  }

  get editingNumber(): number {
    return this.editing ? this.initTextMsgs.indexOf(this.editing) + 1 : 0
  }

  editInitTextMsg(item: InitTextMsg){
    this.editing = item
    this.draftMsg = item.msg || ''
    this.draftSender = !!item.sendSenderName
    this.draftReceiver = !!item.sendReceiverName
    this.draftAttachImage = !!item.attachImage
    this.draftImageUrl = item.imageUrl || ''
    setTimeout(() => this.msgInput?.nativeElement.focus())
  }

  cancelEdit(){
    this.editing = null
    this.clearDraft()
  }

  // Edits the same object, so a default message stays the default
  saveInitTextMsg(){
    const item = this.editing
    if(!item) return
    const msg = this.draftMsg
    const imageUrl = this.draftAttachImage ? this.draftImageUrl.trim() : ''

    if(msg.trim() === '' && imageUrl === ''){
      this.snackBar.open('Add a text message, an image URL, or both.', 'Dismiss', {duration: 2500})
      return
    }
    if(this.initTextMsgs.some(other => other !== item && other.msg === msg && (other.imageUrl || '') === imageUrl)){
      this.snackBar.open('That message is already in the list.', 'Dismiss', {duration: 2500})
      return
    }

    item.msg = msg
    item.sendSenderName = this.draftSender
    item.sendReceiverName = this.draftReceiver
    item.attachImage = imageUrl !== ''
    item.imageUrl = imageUrl
    this.cancelEdit()
  }

  // Order matters: without a default, the first message is the one sent
  moveInitTextMsg(index: number, step: number){
    const target = index + step
    if(target < 0 || target >= this.initTextMsgs.length) return
    const [item] = this.initTextMsgs.splice(index, 1)
    this.initTextMsgs.splice(target, 0, item)
  }

  private clearDraft(){
    this.draftMsg = ''
    this.draftImageUrl = ''
    this.draftSender = false
    this.draftReceiver = false
    this.draftAttachImage = false
  }

  addInitTextMsg(){
    const msg = this.draftMsg
    // The image URL only counts while "attach image" is on
    const imageUrl = this.draftAttachImage ? this.draftImageUrl.trim() : ''

    // A message needs text, an image, or both
    if(msg.trim() === '' && imageUrl === ''){
      this.snackBar.open('Add a text message, an image URL, or both.', 'Dismiss', {duration: 2500})
      return
    }

    if(this.initTextMsgs.some(item => item.msg === msg && (item.imageUrl || '') === imageUrl)){
      this.snackBar.open('That message is already in the list.', 'Dismiss', {duration: 2500})
      return
    }

    this.initTextMsgs.push({
      msg: msg,
      sendSenderName: this.draftSender,
      sendReceiverName: this.draftReceiver,
      attachImage: imageUrl !== '',
      imageUrl: imageUrl,
    })
    this.draftMsg = ''
    this.draftImageUrl = ''
    this.updateDefault()
  }

  removeInitTextMsg(initTextMsg: InitTextMsg){
    const index = this.initTextMsgs.indexOf(initTextMsg)
    if(index > -1){
      if(this.editing === initTextMsg) this.cancelEdit()
      this.initTextMsgs.splice(index, 1)
      this.updateDefault()
    }
  }

  setDefault(item: InitTextMsg | undefined){
    this.defaultInitTextMsg = item
    this.defaultInitTextMsgChange.emit(item)
  }

  // A single message is always the default; a removed default is cleared
  private updateDefault(){
    if(this.initTextMsgs.length === 1) this.setDefault(this.initTextMsgs[0])
    else if(!this.initTextMsgs.includes(this.defaultInitTextMsg)) this.setDefault(undefined)
  }

  addQuickResponse(){
    const quickResponse = this.newQuickResponse.trim()
    if(!quickResponse){
      this.snackBar.open('New quick responses need text.', 'Dismiss', {duration: 2500})
      return
    }
    if(this.quickResponses.includes(quickResponse)){
      this.snackBar.open('That quick response is already in the list.', 'Dismiss', {duration: 2500})
      return
    }
    this.quickResponses.push(quickResponse)
    this.newQuickResponse = ''
  }

  removeQuickResponse(quickResponse: string){
    const index = this.quickResponses.indexOf(quickResponse)
    if(index > -1) this.quickResponses.splice(index, 1)
  }

  formatPreview(item: InitTextMsg): string {
    return formatInitTextPreview(item, this.userFirstName)
  }

  previewNewMessage(): string {
    return this.formatPreview({
      msg: this.draftMsg,
      sendSenderName: this.draftSender,
      sendReceiverName: this.draftReceiver,
      attachImage: this.draftAttachImage,
      imageUrl: '',
    })
  }
}
