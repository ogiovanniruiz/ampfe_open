import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { DistrictsComponent} from './districts.component';
import { MaterialModule } from '../../material.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { LeafletDrawModule } from '@asymmetrik/ngx-leaflet-draw';
//import { CreateCOIDialog } from './dialogs/createCOIDialog';
//import { EditCOIDialog } from './dialogs/editCOIDialog/editCOIDialog';
//import { CloneCOIDialog } from './dialogs/cloneDialog/cloneCOIDialog';
//import { SearchDialog } from './dialogs/search/searchDialog';
//import { TutorialDialog } from './dialogs/tutorial/tutorialDialog';

const routes: Routes = [
  { path: '', component: DistrictsComponent}
];

@NgModule({
  //entryComponents: [CreateCOIDialog, EditCOIDialog, CloneCOIDialog, SearchDialog, TutorialDialog],
  declarations: [DistrictsComponent], //CreateCOIDialog, EditCOIDialog, CloneCOIDialog, SearchDialog, TutorialDialog],
  imports: [
    CommonModule,
    MaterialModule,
    LeafletModule,
    LeafletDrawModule,
    RouterModule.forChild(routes),
  ]
})
export class DistrictsModule { }
