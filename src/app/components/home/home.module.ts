import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent} from './home.component'
import { MaterialModule } from '../../material.module';
import { RequestOrgDialog } from './dialogs/requestOrg/requestOrg';
import {CreateOrgDialog} from './dialogs/createOrg/createOrg'
import { OrgUserListDialog } from './dialogs/userList/orgUserList';

import { EditOrgDialog } from './dialogs/editOrg/editOrgDialog';
import { UserAgreementDialog } from './dialogs/userAgreement/userAgreement';
import {DevStatusDialog} from './dialogs/devStatus/devStatus'

const routes: Routes = [
  { path: '', component: HomeComponent}
];

@NgModule({
  declarations: [HomeComponent, RequestOrgDialog, DevStatusDialog, OrgUserListDialog,  EditOrgDialog, UserAgreementDialog, CreateOrgDialog],
  entryComponents: [RequestOrgDialog, OrgUserListDialog, DevStatusDialog, EditOrgDialog, UserAgreementDialog, CreateOrgDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})

export class HomeModule { }
