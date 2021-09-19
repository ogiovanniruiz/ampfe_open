import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import {TextingComponent} from './texting.component'
import { MaterialModule } from '../../material.module';
import {ConversationComponent} from './conversation/conversation.component'
import { QuickResponseBottomSheet} from './actions/quickResponses';
import { FinishIDBottomSheet } from './actions/finishIdentification';

const routes: Routes = [
  { path: '', component: TextingComponent}
];

@NgModule({
  declarations: [TextingComponent, ConversationComponent, QuickResponseBottomSheet, FinishIDBottomSheet],
  entryComponents: [QuickResponseBottomSheet, FinishIDBottomSheet],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class TextingModule { }
