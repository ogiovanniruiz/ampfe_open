import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { MaterialModule } from '../../material.module';
import {PeopleComponent} from './people.component'




const routes: Routes = [
  { path: '', component: PeopleComponent}
];

@NgModule({
    declarations: [PeopleComponent],
    imports: [
        CommonModule,
        MaterialModule,
        RouterModule.forChild(routes),
    ]
})
export class PeopleModule { }
