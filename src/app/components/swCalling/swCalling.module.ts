import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {SWCallingComponent} from './swCalling.component';
import { MaterialModule } from '../../material.module';
import {GetSWCallingBirthdatePipe} from '../../pipes/getSWCallingBirthdate.pipe';
import { SharedSingularTextFormModule } from 'src/app/dialogs/sharedSingularTextModule';


const routes: Routes = [
  { path: '', component: SWCallingComponent}
]


@NgModule({
    declarations: [SWCallingComponent, GetSWCallingBirthdatePipe],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
    SharedSingularTextFormModule
  ]
})
export class SWCallingModule { }
