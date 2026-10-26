import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {PhonebankComponent} from './phonebank.component';
import { MaterialModule } from '../../material.module';
import {GetPhonebankBirthdatePipe} from '../../pipes/getPhonebankBirthdate.pipe';
import { SharedOptinFormModule } from 'src/app/dialogs/sharedOptinFormModule';
import { SharedSingularTextFormModule } from 'src/app/dialogs/sharedSingularTextModule';


const routes: Routes = [
  { path: '', component: PhonebankComponent}
]


@NgModule({
    declarations: [PhonebankComponent, GetPhonebankBirthdatePipe],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
    SharedOptinFormModule,
    SharedSingularTextFormModule,

  ]
})
export class PhonebankModule { }
