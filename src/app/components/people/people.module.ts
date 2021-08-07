import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { MaterialModule } from '../../material.module';
import {PeopleComponent} from './people.component'
import { UploadDialog } from './dialogs/uploadDialog';



const routes: Routes = [
  { path: '', component: PeopleComponent}
];

@NgModule({
  entryComponents: [UploadDialog],
  declarations: [PeopleComponent, UploadDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class PeopleModule { }
