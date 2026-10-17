import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {CanvassComponent} from './canvass.component';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { HouseholdDialog } from './dialogs/householdDialog/householdDialog';
import {GetCanvassBirthdatePipe} from '../../pipes/getCanvassBirthdate.pipe';
import { ComplexDialog } from './dialogs/complexDialog/complexDialog';
import { StreetListDialog } from './dialogs/streetListDialog/streetListDialog';
import { EditHouseholdDialog } from './dialogs/editHouseholdDialog/editHouseholdDialog';
import { SharedOptinFormModule } from 'src/app/dialogs/sharedOptinFormModule';
import { SharedSingularTextFormModule } from 'src/app/dialogs/sharedSingularTextModule';
import { LeafletDrawModule } from '@bluehalo/ngx-leaflet-draw';
const routes: Routes = [
  { path: '', component: CanvassComponent}
];

@NgModule({
    declarations: [CanvassComponent, HouseholdDialog, ComplexDialog, StreetListDialog, GetCanvassBirthdatePipe, EditHouseholdDialog],
    imports: [
        CommonModule,
        MaterialModule,
        LeafletModule,
        RouterModule.forChild(routes),
        SharedOptinFormModule,
        SharedSingularTextFormModule,
        LeafletDrawModule
    ]
})
export class CanvassModule { }
