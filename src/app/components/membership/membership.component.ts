import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import {MatDialog} from '@angular/material/dialog';
import { MatDrawer } from '@angular/material/sidenav';
import { Observable, Subject, Subscription } from 'rxjs';
import { SafeUrl } from '@angular/platform-browser';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {OrganizationService} from '../../services/organization/organization.service';
import {UploadDialog} from './dialogs/uploadMembership/uploadDialog';

import {MembershipService} from '../../services/membership.service';

import { EditUploadDialog } from './dialogs/editUpload/editUpload';
import { DuplicateGroup, MemberActivity, MemberPage, MemberSource, MemberSummary, Membership, MergeMembersResult } from 'src/app/models/person.model';
import { UpdatedOrg, Upload } from 'src/app/models/organization.model';

import { EditMemberDialog } from './dialogs/editMember/editMemberDialog';
import { BulkTagDialog } from './dialogs/bulkTag/bulkTagDialog';
import { MergeTagsDialog } from './dialogs/mergeTags/mergeTagsDialog';
import { MergeMembersDialog } from './dialogs/mergeMembers/mergeMembersDialog';
import { CreateTagDialog } from './dialogs/createTag/createTagDialog';
import { User } from 'src/app/models/user.model';
import { hasEmailConsent, hasTextingConsent } from 'src/app/utils/consent';
import { findDefinition, tagLabels } from 'src/app/utils/memberTags';
import { TagDefinition } from 'src/app/models/organization.model';
import { confirmAction } from '../../dialogs/confirmDialog/confirmDialog';

// Summary chips; each one toggles the matching server-side filter
const SUMMARY_CHIPS = [
  {filter: 'textable', label: 'Textable', icon: 'sms'},
  {filter: 'emailable', label: 'Emailable', icon: 'mail'},
  {filter: 'voter', label: 'Voter match', icon: 'how_to_vote'},
  {filter: 'noContact', label: 'No contact', icon: 'person_off'},
  {filter: 'invalidNumber', label: 'Invalid #', icon: 'phone_disabled'},
];

// Data health shortcuts: all members with one filter on (duplicates has its own view)
const HEALTH_ITEMS = [
  {filter: 'noContact', label: 'No contact info', icon: 'person_off'},
  {filter: 'invalidNumber', label: 'Invalid numbers', icon: 'phone_disabled'},
  {filter: 'notGeocoded', label: 'Not geocoded', icon: 'wrong_location'},
];

