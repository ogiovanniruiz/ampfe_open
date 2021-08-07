import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {CanvassComponent} from './canvass.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { HouseHoldDialog } from './dialogs/houseHoldDialog';
import {GetBirthdatePipe} from '../../pipes/getbirthdate.pipe';
import { ComplexDialog } from './dialogs/complexDialog/complexDilaog';

const routes: Routes = [
  { path: '', component: CanvassComponent}
];

@NgModule({
  declarations: [CanvassComponent, HouseHoldDialog, ComplexDialog],
  entryComponents: [HouseHoldDialog, ComplexDialog],
  imports: [
    CommonModule,
    MaterialModule,
    LeafletModule,
    RouterModule.forChild(routes)
  ]
})
export class CanvassModule { }
