import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { OptinFormBottomSheet } from '../components/optinForm/optinForm';
// The opt-in sheet hands off to the text sheet after consent
import { SharedSingularTextFormModule } from './sharedSingularTextModule';
import { TagPickerModule } from '../components/tagPicker/tagPicker.module';

@NgModule({
  declarations: [OptinFormBottomSheet],
  imports: [
    CommonModule,
    MaterialModule,
    SharedSingularTextFormModule,
    TagPickerModule,
  ],
  exports: [OptinFormBottomSheet]
})
export class SharedOptinFormModule { }