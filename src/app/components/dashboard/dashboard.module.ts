import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent} from './dashboard.component';
import { MaterialModule } from '../../material.module';
import { SettingsDialog } from './dialogs/settingsDialog';


const routes: Routes = [
  { path: '', component: DashboardComponent}
];

@NgModule({
  entryComponents: [SettingsDialog],
  declarations: [DashboardComponent, SettingsDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class DashboardModule { }
