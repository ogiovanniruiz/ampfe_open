import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MembershipService } from '../../../../services/membership.service';
import { TagDefinition, Upload } from 'src/app/models/organization.model';
import { findDefinition } from 'src/app/utils/memberTags';
import { User } from 'src/app/models/user.model';

export interface BulkTagDialogData {
  uploads: Upload[];
  tags: string[];
  organizers: User[];
  tagDefinitions?: TagDefinition[];
}

export interface BulkTagResult {
  success: boolean;
  msg?: string;
  tag?: string;
  value?: string;
  created?: boolean;
  matched?: number;
  tagged?: number;
}

type ListKey = 'uploadIDs' | 'tags' | 'userIDs';

interface ListItem { id: string; label: string; }
interface ListGroup { key: ListKey; label: string; items: ListItem[]; }

@Component({
  templateUrl: './bulkTagDialog.html',
  // Shares the dialog look (ge-*)
  styleUrls: [
    '../../../../styles/dialog-common.scss',
    './bulkTagDialog.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class BulkTagDialog {

  tag: string = '';
  // One of the tag's values when it has them ('' for none)
  value: string = '';
  filter: string = '';
  groups: ListGroup[];
  selected: Record<ListKey, Set<string>> = {uploadIDs: new Set(), tags: new Set(), userIDs: new Set()};

  saving: boolean = false;
  errorMessage: string = '';
  result: BulkTagResult | null = null;

  constructor(
    private dialogRef: MatDialogRef<BulkTagDialog>,
    @Inject(MAT_DIALOG_DATA) public data: BulkTagDialogData,
    private memberService: MembershipService,
  ) {
    const organizerName = (user: User) => [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ') || user.loginEmail
    this.groups = [
      {key: 'uploadIDs', label: 'Uploads', items: (data.uploads || []).map(u => ({id: u._id, label: u.uploadName}))},
      {key: 'tags', label: 'Tags', items: (data.tags || []).map(t => ({id: t, label: t}))},
      {key: 'userIDs', label: 'Organizer lists', items: (data.organizers || []).map(u => ({id: u._id, label: organizerName(u)}))},
    ]
  }

  //////////////////////// TAG ////////////////////////

  get tagName(): string {
    return (this.tag || '').trim()
  }

  // The existing tag this name matches, ignoring case
  get existingTag(): string | undefined {
    const name = this.tagName.toUpperCase()
    return name ? (this.data.tags || []).find(t => t.toUpperCase() === name) : undefined
  }

  get tagSuggestions(): string[] {
    const name = this.tagName.toUpperCase()
    return (this.data.tags || []).filter(t => !name || t.toUpperCase().includes(name))
  }

  //////////////////////// LISTS ////////////////////////

  get totalLists(): number {
    return this.groups.reduce((sum, group) => sum + group.items.length, 0)
  }

  visible(group: ListGroup): ListItem[] {
    const filter = this.filter.trim().toUpperCase()
    return filter ? group.items.filter(item => (item.label || '').toUpperCase().includes(filter)) : group.items
  }

  get anyVisible(): boolean {
    return this.groups.some(group => this.visible(group).length > 0)
  }

  // Members of the chosen tag's own list already have it
  isOwnTag(group: ListGroup, item: ListItem): boolean {
    return group.key === 'tags' && !!this.existingTag && item.id === this.existingTag
  }

  isSelected(group: ListGroup, item: ListItem): boolean {
    return this.selected[group.key].has(item.id) && !this.isOwnTag(group, item)
  }

  setSelected(group: ListGroup, item: ListItem, checked: boolean){
    if(checked) this.selected[group.key].add(item.id)
    else this.selected[group.key].delete(item.id)
  }

  private selectable(group: ListGroup): ListItem[] {
    return this.visible(group).filter(item => !this.isOwnTag(group, item))
  }

  allSelected(group: ListGroup): boolean {
    const items = this.selectable(group)
    return items.length > 0 && items.every(item => this.isSelected(group, item))
  }

  toggleAll(group: ListGroup){
    const select = !this.allSelected(group)
    this.selectable(group).forEach(item => this.setSelected(group, item, select))
  }

  selectedCount(group: ListGroup): number {
    return group.items.filter(item => this.isSelected(group, item)).length
  }

  get selectedTotal(): number {
    return this.groups.reduce((sum, group) => sum + this.selectedCount(group), 0)
  }

  trackItem(index: number, item: ListItem){
    return item.id
  }

  // The chosen tag's values and colors, when it has them
  get definition(): TagDefinition | undefined {
    return this.existingTag ? findDefinition(this.existingTag, this.data.tagDefinitions || []) : undefined
  }

  get selectedValueColor(): string {
    return this.definition?.values?.find(v => v.value === this.value)?.color || ''
  }

  //////////////////////// APPLY ////////////////////////

  get canApply(): boolean {
    return !this.saving && !!this.tagName && this.selectedTotal > 0
  }

  apply(){
    if(!this.canApply) return

    const lists = {} as Record<ListKey, string[]>
    this.groups.forEach(group => lists[group.key] = group.items.filter(item => this.isSelected(group, item)).map(item => item.id))

    this.saving = true
    this.errorMessage = ''

    const orgID: string = sessionStorage.getItem('orgID') || ''
    const value = this.definition?.values?.some(v => v.value === this.value) ? this.value : ''
    this.memberService.bulkTagMembers(orgID, this.tagName, lists, value).subscribe(
      (result: BulkTagResult) => {
        this.saving = false
        if(result?.success) this.result = result
        else this.errorMessage = result?.msg || 'The members could not be tagged.'
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      })
  }

  close(){
    if(this.saving) return
    this.dialogRef.close(this.result?.success ? {tag: this.result.tag, created: this.result.created} : null)
  }
}
