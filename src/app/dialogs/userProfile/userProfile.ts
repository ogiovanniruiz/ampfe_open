import { Component, OnInit, OnDestroy, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from 'src/app/models/user.model';
import { UserService } from '../../services/user.service'
import { Organization } from 'src/app/models/organization.model';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { confirmAction } from '../confirmDialog/confirmDialog';

interface OrgMembership {
  name: string;
  level: string;
}

@Component({
    templateUrl: './userProfile.html',
    styleUrls: ['../../styles/dialog-common.scss', './userProfile.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class UserProfileDialog implements OnInit, OnDestroy {

  user: User;

  firstName: string = ''
  lastName: string = ''
  private originalFirstName: string = ''
  private originalLastName: string = ''

  firstNameError: string = ''
  lastNameError: string = ''
  errorMessage: string = ''
  saving: boolean = false

  orgMemberships: OrgMembership[] = []
  loadingOrgs: boolean = false

  // Opened from Manage all users with {user}: someone else's profile, not the signed-in user's
  viewingOther: boolean = false

  private subscriptions = new Subscription()

  constructor(public dialogRef: MatDialogRef<UserProfileDialog>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              private dialog: MatDialog,
              public userService: UserService,
              public orgService: OrganizationService,
              private snackBar: MatSnackBar
              ) {}

  get dirty(): boolean {
    return this.firstName.trim() !== this.originalFirstName || this.lastName.trim() !== this.originalLastName
  }

  get canSave(): boolean {
    return this.dirty && !this.saving
  }

  getUserProfile(){
    const self: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    const given: User = this.data?.user
    this.viewingOther = !!given && given._id !== self._id
    this.user = given || self
    this.originalFirstName = this.firstName = (this.user?.name?.firstName || '').trim()
    this.originalLastName = this.lastName = (this.user?.name?.lastName || '').trim()
  }

  // One request per org. Permissions without an orgID are skipped, and an org that is
  // missing (getOrg returns null) or fails to load still shows as a row
  getOrganizations(){
    const permissions = (this.user?.orgPermissions || []).filter(permission => permission?.orgID)
    if(!permissions.length) return

    this.loadingOrgs = true
    const lookups = permissions.map(permission =>
      this.orgService.getOrganization(permission.orgID).pipe(
        map((org: Organization) => ({name: org?.name || 'Unknown organization', level: permission.level})),
        catchError(() => of({name: 'Unknown organization', level: permission.level}))
      )
    )

    this.subscriptions.add(forkJoin(lookups).subscribe(
      memberships => {
        this.orgMemberships = memberships.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        this.loadingOrgs = false
      },
      error => {
        console.log(error)
        this.loadingOrgs = false
      }
    ))
  }

  levelLabel(level: string): string {
    const text = (level || '').replace(/_/g, ' ').toLowerCase()
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  save(){
    if(!this.canSave) return
    this.errorMessage = ''

    const firstName = this.firstName.trim()
    const lastName = this.lastName.trim()
    this.firstNameError = firstName ? '' : (this.viewingOther ? 'Enter a first name.' : 'Enter your first name.')
    this.lastNameError = lastName ? '' : (this.viewingOther ? 'Enter a last name.' : 'Enter your last name.')
    if(this.firstNameError || this.lastNameError) return

    // Send a copy so the session user only changes once the server accepts the update
    const updated: User = {...this.user, name: {...this.user.name, firstName, lastName}}

    this.saving = true
    this.userService.updateUser(updated).subscribe(
      (user: User) => {
        this.saving = false
        if(!user?._id){
          this.errorMessage = "Couldn't save the profile. Please try again."
          return
        }
        // Only the signed-in user's own profile is mirrored into the session
        if(!this.viewingOther) sessionStorage.setItem('user', JSON.stringify(user))
        this.dialogRef.close(user)
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = "Couldn't save the profile. Please try again."
      }
    )
  }

  copyID(){
    navigator.clipboard?.writeText(this.user._id!).then(
      () => this.snackBar.open('User ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  async close(){
    if(this.saving) return
    if(this.dirty && !(await confirmAction(this.dialog, {title: 'Discard changes?', message: 'Your name changes have not been saved.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true}))) return
    this.dialogRef.close()
  }

  ngOnInit(){
    this.getUserProfile()
    this.getOrganizations()

    // disableClose blocks Esc, so route it through close() to keep the unsaved-changes check
    this.subscriptions.add(this.dialogRef.keydownEvents().subscribe(event => {
      if(event.key === 'Escape') this.close()
    }))
  }

  ngOnDestroy(){
    this.subscriptions.unsubscribe()
  }

}
