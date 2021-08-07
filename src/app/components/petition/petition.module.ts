import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {PetitionComponent} from './petition.component'
import { MaterialModule } from '../../material.module';

const routes: Routes = [
  { path: '', component: PetitionComponent}
];



@NgModule({
  declarations: [PetitionComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class PetitionModule { }
