import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {TextingComponent} from './texting.component'
import { MaterialModule } from '../../material.module';
import {ConversationComponent} from './conversation/conversation.component'
import { fromEventPattern } from 'rxjs';

const routes: Routes = [
  { path: '', component: TextingComponent}
];

@NgModule({
  declarations: [TextingComponent, ConversationComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class TextingModule { }
