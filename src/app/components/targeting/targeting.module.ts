import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { TargetingComponent} from './targeting.component';
import { MaterialModule } from '../../material.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { TargetSummaryDialog } from './dialogs/summary/targetSummaryDialog';
import { LeafletDrawModule } from '@asymmetrik/ngx-leaflet-draw';
import { CreatePolygonDialog } from './dialogs/polygon/createPolygon/createPolygonDialog';
import { SearchDialog } from './dialogs/search/searchDialog';
import { QueryBuilderModule } from 'angular2-query-builder';
import { TargetCreatorDialog } from './dialogs/targetCreator/targetCreatorDialog';
import { EditPolygonDialog } from './dialogs/polygon/editPolygon/editPolygonDialog';

const routes: Routes = [
  { path: '', component: TargetingComponent}
];

@NgModule({
  entryComponents: [ TargetSummaryDialog, CreatePolygonDialog, EditPolygonDialog,SearchDialog, TargetCreatorDialog ],
  declarations: [TargetingComponent,  TargetSummaryDialog, CreatePolygonDialog, EditPolygonDialog,  SearchDialog, TargetCreatorDialog],
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
