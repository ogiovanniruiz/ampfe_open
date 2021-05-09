import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {HotlineComponent} from './hotline.component';

const routes: Routes = [
  { path: '', component: HotlineComponent}
];

@NgModule({
  declarations: [HotlineComponent],
  entryComponents: [],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class HotlineModule { }
