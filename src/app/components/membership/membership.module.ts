import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipComponent } from './membership.component';
import { Routes, RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { PassLabelPipe } from '../../pipes/passLabel.pipe';
import { CreateMemberDialog } from './dialogs/createMember/createMemberDialog';
import { UploadDialog } from './dialogs/uploadMembership/uploadDialog';
import { EditMemberDialog } from './dialogs/editMember/editMemberDialog';
import { MemberGraphDialog } from './dialogs/memberGraph/memberGraph';
import { dateFormatPipe } from '../../pipes/dateFormat.pipe';
import { EditUploadDialog } from './dialogs/editUpload/editUpload';
import { BulkTagDialog } from './dialogs/bulkTag/bulkTagDialog';
import { MergeTagsDialog } from './dialogs/mergeTags/mergeTagsDialog';
import { MergeMembersDialog } from './dialogs/mergeMembers/mergeMembersDialog';
import { CreateTagDialog } from './dialogs/createTag/createTagDialog';
import { TagPickerModule } from '../tagPicker/tagPicker.module';

const routes: Routes = [
  { path: '', component: MembershipComponent}
]

@NgModule({
    declarations: [EditUploadDialog, BulkTagDialog, MergeTagsDialog, MergeMembersDialog, CreateTagDialog, MembershipComponent, EditMemberDialog, MemberGraphDialog, dateFormatPipe],
    imports: [
        CommonModule,
        MaterialModule,
        CreateMemberDialog,
        UploadDialog,
        PassLabelPipe,
        TagPickerModule,
        RouterModule.forChild(routes),
    ]
})
export class MembershipModule { }
