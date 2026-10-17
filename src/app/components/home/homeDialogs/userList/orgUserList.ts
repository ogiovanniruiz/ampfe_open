import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

//SERVICES
import {UserService} from '../../../../services/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'

//MODELS
import {User} from '../../../../models/user.model'
import {canManageOrgUser, canTransferOwnership} from '../../../../utils/orgLevel'
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

export const ORG_LEVELS = [
  {value: 'OWNER', label: 'Owner', icon: 'verified_user'},
  {value: 'ADMINISTRATOR', label: 'Administrator', icon: 'admin_panel_settings'},
  {value: 'VOLUNTEER', label: 'Volunteer', icon: 'person'},
]

@Component({
    templateUrl: './orgUserList.html',
    styleUrls: ['./orgUserList.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class OrgUserListDialog implements OnInit{

  levels = ORG_LEVELS

  dev: boolean = false;
  currentUser: User;
  orgName: string = '';

  loading: boolean = false;
  loadFailed: boolean = false;
  errorMessage: string = ''

  members: User[] = []
  requests: User[] = []

  search: string = ''
  busyIDs = new Set<string>()
  selectedTab: number = 0

  userWasUpdated: boolean = false;

  constructor(public dialogRef: MatDialogRef<OrgUserListDialog>,
      @Inject(MAT_DIALOG_DATA) public orgID: string,
      public userService: UserService,
      public orgService: OrganizationService,
      private snackBar: MatSnackBar,
      private dialog: MatDialog) {}

  ngOnInit(){
    this.currentUser = JSON.parse(sessionStorage.getItem('user') || '{}')
    this.dev = !!this.currentUser?.dev
    this.orgName = sessionStorage.getItem('orgName') || ''
    this.load()
  }

  //////////////////////// LOAD ////////////////////////

  load(){
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''

    forkJoin({
      members: this.orgService.getOrgUsers(this.orgID),
      requests: this.orgService.getOrgUserRequests(this.orgID),
    }).subscribe(
      ({members, requests}) => {
        this.loading = false
        // You're listed first, then everyone else by name (the server sorts by first name)
        const list = (members as User[]) || []
        this.members = [...list.filter(u => this.isMe(u)), ...list.filter(u => !this.isMe(u))]
        this.requests = (requests as User[]) || []
        // Land on Requests when there are some waiting and the viewer can act on them
        if(this.requests.length && this.canApprove && !this.userWasUpdated) this.selectedTab = 1
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Failed to load team members due to a server error.'
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  isMe(user: User): boolean {
    return user._id === this.currentUser?._id
  }

  getOrgLevel(user: User): string | undefined {
    return (user.orgPermissions || []).find(p => p.orgID === this.orgID)?.level
  }

  levelLabel(level: string | undefined): string {
    return ORG_LEVELS.find(l => l.value === level)?.label || level || 'No role'
  }

  displayName(user: User): string {
    return user.name?.fullName?.trim() || [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ') || user.loginEmail || 'Unnamed user'
  }

  initials(user: User): string {
    const parts = this.displayName(user).split(/\s+/).filter(Boolean)
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
  }

  private matches(user: User): boolean {
    const term = this.search.trim().toLowerCase()
    if(!term) return true
    return [this.displayName(user), user.loginEmail].some(text => (text || '').toLowerCase().includes(term))
  }

  get filteredMembers(): User[] {
    return this.members.filter(u => this.matches(u))
  }

  get filteredRequests(): User[] {
    return this.requests.filter(u => this.matches(u))
  }

  trackUser(index: number, user: User){ return user._id }

  //////////////////////// PERMISSIONS ////////////////////////

  private get viewerLevel(): string | undefined {
    return this.getOrgLevel(this.currentUser)
  }

  // Older orgs may still list several owners; the first is shown
  get owner(): User | undefined {
    return this.members.find(u => this.getOrgLevel(u) === 'OWNER')
  }

  get hasOwner(): boolean {
    return !!this.owner
  }

  // One owner per org: a new owner is only set through Transfer ownership
  ownerOptionDisabled(user?: User): boolean {
    return this.hasOwner && (!user || this.getOrgLevel(user) !== 'OWNER')
  }

  canTransferTo(user: User): boolean {
    return this.hasOwner && this.getOrgLevel(user) !== 'OWNER' && canTransferOwnership(this.dev, this.viewerLevel)
  }

  // Front-end rules (utils/orgLevel); the server refuses removing the last owner and a second owner
  canManage(targetLevel: string | undefined, newLevel?: string): boolean {
    return canManageOrgUser(this.dev, this.viewerLevel, targetLevel, newLevel)
  }

  // You can't change your own role here (except developers)
  canEdit(user: User): boolean {
    return (!this.isMe(user) || this.dev) && this.canManage(this.getOrgLevel(user))
  }

  get canApprove(): boolean {
    return this.canManage(undefined, 'VOLUNTEER')
  }

  assignableLevels(user: User){
    const current = this.getOrgLevel(user)
    return ORG_LEVELS.filter(l => l.value === current || this.canManage(current, l.value))
  }

  //////////////////////// ACTIONS ////////////////////////

  setLevel(user: User, level: string){
    const current = this.getOrgLevel(user)
    if(level === current) return
    this.update(user, level, `${this.displayName(user)} is now ${this.levelLabel(level).toLowerCase() === 'owner' ? 'an owner' : 'a ' + this.levelLabel(level).toLowerCase()}.`)
  }

  async transferOwnership(user: User){
    if(!this.canTransferTo(user)) return
    const previous = this.owner
    const previousName = previous ? (this.isMe(previous) ? 'You' : this.displayName(previous)) : 'The current owner'
    if(!(await confirmAction(this.dialog, {title: `Make ${this.displayName(user)} the owner of ${this.orgName || 'this organization'}?`, message: `${previousName} will become an administrator.`, confirmLabel: 'Make owner', cancelLabel: 'Cancel'}))) return
    this.update(user, 'OWNER', `${this.displayName(user)} is now the owner.`, true)
  }

  async removeMember(user: User){
    if(!(await confirmAction(this.dialog, {title: `Remove ${this.displayName(user)} from ${this.orgName || 'this organization'}?`, message: "They'll lose access to its campaigns.", confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))) return
    this.update(user, 'REMOVE', `${this.displayName(user)} was removed.`)
  }

  approve(user: User, level: string = 'VOLUNTEER'){
    this.update(user, level, `${this.displayName(user)} joined as ${level === 'VOLUNTEER' ? 'a volunteer' : level === 'OWNER' ? 'an owner' : 'an administrator'}.`)
  }

  async decline(user: User){
    if(!(await confirmAction(this.dialog, {title: `Decline ${this.displayName(user)}'s request to join?`, confirmLabel: 'Decline', cancelLabel: 'Cancel', danger: true}))) return
    this.update(user, 'REMOVE', `Request from ${this.displayName(user)} declined.`)
  }

  private update(user: User, level: string, successMessage: string, transfer: boolean = false){
    if(this.busyIDs.has(user._id)) return
    const target = this.members.find(u => u._id === user._id)
    const allowed = transfer
      ? this.canTransferTo(user)
      : this.canManage(target ? this.getOrgLevel(target) : undefined, level === 'REMOVE' ? undefined : level)
    if(!allowed){
      this.errorMessage = 'You do not have permission to make this change.'
      return
    }

    this.busyIDs.add(user._id)
    this.errorMessage = ''

    this.userService.updateUserOrgLevel(user._id, this.orgID, level, transfer).subscribe(
      (result: any) => {
        this.busyIDs.delete(user._id)
        if(!result?.success){
          this.errorMessage = result?.msg || 'The change could not be saved.'
          return
        }
        this.userWasUpdated = true
        if(transfer && (result.previousOwnerIDs || []).includes(this.currentUser?._id)) this.demoteMeLocally()
        this.snackBar.open(successMessage, 'Dismiss', {duration: 3000})
        this.load()
      },
      error => {
        console.log(error)
        this.busyIDs.delete(user._id)
        this.errorMessage = 'Failed to update the user due to a server error.'
      }
    )
  }

  // Keeps the stored session in step after handing off ownership, so the app doesn't need a fresh login
  private demoteMeLocally(){
    const permission = (this.currentUser.orgPermissions || []).find(p => p.orgID === this.orgID)
    if(!permission) return
    permission.level = 'ADMINISTRATOR'
    sessionStorage.setItem('user', JSON.stringify(this.currentUser))
  }

  close(){
    if(this.busyIDs.size) return
    this.dialogRef.close(this.userWasUpdated)
  }
}
