import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { OrganizationService } from '../../../../services/organization/organization.service';

export interface MergeTagsDialogData {
  tags: string[];
  selected?: string;
}

export interface MergeTagsResult {
  success: boolean;
  msg?: string;
  tag?: string;
  members?: number;
  groups?: number;
  removed?: string[];
}

@Component({
  templateUrl: './mergeTagsDialog.html',
  // Same look as the Tag lists dialog (ge-* and bt-*)
  styleUrls: [
    '../../../../styles/dialog-common.scss',
    '../bulkTag/bulkTagDialog.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class MergeTagsDialog {

  newTag: string = '';
  filter: string = '';
  selected = new Set<string>();

  confirming: boolean = false;
  saving: boolean = false;
  errorMessage: string = '';
  result: MergeTagsResult | null = null;
  mergedCount: number = 0;

  constructor(
    private dialogRef: MatDialogRef<MergeTagsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MergeTagsDialogData,
    private orgService: OrganizationService,
  ) {
    this.data.tags = data.tags || []
    if(data.selected && this.data.tags.includes(data.selected)) this.selected.add(data.selected)
  }

  get visibleTags(): string[] {
    const filter = this.filter.trim().toUpperCase()
    return filter ? this.data.tags.filter(tag => tag.toUpperCase().includes(filter)) : this.data.tags
  }

  toggle(tag: string, checked: boolean){
    if(checked) this.selected.add(tag)
    else this.selected.delete(tag)
    this.confirming = false
  }

  trackTag(index: number, tag: string){
    return tag
  }

  //////////////////////// NAME ////////////////////////

  get tagName(): string {
    return (this.newTag || '').trim()
  }

  // The existing tag this name matches, ignoring case
  get existingTag(): string | undefined {
    const name = this.tagName.toUpperCase()
    return name ? this.data.tags.find(tag => tag.toUpperCase() === name) : undefined
  }

  get targetName(): string {
    return this.existingTag || this.tagName
  }

  // Every org tag, narrowed by what's typed: ticked tags (kept) apart from the rest (merged into)
  private matchesName(tag: string): boolean {
    const name = this.tagName.toUpperCase()
    return !name || tag.toUpperCase().includes(name)
  }

  get selectedSuggestions(): string[] {
    return this.data.tags.filter(tag => this.selected.has(tag) && this.matchesName(tag))
  }

  get otherSuggestions(): string[] {
    return this.data.tags.filter(tag => !this.selected.has(tag) && this.matchesName(tag))
  }

  //////////////////////// MERGE ////////////////////////

  get canMerge(): boolean {
    return this.selected.size >= 2 && !!this.tagName
  }

  merge(){
    if(!this.canMerge || this.saving) return
    if(!this.confirming){
      this.confirming = true
      return
    }

    this.saving = true
    this.errorMessage = ''
    const orgID: string = sessionStorage.getItem('orgID') || ''

    this.orgService.mergeTags(orgID, Array.from(this.selected), this.tagName).subscribe(
      (result: MergeTagsResult) => {
        this.saving = false
        this.confirming = false
        if(result?.success){
          this.mergedCount = this.selected.size
          this.result = result
        } else {
          this.errorMessage = result?.msg || 'The tags could not be merged.'
        }
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
    this.dialogRef.close(this.result?.success ? {tag: this.result.tag, removed: this.result.removed} : null)
  }
}
