import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HotlineComponent } from './hotline.component';
import { Routes, RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { LeafletDrawModule } from '@bluehalo/ngx-leaflet-draw';


import { MatSidenavModule } from '@angular/material/sidenav';


import { CallsDialog } from './dialogs/calls/calls';
import { IncidentsDialog } from './dialogs/incidents/incidents';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { CreateIncidentDialog } from './dialogs/createIncident/createIncident';
import { DispatchersDialogComponent } from './dialogs/dispatchers/dispatchers';
import { CreateAlertDialog } from './dialogs/createAlert/createAlert';
import { EditIncidentDialog } from './dialogs/editIncident/editIncident';
import { OutgoingCallDialog } from './dialogs/outgoingCall/outgoingCall';
import { EditDispatcherDialog } from './dialogs/editDispatcher/editDispatcherDialog';
import { CreateDispatcherDialog } from './dialogs/createDispatcher/createDispatcherDialog';
import { RespondersDialogComponent } from './dialogs/responders/responders';
import { CreateResponderDialog } from './dialogs/createResponder/createResponderDialog';
import { EditResponderDialog } from './dialogs/editResponder/editResponderDialog';
import { MessagesDialog } from './dialogs/messages/messages';

import { ContactsDialog } from './dialogs/contacts/contacts';
import { CreateContactDialog } from './dialogs/createContact/createContactDialog';
import { EditContactDialog } from './dialogs/editContact/editContactDialog';


const routes: Routes = [
  { path: '', component: HotlineComponent}
]

@NgModule({
    declarations: [HotlineComponent, CallsDialog, IncidentsDialog, CreateIncidentDialog, DispatchersDialogComponent, CreateAlertDialog, EditIncidentDialog, OutgoingCallDialog, EditDispatcherDialog, CreateDispatcherDialog, RespondersDialogComponent, CreateResponderDialog, EditResponderDialog, MessagesDialog, ContactsDialog, CreateContactDialog, EditContactDialog],
    imports: [
        MatSidenavModule,
        CommonModule,
        LeafletDrawModule,
        MaterialModule,
          LeafletModule,
        RouterModule.forChild(routes),
    ]
})
export class HotlineModule { }
