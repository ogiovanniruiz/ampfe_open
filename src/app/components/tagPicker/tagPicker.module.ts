import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { TagChipComponent, TagPickerComponent } from './tagPicker';

// Member tag pill and editor, shared by Membership and the opt-in sheet
@NgModule({
  declarations: [TagChipComponent, TagPickerComponent],
  imports: [CommonModule, FormsModule, MaterialModule],
  exports: [TagChipComponent, TagPickerComponent],
})
export class TagPickerModule { }
