import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { Routes, RouterModule } from '@angular/router';
import {ActivityComponent} from './activity.component';
import { TextingTemplatesDialog } from './dialogs/textingTemplates/textingTemplatesDialog';
import { TextMessagesEditor } from './dialogs/textMessagesEditor/textMessagesEditor';

import { SendTestTextDialog } from './dialogs/sendTestText/sendTestText';
import { ActivityReportDialog } from './dialogs/activityReports/activityReportDialog';
import { CreateActivityDialog } from './dialogs/createActivity/createActivityDialog';

import { EditActivityDialog } from './dialogs/editActivity/editActivityDialog';

import { TextResponsesDialog } from './dialogs/textResponses/textResponses';
import { PhonebankTextResponsesDialog } from './dialogs/phonebankTextResponses/phonebankTextResponsesDialog';
import { EditActivityEntriesDialog } from './dialogs/editActivityEntries/editActivityEntries';
import { PassLabelPipe } from '../../pipes/passLabel.pipe';

const routes: Routes = [
  { path: '', component: ActivityComponent}
];

@NgModule({
    declarations: [EditActivityDialog,EditActivityEntriesDialog,CreateActivityDialog, ActivityReportDialog, ActivityComponent,SendTestTextDialog, TextResponsesDialog, PhonebankTextResponsesDialog, TextingTemplatesDialog, TextMessagesEditor],
    imports: [
        CommonModule,
        MaterialModule,
        PassLabelPipe,
        RouterModule.forChild(routes)
    ]
})
export class ActivityModule { }
