import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {PetitionComponent} from './petition.component';
import { MaterialModule } from '../../material.module';
import { SharedOptinFormModule } from 'src/app/dialogs/sharedOptinFormModule';
import { SharedSingularTextFormModule } from 'src/app/dialogs/sharedSingularTextModule';
import { TagPickerModule } from '../tagPicker/tagPicker.module';


const routes: Routes = [
  { path: '', component: PetitionComponent}
]


@NgModule({
    declarations: [PetitionComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
    SharedOptinFormModule,
    SharedSingularTextFormModule,
    TagPickerModule,
  ]
})
export class PetitionModule { }
