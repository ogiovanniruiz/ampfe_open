import { Component, OnInit, AfterViewInit, ViewChild, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserProfileDialog } from '../../../../dialogs/userProfile/userProfile';
import { MatSnackBar } from '@angular/material/snack-bar';

//SERVICES
import { UserService } from '../../../../services/user.service'

//MODELS
import { User } from '../../../../models/user.model'
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './manageAllUsers.html',
    styleUrls: ['../../home.component.scss', './manageAllUsers.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class ManageAllUsersDialog implements OnInit, AfterViewInit {

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['user', 'dev', 'actions'];

  searchText: string = "";
  devsOnly: boolean = false;
  savingIds = new Set<string>();

  errorMessage: string = ""
  displayErrorMsg: boolean = false;

  loading: boolean = true;

  constructor(public dialogRef: MatDialogRef<ManageAllUsersDialog>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public userService: UserService,
              private snackBar: MatSnackBar,
              private dialog: MatDialog) {}

  ngOnInit(){
    this.dataSource.sortingDataAccessor = (user: User, column: string) => {
      switch (column) {
        case 'user': return this.fullName(user).toLowerCase();
        case 'dev': return user.dev ? 1 : 0;
        default: return '';
      }
    };

    this.dataSource.filterPredicate = (user: User, filter: string) => {
      const {text, devsOnly} = JSON.parse(filter);
      if (devsOnly && !user.dev) return false;
      if (!text) return true;
      const haystack = (this.fullName(user) + ' ' + (user.loginEmail || '') + ' ' + (user._id || '')).toLowerCase();
      return haystack.includes(text);
    };

    this.getAllUsers();
  }

  ngAfterViewInit(){
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  closeSettings(){
    this.dialogRef.close()
  }

  get totalCount(): number {
    return this.dataSource.data.length;
  }

  get devCount(): number {
    return this.dataSource.data.filter(user => user.dev).length;
  }

  fullName(user: User): string {
    return [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ');
  }

  initials(user: User): string {
    const first = user.name?.firstName?.charAt(0) || '';
    const last = user.name?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || (user.loginEmail?.charAt(0) || '?').toUpperCase();
  }

  applyFilter(){
    this.dataSource.filter = JSON.stringify({text: this.searchText.trim().toLowerCase(), devsOnly: this.devsOnly});
    this.dataSource.paginator?.firstPage();
  }

  clearSearch(){
    this.searchText = "";
    this.applyFilter();
  }

  getAllUsers(){
    this.loading = true;
    this.userService.getAllUsers().subscribe(
      (users: User[]) => {
        this.dataSource.data = users;
        this.applyFilter();
        this.loading = false;
      },
      error =>{
        this.loading = false;
        this.displayErrorMsg = true;
        this.errorMessage = "A problem with the server prevented User list fetch."
        console.log(error)
      }
    )
  }

  // Same profile dialog users open for themselves; saved name changes update this row
  openProfile(user: User){
    const dialogRef = this.dialog.open(UserProfileDialog, {autoFocus: false, disableClose: true, width: '520px', maxWidth: '94vw', data: {user}})
    dialogRef.afterClosed().subscribe((updated: User) => {
      if(!updated?._id) return
      this.dataSource.data = this.dataSource.data.map(u => u._id === updated._id ? {...u, name: updated.name} : u)
      this.notify(`Saved ${this.fullName(updated) || updated.loginEmail}'s profile.`)
    })
  }

  updateDevStatus(user: User, developer: boolean){
    const previous = user.dev;
    user.dev = developer;
    this.savingIds.add(user._id!);

    this.userService.updateDevStatus(user, developer).subscribe(
      (updated: User) =>{
        this.savingIds.delete(user._id!);
        if(!updated){
          user.dev = previous;
          this.notify("Developer status was not updated.");
          return;
        }
        this.notify(`${this.fullName(user) || user.loginEmail} is ${developer ? 'now' : 'no longer'} a developer.`);
      },
      error=>{
        this.savingIds.delete(user._id!);
        user.dev = previous;
        this.notify("A problem with the server prevented User Update.");
        console.log(error)
      }
    )
  }

  async resetPassword(user: User){
    if(!(await confirmAction(this.dialog, {title: `Reset the password for ${user.loginEmail}?`, message: 'They will be emailed a link to set a new password.', confirmLabel: 'Reset password', cancelLabel: 'Cancel'}))) return;

    this.loading = true;
    this.userService.passwordReset(user.loginEmail, window.location.origin).subscribe(
      result =>{
        this.loading = false;
        this.notify(result ? (result['msg'] || "Password reset email sent.") : "A problem with the server prevented Password Reset.");
      },
      error =>{
        this.loading = false;
        this.notify("A problem with the server prevented Password Reset.");
        console.log(error)
      })
  }

  async deleteUser(user: User){
    if(!(await confirmAction(this.dialog, {title: `Permanently delete ${user.loginEmail}?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return;

    this.loading = true;
    this.userService.deleteUser(user._id!).subscribe(
      () =>{
        this.loading = false;
        this.dataSource.data = this.dataSource.data.filter(u => u._id !== user._id);
        this.notify(`${user.loginEmail} was deleted.`);
      },
      error =>{
        this.loading = false;
        this.notify("A problem with the server prevented User deletion.");
        console.log(error)
      }
    )
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 4000});
  }
}
