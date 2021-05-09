import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {ActivityComponent} from './activity.component';
import {CreateTextActivityDialog} from './dialogs/texting/createActivity/createTextActivityDialog';
import { EditTextActivityDialog } from './dialogs/texting/editActivity/editTextActivityDialog';
import { CreatePhoneActivityDialog } from './dialogs/phonebank/createActivity/createPhoneActivityDialog';
import { EditPhoneActivityDialog } from './dialogs/phonebank/editActivity/editPhoneActivityDialog';
import { CreatePetitionActivityDialog } from './dialogs/petition/createActivity/createPetitionActivityDialog';
import { EditPetitionActivityDialog } from './dialogs/petition/editActivity/editPetitionActivityDialog';
import {TextReportsDialog} from './dialogs/activityReports/textReport/textReportDialog'
import { PhonebankReportsDialog } from './dialogs/activityReports/phonebankReport/phonebankReportDialog';
import { PetitionReportsDialog } from './dialogs/activityReports/petitionReport/petitionReportDialog';
import { CreateHotlineActivityDialog} from './dialogs/hotline/createHotLine/createHotlineActivityDialog'
import {EditHotlineActivityDialog} from './dialogs/hotline/editHotLine/editHotlineActivityDialog'
import {HotlineReportsDialog} from './dialogs/activityReports/hotlineReport/hotlineReportDialog'



const routes: Routes = [
  { path: '', component: ActivityComponent}
];

@NgModule({
  declarations: [HotlineReportsDialog, CreateHotlineActivityDialog, EditHotlineActivityDialog,PetitionReportsDialog, PhonebankReportsDialog, TextReportsDialog, ActivityComponent, CreateTextActivityDialog, EditTextActivityDialog, CreatePhoneActivityDialog, EditPhoneActivityDialog, CreatePetitionActivityDialog, EditPetitionActivityDialog],
  entryComponents: [HotlineReportsDialog,CreateHotlineActivityDialog, EditHotlineActivityDialog, PetitionReportsDialog, PhonebankReportsDialog, TextReportsDialog, CreateTextActivityDialog, EditTextActivityDialog, CreatePhoneActivityDialog, EditPhoneActivityDialog, CreatePetitionActivityDialog, EditPetitionActivityDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class ActivityModule { }
