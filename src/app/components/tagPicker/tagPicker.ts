import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

import { MemberTag } from 'src/app/models/person.model';
import { TagDefinition } from 'src/app/models/organization.model';
import { findDefinition, tagColor, tagText } from 'src/app/utils/memberTags';
import { isConsentTag } from 'src/app/utils/consent';
import { textColorOn } from 'src/app/utils/tagColors';

// A colored pill for one member tag ("Immigrant Justice · 2")
@Component({
  selector: 'tag-chip',
  template: `<span class="tag-chip" [style.background]="color" [style.color]="textColor" [title]="text">{{text}}</span>`,
  styles: [`
    .tag-chip {
      display: inline-block;
      max-width: 100%;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 18px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TagChipComponent {
  @Input() tag: MemberTag;
  @Input() definitions: TagDefinition[] = [];

  get color(): string {
    return tagColor(this.tag, this.definitions)
  }

  get textColor(): string {
    return textColorOn(this.color)
  }

  get text(): string {
    return tagText(this.tag)
  }
}

// Edits a member's tags: one row per tag with its value (colored options when the tag has values),
// plus an "Add tag" field over the org's tags
@Component({
  selector: 'tag-picker',
  templateUrl: './tagPicker.html',
  styleUrls: ['./tagPicker.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TagPickerComponent {
  @Input() tags: MemberTag[] = [];
  @Input() orgTags: string[] = [];
  @Input() definitions: TagDefinition[] = [];
  @Input() label: string = 'Add a tag';
  @Output() tagsChange = new EventEmitter<MemberTag[]>();

  search: string = '';

  definitionFor(label: string): TagDefinition | undefined {
    return findDefinition(label, this.definitions)
  }

  colorOf(tag: MemberTag): string {
    return tagColor(tag, this.definitions)
  }

  textOn(color: string): string {
    return textColorOn(color)
  }

  // Org tags not on the member yet, narrowed by what's typed
  get options(): string[] {
    const have = new Set((this.tags || []).map(t => t.label.toUpperCase()))
    const search = this.search.trim().toUpperCase()
    return (this.orgTags || [])
      .filter(tag => !isConsentTag(tag) && !have.has(tag.toUpperCase()))
      .filter(tag => !search || tag.toUpperCase().includes(search))
  }

  add(label: string){
    if(!label) return
    this.search = ''
    this.emit([...(this.tags || []), {label}])
  }

  setValue(index: number, value: string){
    const tags = [...this.tags]
    tags[index] = value ? {label: tags[index].label, value} : {label: tags[index].label}
    this.emit(tags)
  }

  remove(index: number){
    this.emit(this.tags.filter((_, i) => i !== index))
  }

  trackTag(index: number, tag: MemberTag){
    return tag.label
  }

  private emit(tags: MemberTag[]){
    this.tags = tags
    this.tagsChange.emit(tags)
  }
}
