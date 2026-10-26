import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { TextingService } from 'src/app/services/texting.service';
import { ActivityContactRecord, TextConversation } from 'src/app/models/contact.record.model';
import { Activity } from 'src/app/models/activity.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material.module';
// Replies to texts sent during phonebank calls, with a composer for follow-ups
@Component({
    templateUrl: './phonebankTextResponsesDialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [CommonModule, MaterialModule]
  })

export class PhonebankTextResponsesDialog implements OnInit{

  @ViewChild('thread') thread?: ElementRef<HTMLElement>

  records: ActivityContactRecord[] = []
  selected: ActivityContactRecord | null = null
  filter: 'all' | 'awaiting' = 'all'

  // Unsent reply per conversation
  drafts: {[recordID: string]: string} = {}

  loading: boolean = false
  loadFailed: boolean = false
  sending: boolean = false
  errorMessage: string = ''

  constructor(
          public dialogRef: MatDialogRef<PhonebankTextResponsesDialog>,
          @Inject(MAT_DIALOG_DATA) public activity: Activity,
          private textingService: TextingService,
          private dialog: MatDialog
      ) { }

  ngOnInit(){
    this.load()
  }

  //////////////////////// LOAD ////////////////////////

  load(){
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''

    this.textingService.getPhonebankTextResponses(this.activity._id).subscribe(
      (records: ActivityContactRecord[]) => {
        this.records = records || []
        this.loading = false
        // Keep the open conversation across refreshes
        if(this.selected) this.selected = this.records.find(r => r._id === this.selected?._id) || null
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load the text responses.'
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  messages(record: ActivityContactRecord): TextConversation[] {
    return record?.textbankContactDetails?.textConvo || []
  }

  lastMessage(record: ActivityContactRecord): TextConversation | undefined {
    const convo = this.messages(record)
    return convo[convo.length - 1]
  }

  // The voter sent the latest message, so the conversation is waiting on a reply
  awaitingReply(record: ActivityContactRecord): boolean {
    return this.lastMessage(record)?.origin === 'PERSON'
  }

  displayName(record: ActivityContactRecord): string {
    const name = record?.person?.resident?.name
    const full = [name?.firstName, name?.lastName].filter(Boolean).join(' ')
    return full || this.phone(record) || 'Unknown'
  }

  phone(record: ActivityContactRecord): string {
    return record?.textbankContactDetails?.residentPhonenumber || ''
  }

  volunteerName(record: ActivityContactRecord): string {
    return record?.user?.name?.fullName || record?.user?.name?.firstName || ''
  }

  senderName(record: ActivityContactRecord, message: TextConversation): string {
    if(message.origin === 'USER') return this.volunteerName(record) || 'Volunteer'
    return record?.person?.resident?.name?.firstName || this.displayName(record)
  }

  // The schema stores "false" when a text went through
  failed(message: TextConversation): boolean {
    return !!message.error && message.error !== 'false'
  }

  preview(record: ActivityContactRecord): string {
    const last = this.lastMessage(record)
    if(!last) return ''
    const text = last.msg || '(image)'
    return last.origin === 'USER' ? `You: ${text}` : text
  }

  // Sender label only when the sender changes
  showSender(record: ActivityContactRecord, index: number): boolean {
    const convo = this.messages(record)
    return index === 0 || convo[index - 1].origin !== convo[index].origin
  }

  lastTime(record: ActivityContactRecord): number {
    const date = this.lastMessage(record)?.date
    return date ? new Date(date).getTime() : 0
  }

  get awaitingCount(): number {
    return this.records.filter(r => this.awaitingReply(r)).length
  }

  // Waiting on a reply first, then most recent
  get visibleRecords(): ActivityContactRecord[] {
    return this.records
      .filter(r => this.filter === 'all' || this.awaitingReply(r))
      .sort((a, b) => Number(this.awaitingReply(b)) - Number(this.awaitingReply(a)) || this.lastTime(b) - this.lastTime(a))
  }

  //////////////////////// CONVERSATION ////////////////////////

  open(record: ActivityContactRecord){
    this.selected = record
    this.errorMessage = ''
    this.scrollToBottom()
  }

  backToList(){
    this.selected = null
  }

  get draft(): string {
    return this.selected?._id ? (this.drafts[this.selected._id] || '') : ''
  }

  set draft(value: string) {
    if(this.selected?._id) this.drafts[this.selected._id] = value
  }

  onComposerKeydown(event: KeyboardEvent){
    if(event.key === 'Enter' && !event.shiftKey){
      event.preventDefault()
      this.send()
    }
  }

  send(){
    const record = this.selected
    const text = this.draft.trim()
    if(!record || !text || this.sending) return

    this.sending = true
    this.errorMessage = ''

    this.textingService.sendFollowUpText(record, text).subscribe(
      (updated: any) => {
        this.sending = false
        // The server answers false when the organization has no texting account
        if(!updated?._id){
          this.errorMessage = 'Texting isn\'t set up for this organization, so the reply wasn\'t sent.'
          return
        }

        // Keep the populated person/user from the list; the reply only changes the conversation
        const merged = {...record, textbankContactDetails: updated.textbankContactDetails}
        const index = this.records.findIndex(r => r._id === record._id)
        if(index > -1) this.records[index] = merged
        if(this.selected?._id === record._id) this.selected = merged

        const last = this.lastMessage(merged)
        if(last && this.failed(last)){
          this.errorMessage = `The reply wasn't delivered: ${last.error}`
        } else {
          this.drafts[record._id] = ''
        }
        this.scrollToBottom()
      },
      error => {
        console.log(error)
        this.sending = false
        this.errorMessage = 'A problem with the server prevented sending the reply. Please try again.'
      }
    )
  }

  private scrollToBottom(){
    setTimeout(() => {
      const el = this.thread?.nativeElement
      if(el) el.scrollTop = el.scrollHeight
    })
  }

  //////////////////////// CLOSE ////////////////////////

  async close(){
    const unsent = Object.values(this.drafts).some(d => d.trim())
    if(unsent && !(await confirmAction(this.dialog, {title: 'Discard your unsent replies?', message: "Replies you've typed but not sent will be lost.", danger: true}))) return
    this.dialogRef.close()
  }
}
