import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MembershipService } from '../../../../services/membership.service';
import { DuplicateGroup, Membership, MergeMembersResult } from 'src/app/models/person.model';
import { asMemberTags, tagText } from 'src/app/utils/memberTags';

export interface MergeMembersDialogData {
  group: DuplicateGroup;
  // Where each member came from, by member id (upload, activity or how they were entered)
  sources: {[memberID: string]: string};
}

const memberDate = (member: Membership) => new Date(member.enrollment?.dateCreated || 0).getTime()

@Component({
  templateUrl: './mergeMembersDialog.html',
  // Same look as the Merge tags dialog (ge-* and bt-*)
  styleUrls: [
    '../../../../styles/dialog-common.scss',
    '../bulkTag/bulkTagDialog.scss',
    './mergeMembersDialog.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class MergeMembersDialog {

  members: Membership[];
  keepID: string;

  confirming: boolean = false;
  saving: boolean = false;
  errorMessage: string = '';
  result: MergeMembersResult | null = null;

  constructor(
    private dialogRef: MatDialogRef<MergeMembersDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MergeMembersDialogData,
    private memberService: MembershipService,
  ) {
    // Oldest first; the oldest is kept unless the user picks another
    this.members = [...(data.group?.members || [])].sort((a, b) => memberDate(a) - memberDate(b))
    this.keepID = this.members[0]?._id
  }

  fullName(member: Membership): string {
    const name = member.resident?.name
    return [name?.firstName, name?.middleName, name?.lastName].filter(part => part).join(' ')
  }

  //////////////////////// PREVIEW ////////////////////////

  // What the kept member ends up with: its own values first, then everyone else's
  private get ordered(): Membership[] {
    const keep = this.members.find(m => m._id === this.keepID)
    return keep ? [keep, ...this.members.filter(m => m !== keep)] : this.members
  }

  get combinedPhones(): string[] {
    const seen = new Set<string>()
    return this.ordered.flatMap(m => m.resident?.phones || []).map(p => p?.number || '').filter(number => {
      const digits = number.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1')
      if(!digits || seen.has(digits)) return false
      seen.add(digits)
      return true
    })
  }

  get combinedEmails(): string[] {
    const seen = new Set<string>()
    return this.ordered.flatMap(m => m.resident?.emails || []).filter(email => {
      const key = String(email || '').trim().toLowerCase()
      if(!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // One per tag; the kept member's value wins
  get combinedTags(): string[] {
    const byLabel = new Map<string, string>()
    this.ordered.forEach(m => asMemberTags(m.tags).forEach(tag => {
      if(!byLabel.has(tag.label.toUpperCase())) byLabel.set(tag.label.toUpperCase(), tagText(tag))
    }))
    return [...byLabel.values()]
  }

  get removedCount(): number {
    return this.members.length - 1
  }

  //////////////////////// MERGE ////////////////////////

  merge(){
    if(!this.keepID || this.saving) return
    if(!this.confirming){
      this.confirming = true
      return
    }

    this.saving = true
    this.errorMessage = ''
    const orgID: string = sessionStorage.getItem('orgID') || ''

    this.memberService.mergeMembers(orgID, [{memberIDs: this.members.map(m => m._id), keepID: this.keepID}]).subscribe(
      (result: MergeMembersResult) => {
        this.saving = false
        this.confirming = false
        if(result?.success) this.result = result
        else this.errorMessage = result?.msg || 'These members could not be merged.'
      },
      error => {
        console.log(error)
        this.saving = false
        this.confirming = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      })
  }

  close(){
    if(this.saving) return
    this.dialogRef.close(this.result?.success ? this.result : null)
  }
}
