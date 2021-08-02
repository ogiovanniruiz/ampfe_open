import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TargetingComponent} from './targeting.component';
import { MaterialModule } from '../../material.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { TargetSummaryDialog } from './dialogs/summary/targetSummaryDialog';
import { LeafletDrawModule } from '@asymmetrik/ngx-leaflet-draw';
import { PolygonDialog } from './dialogs/polygon/polygonDialog';
import { BlockgroupDialog } from './dialogs/blockgroup/blockgroupDialog';
import { SearchDialog } from './dialogs/search/searchDialog';
import { QueryBuilderModule } from 'angular2-query-builder';
import { TargetCreatorDialog } from './dialogs/targetCreator/targetCreatorDialog';
import { ClinicDialog } from './dialogs/clinic/clinicDialog';


const routes: Routes = [
  { path: '', component: TargetingComponent}
];

@NgModule({
  entryComponents: [ TargetSummaryDialog, PolygonDialog, BlockgroupDialog, SearchDialog, TargetCreatorDialog, ClinicDialog],
  declarations: [TargetingComponent,  TargetSummaryDialog, PolygonDialog, BlockgroupDialog, SearchDialog, TargetCreatorDialog, ClinicDialog],
  imports: [
    QueryBuilderModule,
    CommonModule,
    MaterialModule,
    LeafletModule,
    LeafletDrawModule,
    RouterModule.forChild(routes),
  ]
})
export class TargetingModule { }
