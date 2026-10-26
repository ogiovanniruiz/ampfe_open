import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, loadErrorText } from 'src/app/utils/loading';
import {UserService} from '../../../../services/user.service';
import {CampaignService} from '../../../../services/campaign.service';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {User} from '../../../../models/user.model';
import {Organization, UpdatedOrg} from '../../../../models/organization.model';
import {Campaign} from '../../../../models/campaign.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './permissionsDialog.html',
    styleUrls: ['../../campaignMap.component.scss', './permissionsDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class PermissionsDialog implements OnInit {

  campaignOrgs: Organization[] = [];
  requests: Organization[] = [];
  allOrgUsers: User[] = [];
  campaign: Campaign;
  campaignID: number;

  displayErrorMsg = false;
  errorMessage = '';

  loadingOrgs: boolean = true;
  loadingMembers: boolean = true;
  loadingRequests: boolean = true;
  loadFailed: boolean = false;

  // Rows with a request in flight
  savingUserIDs = new Set<string>();
  busyOrgIDs = new Set<string>();

  userSearch: string = '';
  orgSearch: string = '';

  currentUserID: string;

  constructor(public dialogRef: MatDialogRef<PermissionsDialog>,
              @Inject(MAT_DIALOG_DATA) public data: User,
              public userService: UserService,
              public campaignService: CampaignService,
              public orgService: OrganizationService,
              public dialog: MatDialog,
              private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'));
    this.currentUserID = JSON.parse(sessionStorage.getItem('user') || '{}')._id;
    this.reload();
  }

  reload(){
    this.displayErrorMsg = false;
    this.loadFailed = false;
    this.getCampaign();
    this.getCampaignOrgs();
    this.getCampaignRequests();
  }

  return(){
    this.dialogRef.close()
  }

  private fail(error?: any, message: string = 'There was a problem with the server.'){
    if(error) console.log(error);
    this.displayErrorMsg = true;
    this.errorMessage = message;
    this.loadingOrgs = false;
    this.loadingMembers = false;
    this.loadingRequests = false;
  }

  // A failed load shows Retry; the other sections keep loading
  private loadFail(error: any, what: string){
    console.log(error);
    this.loadFailed = true;
    this.displayErrorMsg = true;
    this.errorMessage = loadErrorText(what, error);
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 4000});
  }

  //////////////////////// LOADING ////////////////////////

  getCampaign(){
    this.campaignService.getCampaign(this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (campaign: Campaign) => { this.campaign = campaign },
      error => this.loadFail(error, 'the campaign')
    );
  }

  getCampaignOrgs() {
    this.loadingOrgs = true;
    this.orgService.getCampaignOrgs(this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (orgs: Organization[]) => {
        this.campaignOrgs = orgs || [];
        this.loadingOrgs = false;
        this.getUserslist();
      },
      error => {
        // Members load after orgs, so they stop too
        this.loadingOrgs = false;
        this.loadingMembers = false;
        this.loadFail(error, 'the organizations');
      }
    );
  }

  getCampaignRequests() {
    this.loadingRequests = true;
    this.campaignService.getCampaignRequests(this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (requests: Organization[]) => {
        this.requests = requests || [];
        this.loadingRequests = false;
      },
      error => {
        this.loadingRequests = false;
        this.loadFail(error, 'the requests');
      }
    );
  }

  // Only the admins and owners of this campaign's orgs, fetched server-side
  getUserslist() {
    this.loadingMembers = true;
    this.campaignService.getCampaignPermissionUsers(this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (users: User[]) => {
        this.allOrgUsers = users || [];
        this.loadingMembers = false;
      },
      error => {
        this.loadingMembers = false;
        this.loadFail(error, 'the members');
      }
    );
  }

  //////////////////////// DATA MANAGERS ////////////////////////

  isDataManager(user: User): boolean {
    return ((user.dataManager || []) as number[]).includes(this.campaignID);
  }

  isSelf(user: User): boolean {
    return user._id === this.currentUserID;
  }

  get dataManagerCount(): number {
    return this.allOrgUsers.filter(user => this.isDataManager(user)).length;
  }

  // Names of this campaign's orgs the user administers
  orgNames(user: User): string[] {
    const orgIDs = (user.orgPermissions || []).filter(p => p.level !== 'VOLUNTEER').map(p => p.orgID);
    return this.campaignOrgs.filter(org => orgIDs.includes(org._id)).map(org => org.name);
  }

  initials(user: User): string {
    const first = user.name?.firstName?.charAt(0) || '';
    const last = user.name?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || (user.loginEmail?.charAt(0) || '?').toUpperCase();
  }

  get filteredUsers(): User[] {
    const search = this.userSearch.trim().toLowerCase();
    if(!search) return this.allOrgUsers;
    return this.allOrgUsers.filter(user =>
      [user.name?.fullName, user.loginEmail, ...this.orgNames(user)].join(' ').toLowerCase().includes(search));
  }

  async setDataManager(user: User, enabled: boolean, toggle?: any) {
    if(this.isSelf(user) && !enabled &&
       !(await confirmAction(this.dialog, {title: 'Remove yourself as a data manager?', message: "You'll lose access to campaign permissions and other data manager tools for this campaign.", confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))){
      if(toggle) toggle.checked = true;
      return;
    }

    this.savingUserIDs.add(user._id);

    this.userService.updateDataManager(user, this.campaignID, enabled).subscribe(
      (updated: User) => {
        this.savingUserIDs.delete(user._id);

        if(!updated){
          if(toggle) toggle.checked = !enabled;
          this.fail(undefined, 'The data manager setting could not be saved.');
          return;
        }

        const index = this.allOrgUsers.findIndex(u => u._id === updated._id);
        if(index >= 0) this.allOrgUsers[index] = {...this.allOrgUsers[index], ...updated};

        // Keep this session's own permissions in step with the change
        if(this.isSelf(user)){
          const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
          sessionUser.dataManager = updated.dataManager || [];
          sessionStorage.setItem('user', JSON.stringify(sessionUser));
        }

        this.notify(`${user.name?.fullName || user.loginEmail} is ${enabled ? 'now' : 'no longer'} a data manager.`);
      },
      error => {
        this.savingUserIDs.delete(user._id);
        if(toggle) toggle.checked = !enabled;
        this.fail(error, 'The data manager setting could not be saved.');
      }
    );
  }

  //////////////////////// ORGANIZATIONS ////////////////////////

  isCreatorOrg(org: Organization): boolean {
    return !!this.campaign?.creatorOrg && this.campaign.creatorOrg === org._id;
  }

  get filteredOrgs(): Organization[] {
    const search = this.orgSearch.trim().toLowerCase();
    if(!search) return this.campaignOrgs;
    return this.campaignOrgs.filter(org => [org.name, org.description].join(' ').toLowerCase().includes(search));
  }

  async removeOrg(org: Organization) {
    // The organization that owns the campaign can't be removed from it
    if(this.isCreatorOrg(org)) return;
    if(!(await confirmAction(this.dialog, {title: `Remove ${org.name} from this campaign?`, message: 'Its members will lose access.', confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))) return;

    this.busyOrgIDs.add(org._id);
    this.campaignService.removeOrg(this.campaignID, org._id).subscribe(
      (updatedOrg: UpdatedOrg) => {
        this.busyOrgIDs.delete(org._id);
        if (updatedOrg?.success) {
          this.notify(`${org.name} removed.`);
          this.getCampaignOrgs();
          return;
        }
        this.fail(undefined, `${org.name} could not be removed.`);
      },
      error => {
        this.busyOrgIDs.delete(org._id);
        this.fail(error);
      }
    );
  }

  //////////////////////// REQUESTS ////////////////////////

  manageRequest(org: Organization, action: 'APPROVE' | 'DENY') {
    this.busyOrgIDs.add(org._id);
    this.campaignService.manageCampaignRequest(this.campaignID, org._id, action).subscribe(
      (campaign: Campaign) => {
        this.busyOrgIDs.delete(org._id);
        if (campaign) {
          this.notify(action === 'APPROVE' ? `${org.name} approved.` : `${org.name}'s request denied.`);
          this.getCampaignOrgs();
          this.getCampaignRequests();
          return;
        }
        this.fail(undefined, 'The request could not be updated.');
      },
      error => {
        this.busyOrgIDs.delete(org._id);
        this.fail(error);
      }
    );
  }

  trackByID(index: number, item: any){ return item._id }
}
