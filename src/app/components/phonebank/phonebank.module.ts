import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {PhonebankComponent} from './phonebank.component';
import { MaterialModule } from '../../material.module';
import {GetBirthdatePipe} from '../../pipes/getbirthdate.pipe';


const routes: Routes = [
  { path: '', component: PhonebankComponent}
]


@NgModule({
    declarations: [PhonebankComponent, GetBirthdatePipe],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class PhonebankModule { }
