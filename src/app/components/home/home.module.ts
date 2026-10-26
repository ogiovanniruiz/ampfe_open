import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent} from './home.component'
import { MaterialModule } from '../../material.module';
import { RequestOrgDialog } from './homeDialogs/requestOrganization/requestOrg';
import {CreateOrgDialog} from './homeDialogs/createOrganization/createOrg'
import { OrgUserListDialog } from './homeDialogs/userList/orgUserList';

import { EditOrgDialog } from './homeDialogs/editOrganization/editOrgDialog';
import {ManageAllUsersDialog} from './homeDialogs/manageAllUsers/manageAllUsers'
import { CurrencyMaskModule } from "ng2-currency-mask";

import { LeafletModule } from '@bluehalo/ngx-leaflet';


import { EditCampaignDialog } from './homeDialogs/editCampaign/editCampaignDialog';
import { UserOrgsDialog } from './homeDialogs/userOrgsDialog/userOrgsDialog';
import { CreateCampaignDialog } from './homeDialogs/createCampaign/createCampaign';
import {OrgBillingDialog} from './homeDialogs/orgBilling/orgBilling'
import { RequestCampaignDialog } from './homeDialogs/requestCampaign/requestCampaign';
import { TwilioCallPoolDialog } from './homeDialogs/twilioCallPool/twilioCallPool';
import { ManageCampaignsDialog } from './homeDialogs/manageCampaigns/manageCampaignsDialog';
import { TermsDialog } from './homeDialogs/termsDialog/termsDialog';
import { SWTextNumbersDialog } from './homeDialogs/swTextNumbers/swTextNumbers';
import { SharedUserListModule } from 'src/app/dialogs/sharedUserListmodule';
import { SignalWireCallPoolDialog } from './homeDialogs/swCallPool/swCallPool';
import { LiveElectionResultsDialog } from './homeDialogs/liveElectionResults/liveElectionResults';

const routes: Routes = [
  { path: '', component: HomeComponent}
];

import { FitLabelsDirective } from '../../directives/fitLabels.directive';

@NgModule({
    declarations: [HomeComponent,
        RequestOrgDialog,
        ManageAllUsersDialog,
        OrgUserListDialog,
        EditOrgDialog,
        CreateCampaignDialog,
        CreateOrgDialog,
        EditCampaignDialog,
        SignalWireCallPoolDialog,
        OrgBillingDialog,
        RequestCampaignDialog,
        TwilioCallPoolDialog,
        ManageCampaignsDialog,
        TermsDialog,
        SWTextNumbersDialog,
        LiveElectionResultsDialog
    ],
    imports: [
        CommonModule,
        MaterialModule,
        LeafletModule,
        SharedUserListModule,
        FitLabelsDirective,

        RouterModule.forChild(routes),
        CurrencyMaskModule
    ]
})

export class HomeModule { }
