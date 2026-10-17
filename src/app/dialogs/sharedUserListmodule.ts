import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserOrgsDialog } from '../components/home/homeDialogs/userOrgsDialog/userOrgsDialog';
import { MaterialModule } from '../material.module';

@NgModule({
  declarations: [UserOrgsDialog],
  imports: [
    CommonModule,
    MaterialModule,
  ],
  exports: [UserOrgsDialog]
})
export class SharedUserListModule { }