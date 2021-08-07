import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipComponent } from './membership.component';
import { Routes, RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { CreateMemberDialog } from './dialogs/createMember/createMemberDialog';
import { UploadDialog } from './dialogs/uploadMembership/uploadDialog';
import { TagManagementDialog } from './dialogs/tags/tagsDialog';
import { EditMemberDialog } from './dialogs/editMember/editMemberDialog';
import { MemberGraphDialog } from './dialogs/memberGraph/memberGraph';
import { UploadsManagerDialog } from './dialogs/uploadsManager/uploadsManagerDialog';
import { dateFormatPipe } from '../../pipes/dateFormat.pipe';

const routes: Routes = [
  { path: '', component: MembershipComponent}
]

@NgModule({
  declarations: [MembershipComponent, CreateMemberDialog, EditMemberDialog, UploadDialog, TagManagementDialog, MemberGraphDialog, UploadsManagerDialog, dateFormatPipe],
  entryComponents: [CreateMemberDialog, UploadDialog, EditMemberDialog, TagManagementDialog, MemberGraphDialog, UploadsManagerDialog],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ]
})
export class MembershipModule { }
