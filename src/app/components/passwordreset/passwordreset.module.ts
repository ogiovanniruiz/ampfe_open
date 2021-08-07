import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { PasswordresetComponent} from './passwordreset.component';
import { MaterialModule } from '../../material.module';

const routes: Routes = [
  { path: '', component: PasswordresetComponent}
];

@NgModule({
  entryComponents: [],
  declarations: [PasswordresetComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class PasswordresetModule { }
