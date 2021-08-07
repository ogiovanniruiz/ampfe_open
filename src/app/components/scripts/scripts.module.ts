import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ScriptsComponent } from './scripts.component';
import { MaterialModule } from '../../material.module';
import { ScriptEditorDialog } from './dialogs/scripts/scriptDialog';
import { NonResponseEditorDialog } from './dialogs/nonResponseSets/nonResponseDialog';



const routes: Routes = [
  { path: '', component: ScriptsComponent}
];

@NgModule({
  declarations: [ScriptsComponent, ScriptEditorDialog, NonResponseEditorDialog],
  entryComponents: [ScriptEditorDialog, NonResponseEditorDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class ScriptsModule { }
