import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {CanvassComponent} from './canvass.component';

const routes: Routes = [
  { path: '', component: CanvassComponent}
];

@NgModule({
  declarations: [CanvassComponent],
  entryComponents: [],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class CanvassModule { }
