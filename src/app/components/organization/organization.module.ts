import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { OrganizationComponent} from './organization.component';
import { MaterialModule } from '../../material.module';
import { RequestCampaignDialog } from './dialogs/requestCampaign/requestCampaign';
import { OrgSettingsDialog } from './dialogs/orgSettings/orgSettings';
import { CreateCampaignDialog } from './dialogs/createCampaign/createCampaign';
import { TwilioAccountDialog } from './dialogs/twilioAccount/twilioAccount';
import {OrgBillingDialog} from './dialogs/orgBilling/orgBilling'
import { EditCampaignDialog } from './dialogs/editCampaign/editCampaignDialog';


const routes: Routes = [
  { path: '', component: OrganizationComponent}
];

@NgModule({
  declarations: [OrganizationComponent,RequestCampaignDialog, OrgSettingsDialog, CreateCampaignDialog, TwilioAccountDialog, OrgBillingDialog, EditCampaignDialog],
  entryComponents: [RequestCampaignDialog, OrgSettingsDialog, CreateCampaignDialog, TwilioAccountDialog, OrgBillingDialog, EditCampaignDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})

export class OrganizationModule { }
