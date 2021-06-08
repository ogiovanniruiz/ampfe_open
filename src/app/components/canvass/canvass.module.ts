import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {CanvassComponent} from './canvass.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { HouseholdDialog } from './dialogs/householdDilaog';
import {GetBirthdatePipe} from '../../pipes/getbirthdate.pipe';

const routes: Routes = [
  { path: '', component: CanvassComponent}
];

@NgModule({
  declarations: [CanvassComponent, HouseholdDialog],
  entryComponents: [HouseholdDialog],
  imports: [
    CommonModule,
    MaterialModule,
    LeafletModule,
    RouterModule.forChild(routes)
  ]
})
export class CanvassModule { }
