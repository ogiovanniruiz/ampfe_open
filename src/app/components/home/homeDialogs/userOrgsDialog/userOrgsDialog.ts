import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

//MODELS
import { User } from 'src/app/models/user.model';

//SERVICES
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { UserService } from 'src/app/services/user.service';

interface OrgRow {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
  subscription?: string;
  memberCount: number;
  // The user's level in the org; null when a developer isn't a member
  level: string | null;
}

const LEVEL_LABELS: {[level: string]: string} = {
  OWNER: 'Owner',
  ADMINISTRATOR: 'Administrator',
  VOLUNTEER: 'Volunteer',
}

// Search shows up once the list is long enough to need it
const SEARCH_THRESHOLD = 8

@Component({
    templateUrl: './userOrgsDialog.html',
    styleUrls: ['../../../campaign-map/dialogs/groups/otherGroups/otherGroupsDialog.scss', './userOrgsDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class UserOrgsDialog implements OnInit{

    user: User;
    dev: boolean = false;

    activeOrgs: OrgRow[] = []
    inactiveOrgs: OrgRow[] = []

    loading: boolean = false
    loadFailed: boolean = false
    errorMessage: string = ''

    search: string = ''
    switchingID: string = ''

    constructor(
        public orgService: OrganizationService,
        public dialogRef: MatDialogRef<UserOrgsDialog>,
        public userService: UserService,
        private snackBar: MatSnackBar,
        ) {}

    ngOnInit(){
      this.user = JSON.parse(sessionStorage.getItem('user') || '{}')
      this.dev = !!this.user?.dev
      this.getUserOrganizations()
    }

    getUserOrganizations(){
      this.loading = true
      this.loadFailed = false
      this.errorMessage = ''

      this.orgService.getOrgPermissions(this.user?._id).subscribe(
        (orgs: OrgRow[]) => {
          this.loading = false
          // Current org first, then by name (the server sorts by name)
          const sorted = [...(orgs || [])].sort((a, b) => Number(this.isHome(b)) - Number(this.isHome(a)))
          this.activeOrgs = sorted.filter(org => org.active)
          this.inactiveOrgs = sorted.filter(org => !org.active)
        },
        error => {
          console.log(error)
          this.loading = false
          this.loadFailed = true
          this.errorMessage = 'There was a problem loading your organizations.'
        }
      )
    }

    //////////////////////// DISPLAY ////////////////////////

    isHome(org: OrgRow): boolean {
      return org._id === this.user?.homeOrgID
    }

    levelLabel(org: OrgRow): string {
      return org.level ? (LEVEL_LABELS[org.level] || org.level) : ''
    }

    get showSearch(): boolean {
      return this.activeOrgs.length + this.inactiveOrgs.length > SEARCH_THRESHOLD
    }

    private matches(org: OrgRow): boolean {
      const term = this.search.trim().toLowerCase()
      if(!term) return true
      return [org.name, org.description, org._id].some(text => (text || '').toLowerCase().includes(term))
    }

    get filteredActive(): OrgRow[] {
      return this.activeOrgs.filter(org => this.matches(org))
    }

    get filteredInactive(): OrgRow[] {
      return this.inactiveOrgs.filter(org => this.matches(org))
    }

    trackOrg(index: number, org: OrgRow){ return org._id }

    //////////////////////// ACTIONS ////////////////////////

    enterOrganization(org: OrgRow){
      if(this.switchingID) return
      if(this.isHome(org)){
        this.dialogRef.close()
        return
      }

      this.switchingID = org._id
      this.errorMessage = ''

      this.userService.updateHomeOrg(org._id, this.user._id).subscribe(
        (user: User) => {
          this.switchingID = ''
          if(!user){
            this.errorMessage = `Couldn't switch to "${org.name}". You may no longer be a member.`
            return
          }
          sessionStorage.setItem('user', JSON.stringify(user))
          sessionStorage.setItem('orgName', org.name)
          sessionStorage.setItem('orgID', org._id)
          this.snackBar.open(`Switched to "${org.name}".`, 'Dismiss', {duration: 2500})
          this.dialogRef.close(user)
        },
        error => {
          console.log(error)
          this.switchingID = ''
          this.errorMessage = `Couldn't switch to "${org.name}". Please try again.`
        }
      )
    }

    copyID(org: OrgRow, event: Event){
      event.stopPropagation()
      navigator.clipboard?.writeText(org._id).then(
        () => this.snackBar.open('Organization ID copied.', 'Dismiss', {duration: 2500}),
        () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
      )
    }

    openRequestOrganizationDialog(){
      if(this.switchingID) return
      this.dialogRef.close('openRequestOrgDialog')
    }

    closeDialog(){
      if(this.switchingID) return
      this.dialogRef.close()
    }
}