const ACTIVITY_ICONS = {Phonebank: 'call', Canvass: 'directions_walk', Texting: 'sms', Petition: 'draw'};

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class MembershipComponent implements OnInit, OnDestroy {

  displayErrorMsg: boolean = false;
  errorMessage: string = ""

  screenSize: string = '100%'

  uploads: Upload[] =[]
  tags: string[] = [];
  organizers: User[] = [];
  activities: MemberActivity[] = [];

  // The org's logo next to the list title; undefined while loading, null when there is none
  orgLogo$: Observable<SafeUrl | null | undefined>;
  orgName: string = '';

  readonly summaryChips = SUMMARY_CHIPS;
  readonly healthItems = HEALTH_ITEMS;

  // The page of members on screen; the server does the paging
  members: Membership[] = [];
  flatPersonHeaders: string[] = ["firstName", "middleName", "lastName", "email", "phone", "tags", "source", "added", "textable", "emailable"];
  displayedColumns: string[] = ["select", "name", "email", "phone", "reach", "source", "added", "tags", "actions"];

  source: MemberSource = {type: 'all'};
  search: string = '';
  filters: string[] = [];
  summary: MemberSummary;
  orgSummary: MemberSummary;
  duplicateGroups: DuplicateGroup[] = [];
  // Tags with values and colors, for chips and the Add tag menu
  tagDefinitions: TagDefinition[] = [];
  // In a tag's list: the values shown ('' = no value), and members per value
  tagValueFilter: string[] = [];
  valueCounts: {[value: string]: number} = {};
  // Duplicate groups checked for Merge selected, by signature
  selectedGroups = new Set<string>();

  // Selected members by id, kept across pages
  selected = new Map<string, Membership>();
  newBulkTag: string = '';

  currentPage: number = 0
  public pageSize: number = 10;
  public totalSize: number = 0;

  loadingData: boolean = false
  pageEvent: PageEvent;

  private searchInput = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private loadRequest: Subscription;

  @ViewChild(MatDrawer) drawer: MatDrawer;

  // Phones get an overlay drawer and member cards instead of the side drawer and table
  isMobile: boolean = window.innerWidth < 768;

  selectedUpload: Upload;
  selectedOrganizer: User;
  listName: string = "All members";

  constructor(
              public dialog: MatDialog,
              public orgService: OrganizationService,
              public memberService: MembershipService,
              private snackBar: MatSnackBar,
              ) { }

  ngOnInit() {
    this.subscriptions.push(
      this.searchInput.pipe(debounceTime(300), distinctUntilChanged()).subscribe(search => {
        this.search = search;
        this.currentPage = 0;
        this.loadMembers();
      })
    );

    this.orgLogo$ = this.orgService.getOrgLogoUrl(this.orgID || '');
    this.orgName = sessionStorage.getItem('orgName') || '';

    this.getUploads();
    this.getOrgTags();
    this.getOrganizers();
    this.getActivities();
    this.getOrgHealth();
    this.loadMembers();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.loadRequest?.unsubscribe();
  }

  get orgID(): string {
    return sessionStorage.getItem('orgID');
  }

  get listType(): string {
    return this.source.type;
  }

  ////////////////LOADING/////////////////////

  // Loads the current page of whichever list, search and filters are chosen
  loadMembers(){
    if(this.source.type === 'duplicates') return this.loadDuplicates();

    this.loadingData = true;
    this.loadRequest?.unsubscribe();
    this.loadRequest = this.memberService.getMembers(this.orgID, this.source, this.search, this.filters, this.currentPage, this.pageSize, false, this.tagValueFilter).subscribe(
      (result: MemberPage) => {
        this.members = result.members;
        this.totalSize = result.total;
        this.summary = result.summary;
        this.valueCounts = result.valueCounts || {};
        this.loadingData = false;
        this.displayErrorMsg = false;
      },
      error => this.serverError(error)
    )
  }

  // Opens a list from the sidebar, clearing search, filters and selection
  private openList(source: MemberSource, name: string, filters: string[] = []){
    this.closeDrawerOnMobile();
    this.source = source;
    this.listName = name;
    this.filters = filters;
    this.search = '';
    this.currentPage = 0;
    this.selected.clear();
    this.selectedGroups.clear();
    this.tagValueFilter = [];
    this.valueCounts = {};
    this.members = [];
    this.loadMembers();
  }

  showAllMembers(){
    this.openList({type: 'all'}, 'All members');
  }

  showHealth(item: {filter: string, label: string}){
    this.openList({type: 'all'}, item.label, [item.filter]);
  }

  // Counts for the Data health panel, across the whole org
  getOrgHealth(){
    this.memberService.getMembers(this.orgID, {type: 'all'}, '', [], 0, 1).subscribe(
      (result: MemberPage) => this.orgSummary = result.summary,
      error => console.log(error)
    );
    this.memberService.getDuplicateMembers(this.orgID).subscribe(
      (groups: DuplicateGroup[]) => this.duplicateGroups = groups,
      error => console.log(error)
    );
  }

  private serverError(error: any){
    console.log(error)
    this.displayErrorMsg = true;
    this.errorMessage = 'There was an issue with the server. Please refresh the page.';
    this.loadingData = false;
  }

  onSearch(value: string){
    this.searchInput.next(value.trim());
  }

  clearSearch(input: HTMLInputElement){
    input.value = '';
    this.searchInput.next('');
  }

  // The open tag's values (and "No value") with members per value, when the tag has values
  get tagValueChips(): {value: string, label: string, color: string, count: number, active: boolean}[] {
    if(this.listType !== 'tag') return []
    const definition = this.tagDefinition(this.listName)
    if(!definition?.values?.length) return []
    const chip = (value: string, label: string, color: string) =>
      ({value, label, color, count: this.valueCounts[value] || 0, active: this.tagValueFilter.includes(value)})
    return [...definition.values.map(v => chip(v.value, v.value, v.color)), chip('', 'No value', '')]
  }

  // The chips are rebuilt on every check; tracking by value keeps the buttons (and clicks on them) in place
  trackChip(index: number, chip: {value: string}){
    return chip.value
  }

  toggleTagValue(value: string){
    this.tagValueFilter = this.tagValueFilter.includes(value) ? this.tagValueFilter.filter(v => v !== value) : [...this.tagValueFilter, value];
    this.currentPage = 0;
    this.loadMembers();
  }

  clearTagValues(){
    this.tagValueFilter = [];
    this.currentPage = 0;
    this.loadMembers();
  }

  toggleFilter(filter: string){
    this.filters = this.filters.includes(filter) ? this.filters.filter(f => f !== filter) : [...this.filters, filter];
    this.currentPage = 0;
    this.loadMembers();
  }

  ////////////////UPLOAD FUNCTIONS/////////////////////

  getUploads(){
    this.memberService.getUploads(this.orgID).subscribe(
      (uploads: any)=>{
        this.uploads = uploads
      },
      error => this.serverError(error)
    )
  }

  getUploadMembershipList(upload: Upload){
    this.selectedUpload = upload;
    this.openList({type: 'upload', id: upload._id}, upload.uploadName);
    // An upload that just finished may now report tag values that didn't match, and may have added tags
    this.getUploads();
    this.getOrgTags();
  }

  // The open upload, as last loaded (its tag value mismatches come in when it finishes)
  get openUpload(): Upload | undefined {
    if(this.listType !== 'upload' || !this.selectedUpload) return undefined
    return this.uploads.find(u => u._id === this.selectedUpload._id) || this.selectedUpload
  }

  get uploadMissText(): string {
    return (this.openUpload?.tagValueMisses || []).map(m => `${m.label} "${m.value}" (${m.count})`).join(', ')
  }

  openCreateUploadMembershipListDialog(){
    // Full screen on phones; capped on desktop so the column mapping doesn't stretch across wide monitors
    const dialogRef = this.dialog.open(UploadDialog, this.isMobile
      ? {width: '100vw', maxWidth: '100vw', maxHeight: '100vh', autoFocus: false}
      : {width: this.screenSize, maxWidth: '880px', autoFocus: false});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getUploads()
        this.getOrgHealth()
        // A file can add new tags (the rest are written after this returns, so opening the upload refreshes again)
        this.getOrgTags()
      }
    });
  }

  openEditUploadDialog(upload: Upload){
    const dialogRef = this.dialog.open(EditUploadDialog, {width: this.screenSize, maxWidth: this.screenSize, autoFocus: false, data: upload});

    dialogRef.afterClosed().subscribe(result => {
      if(!result) return
      const isOpen = this.listType === 'upload' && this.selectedUpload?._id === upload._id;
      if(result === 'Deleted'){
        this.getUploads()
        this.getOrgHealth()
        if(isOpen) this.showAllMembers()
        return
      }
      this.memberService.getUploads(this.orgID).subscribe((uploads: any) => {
        this.uploads = uploads
        const renamed = this.uploads.find(u => u._id === upload._id);
        if(isOpen && renamed) this.listName = renamed.uploadName
      })
    });
  }

  async deleteUpload(){
    if((await confirmAction(this.dialog, {title: 'Delete this upload?', message: "Its data will be permanently deleted. This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))){

      this.memberService.deleteUpload(this.selectedUpload._id).subscribe(
        result =>{
            this.displayErrorMsg = false;
            this.snackBar.open('Upload deleted.', 'Dismiss', {duration: 3000});
            this.getUploads()
            this.getOrgHealth()
            this.showAllMembers()
        }
      )
    }
  }

  ////////////////ACTIVITY FUNCTIONS/////////////////////

  getActivities(){
    this.memberService.getMemberActivities(this.orgID).subscribe(
      (activities: MemberActivity[]) => this.activities = activities,
      error => this.serverError(error)
    )
  }

  getActivityMembershipList(activity: MemberActivity){
    this.openList({type: 'activity', id: activity._id}, activity.name);
  }

  activityIcon(activityType: string): string {
    return ACTIVITY_ICONS[activityType] ?? 'event';
  }

  ///////////////////TAG FUNCTIONS/////////////////////

  getTagMembershipList(tag: string){
    this.openList({type: 'tag', id: tag}, tag);
  }

  getOrgTags(){
    this.orgService.getOrgTags(this.orgID).subscribe(
      (tags: string[]) =>{
        this.tags = tags;
        this.getTagDefinitions();
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }
  getTagDefinitions(){
    this.orgService.getTagDefinitions(this.orgID).subscribe(
      (definitions: TagDefinition[]) => this.tagDefinitions = definitions || [],
      error => console.log(error)
    )
  }

  tagDefinition(label: string): TagDefinition | undefined {
    return findDefinition(label, this.tagDefinitions)
  }

  // A dot for the sidebar: the definition's middle value color, or its single color
  tagDot(label: string): string {
    const definition = this.tagDefinition(label)
    if(!definition) return ''
    const values = definition.values || []
    return values.length ? values[Math.floor((values.length - 1) / 2)].color : (definition.color || '')
  }


  // A tag with values and colors; its label joins the tag list straight away
  openCreateTagDialog(){
    this.closeDrawerOnMobile()
    const dialogRef = this.dialog.open(CreateTagDialog, {
      autoFocus: false,
      width: this.isMobile ? '100vw' : '560px',
      maxWidth: this.isMobile ? '100vw' : '94vw',
      maxHeight: this.isMobile ? '100dvh' : '90vh',
      data: {tags: [...this.tags]}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result) this.getOrgTags()
    });
  }

  // The open tag's name, values and colors; members and saved groups follow the changes
  openEditTagDialog(){
    const label = this.listName
    const dialogRef = this.dialog.open(CreateTagDialog, {
      autoFocus: false,
      width: this.isMobile ? '100vw' : '560px',
      maxWidth: this.isMobile ? '100vw' : '94vw',
      maxHeight: this.isMobile ? '100dvh' : '90vh',
      data: {tags: [...this.tags], label, definition: this.tagDefinition(label)}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(!result) return
      this.getOrgTags()
      if(result.label && result.label !== label) this.getTagMembershipList(result.label)
      else this.reloadCurrentList()
    });
  }

  // Tags every member of the chosen lists at once
  openBulkTagDialog(){
    this.closeDrawerOnMobile()
    const dialogRef = this.dialog.open(BulkTagDialog, {
      autoFocus: false,
      width: this.isMobile ? '100vw' : '560px',
      maxWidth: this.isMobile ? '100vw' : '94vw',
      maxHeight: this.isMobile ? '100dvh' : '90vh',
      data: {uploads: this.uploads, tags: this.tags, organizers: this.organizers, tagDefinitions: this.tagDefinitions}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getOrgTags()
        this.reloadCurrentList()
      }
    });
  }

  // Combines two or more tags under one name; the open tag list is preselected
  openMergeTagsDialog(){
    this.closeDrawerOnMobile()
    const dialogRef = this.dialog.open(MergeTagsDialog, {
      autoFocus: false,
      width: this.isMobile ? '100vw' : '560px',
      maxWidth: this.isMobile ? '100vw' : '94vw',
      maxHeight: this.isMobile ? '100dvh' : '90vh',
      data: {tags: [...this.tags], selected: this.listType === 'tag' ? this.listName : undefined}
    });
    dialogRef.afterClosed().subscribe(result => {
      if(!result) return
      this.getOrgTags()
      // The open tag was merged away: show the merged tag instead
      if(this.listType === 'tag' && (result.removed || []).includes(this.listName)){
        this.getTagMembershipList(result.tag)
      } else {
        this.reloadCurrentList()
      }
    });
  }

  async deleteTag(){
    if(!(await confirmAction(this.dialog, {title: 'Remove this tag from all of your data?', message: "This can't be undone.", confirmLabel: 'Remove tag', cancelLabel: 'Cancel', danger: true}))){
      return
    }

    this.orgService.deleteTag(this.orgID, this.listName).subscribe(
      (results: UpdatedOrg) =>{
        this.displayErrorMsg = false;
        this.snackBar.open('Tag removed.', 'Dismiss', {duration: 3000});
        this.getOrgTags();
        this.showAllMembers();
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  ////////////////ORGANIZER FUNCTIONS//////////////////

  getOrganizers(){
    this.orgService.getOrgUsers(this.orgID).subscribe(
      (users: User[]) => {
        this.organizers = users
      },
      error => this.serverError(error)
    )
  }

  organizerName(user: User): string {
    const name = [user.name?.firstName, user.name?.lastName].filter(part => part).join(' ');
    return name || user.loginEmail;
  }

  getOrganizerMembershipList(user: User){
    this.selectedOrganizer = user;
    this.openList({type: 'organizer', id: user._id}, this.organizerName(user));
  }

  ////////////////DUPLICATES//////////////////

  showDuplicates(){
    this.openList({type: 'duplicates'}, 'Possible duplicates');
  }

  private loadDuplicates(){
    this.loadingData = true;
    this.memberService.getDuplicateMembers(this.orgID).subscribe(
      (groups: DuplicateGroup[]) => {
        this.duplicateGroups = groups;
        this.totalSize = groups.length;
        // Keep checks only on groups that are still listed
        const signatures = new Set(groups.map(g => g.signature));
        this.selectedGroups.forEach(signature => { if(!signatures.has(signature)) this.selectedGroups.delete(signature) });
        this.loadingData = false;
        this.displayErrorMsg = false;
      },
      error => this.serverError(error)
    )
  }

  async deleteOneMember(member: Membership){
    if(!(await confirmAction(this.dialog, {title: `Delete ${this.fullName(member) || 'this member'}?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return
    this.memberService.bulkUpdateMembers(this.orgID, [member._id], 'delete').subscribe(
      () => this.afterMembersChanged(),
      error => this.serverError(error)
    )
  }

  toggleGroup(group: DuplicateGroup){
    this.selectedGroups.has(group.signature) ? this.selectedGroups.delete(group.signature) : this.selectedGroups.add(group.signature);
  }

  get allGroupsSelected(): boolean {
    return this.duplicateGroups.length > 0 && this.duplicateGroups.every(g => this.selectedGroups.has(g.signature));
  }

  toggleAllGroups(){
    const select = !this.allGroupsSelected;
    this.duplicateGroups.forEach(g => select ? this.selectedGroups.add(g.signature) : this.selectedGroups.delete(g.signature));
  }

  // Merges one group into the member the user picks
  openMergeMembersDialog(group: DuplicateGroup){
    const sources = {};
    group.members.forEach(m => sources[m._id] = this.sourceLabel(m));
    const dialogRef = this.dialog.open(MergeMembersDialog, {
      autoFocus: false,
      width: this.isMobile ? '100vw' : '560px',
      maxWidth: this.isMobile ? '100vw' : '94vw',
      maxHeight: this.isMobile ? '100dvh' : '90vh',
      data: {group, sources}
    });
    dialogRef.afterClosed().subscribe((result: MergeMembersResult) => {
      if(result) this.afterMembersChanged()
    });
  }

  // Merges every checked group; each keeps its oldest member
  async mergeSelectedGroups(){
    const groups = this.duplicateGroups.filter(g => this.selectedGroups.has(g.signature));
    if(!groups.length) return
    const count = groups.length === 1 ? '1 group' : `${groups.length} groups`;
    if(!(await confirmAction(this.dialog, {title: `Merge ${count}?`, message: "Each keeps its oldest member and the others are removed. This can't be undone.", confirmLabel: 'Merge', cancelLabel: 'Cancel', danger: true}))) return

    this.loadingData = true;
    this.memberService.mergeMembers(this.orgID, groups.map(g => ({memberIDs: g.members.map(m => m._id)}))).subscribe(
      (result: MergeMembersResult) => {
        if(!result?.success) alert(result?.msg || 'These members could not be merged.');
        this.selectedGroups.clear();
        this.afterMembersChanged();
      },
      error => this.serverError(error)
    )
  }

  // Marks a group as different people (e.g. a household sharing a phone) so it stops showing
  async dismissGroup(group: DuplicateGroup){
    if(!(await confirmAction(this.dialog, {title: `Mark these ${group.members.length} members as different people?`, message: "They won't show as possible duplicates again.", confirmLabel: 'Mark as different', cancelLabel: 'Cancel'}))) return
    this.memberService.dismissDuplicateGroup(this.orgID, group.members.map(m => m._id), group.reason).subscribe(
      (result: {success: boolean, msg?: string}) => {
        if(!result?.success) alert(result?.msg || 'This group could not be updated.');
        this.selectedGroups.delete(group.signature);
        this.afterMembersChanged();
      },
      error => this.serverError(error)
    )
  }

  ////////////////SELECTION & BULK ACTIONS//////////////////

  isSelected(member: Membership): boolean {
    return this.selected.has(member._id);
  }

  toggleMember(member: Membership){
    this.isSelected(member) ? this.selected.delete(member._id) : this.selected.set(member._id, member);
  }

  get pageAllSelected(): boolean {
    return this.members.length > 0 && this.members.every(m => this.selected.has(m._id));
  }

  get pageSomeSelected(): boolean {
    return this.members.some(m => this.selected.has(m._id)) && !this.pageAllSelected;
  }

  togglePage(){
    const select = !this.pageAllSelected;
    this.members.forEach(m => select ? this.selected.set(m._id, m) : this.selected.delete(m._id));
  }

  // Selects every member matching the current list, search and filters, not just this page
  selectAllMatching(){
    this.loadingData = true;
    this.memberService.getMembers(this.orgID, this.source, this.search, this.filters, 0, this.pageSize, true, this.tagValueFilter).subscribe(
      (result: MemberPage) => {
        result.members.forEach(m => this.selected.set(m._id, m));
        this.loadingData = false;
      },
      error => this.serverError(error)
    )
  }

  clearSelection(){
    this.selected.clear();
  }

  // Tags on any selected member, for the Remove tag menu
  get selectedTags(): string[] {
    const tags = new Set<string>();
    this.selected.forEach(m => tagLabels(m.tags).forEach(tag => tags.add(tag)));
    return [...tags].sort();
  }

  // value: one of the tag's values when it has them (empty for none)
  async bulkAction(action: 'addTag' | 'removeTag' | 'delete', tag: string = '', value: string = ''){
    const ids = [...this.selected.keys()];
    if(!ids.length) return
    tag = tag.trim();
    if(action !== 'delete' && !tag) return
    if(action === 'delete' && !(await confirmAction(this.dialog, {title: `Delete ${ids.length} ${ids.length === 1 ? 'member' : 'members'}?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.loadingData = true;
    this.memberService.bulkUpdateMembers(this.orgID, ids, action, tag, value).subscribe(
      (result: any) => {
        if(!result.success){
          this.loadingData = false;
          this.displayErrorMsg = true;
          this.errorMessage = result.msg;
          return
        }
        this.newBulkTag = '';
        this.selected.clear();
        if(action !== 'delete') this.getOrgTags();
        this.afterMembersChanged();
      },
      error => this.serverError(error)
    )
  }

  /////////////////////////////////////////////////////////

  get listTypeLabel(): string {
    const labels = {all: 'Organization', upload: 'Upload', tag: 'Tag', organizer: 'Added by organizer', activity: 'Activity', duplicates: 'Data health'};
    return labels[this.listType] ?? '';
  }

  fullName(member: Membership): string {
    const name = member.resident?.name;
    return [name?.firstName, name?.middleName, name?.lastName].filter(part => part).join(' ');
  }

  isTextable(member: Membership): boolean {
    return !!this.memberPhone(member) && hasTextingConsent(member);
  }

  isEmailable(member: Membership): boolean {
    return !!this.memberEmail(member) && hasEmailConsent(member);
  }

  // Where the member came from: their upload, the activity that added them, or how they were entered
  sourceLabel(member: Membership): string {
    const enrollment = member.enrollment;
    if(!enrollment?.source) return '';
    if(enrollment.source === 'Upload'){
      return this.uploads.find(u => u._id === enrollment.sourceID)?.uploadName || 'Upload';
    }
    if(enrollment.source === 'Manual') return 'Added manually';
    return this.activities.find(a => a._id === enrollment.sourceID)?.name || enrollment.source;
  }

  addedDate(member: Membership): Date | undefined {
    return member.enrollment?.dateCreated;
  }

  openEditMemberDialog(member: Membership){
      const dialogRef = this.dialog.open(EditMemberDialog, {data: member, width: this.screenSize, maxWidth: this.screenSize, autoFocus: false});
      dialogRef.afterClosed().subscribe(result => {
        if(result) this.afterMembersChanged()
      });
  }

  // Members were edited or deleted: refresh the open list and the counts that depend on it
  private afterMembersChanged(){
    this.loadMembers();
    this.getOrgHealth();
    this.getActivities();
  }

  // Reloads whichever list is open so changed members and tags show
  private reloadCurrentList(){
    this.loadMembers();
  }

  // Exports the selected members, or the whole list with its search and filters
  exportMembershipList(){
    if(this.selected.size > 0){
      this.downloadCsv([...this.selected.values()], `${this.listName || 'community_membership_list'}_selected`);
      return
    }

    this.loadingData = true;
    this.memberService.getMembers(this.orgID, this.source, this.search, this.filters, 0, this.pageSize, true, this.tagValueFilter).subscribe(
      (result: MemberPage) => {
        this.loadingData = false;
        if(result.members.length === 0){
          this.displayErrorMsg = true;
          this.errorMessage = 'There are no members to export.';
          return
        }
        this.downloadCsv(result.members, this.listName || 'community_membership_list');
      },
      error => this.serverError(error)
    )
  }

  private downloadCsv(members: Membership[], filename: string){
    const headers = this.flatPersonHeaders;

    const rows = members.map(member => [
      member.resident?.name?.firstName ?? "",
      member.resident?.name?.middleName ?? "",
      member.resident?.name?.lastName ?? "",
      member.resident?.emails?.[0] ?? "",
      member.resident?.phones?.[0]?.number ?? "",
      (member.tags ?? []).map(tag => tag.value ? `${tag.label}: ${tag.value}` : tag.label).join('; '),
      this.sourceLabel(member),
      this.addedDate(member) ? new Date(this.addedDate(member)).toLocaleDateString() : "",
      this.isTextable(member) ? "yes" : "no",
      this.isEmailable(member) ? "yes" : "no",
    ]);

    const csvContent =
    [headers, ...rows]
      .map(row => row.map(escapeCsvField).join(","))
      .join("\n");

    let downloadLink = document.createElement('a');

    let blob = new Blob([csvContent], {type: 'blob'});
    downloadLink.href = window.URL.createObjectURL(blob);

    downloadLink.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  ////////////////////////////////////////////////

  ngAfterContentInit() {
    this.screenSize = window.innerWidth < 768 ? "100%" : "75%";
  }

  @HostListener("window:resize", []) updateDays() {
    this.isMobile = window.innerWidth < 768;
    this.screenSize = window.innerWidth < 768 ? "100%" : "75%";
  }

  openLists(){
    this.drawer?.open()
  }

  closeDrawerOnMobile(){
    if(this.isMobile) this.drawer?.close()
  }

  memberPhone(member: any): string {
    return member.resident?.phones?.[0]?.number || ''
  }

  memberEmail(member: any): string {
    return member.resident?.emails?.[0] || ''
  }

  public handlePage(e?:PageEvent) {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadMembers();
    return e;
  }
}

function escapeCsvField(field){
  const str = String(field);
  // Quote only if the field contains comma, quote, or newline
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
