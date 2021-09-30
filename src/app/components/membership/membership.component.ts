import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import {MatDialog} from '@angular/material/dialog';
import {CreateMemberDialog} from './dialogs/createMember/createMemberDialog';
import {EditMemberDialog} from './dialogs/editMember/editMemberDialog';
import {OrganizationService} from '../../services/organization/organization.service';
import {UploadDialog} from './dialogs/uploadMembership/uploadDialog';

import {TagManagementDialog} from './dialogs/tags/tagsDialog';
import {MemberGraphDialog} from './dialogs/memberGraph/memberGraph';
import {UploadsManagerDialog} from './dialogs/uploadsManager/uploadsManagerDialog';
import {MembershipService} from '../../services/membership/membership.service';

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss']
})
export class MembershipComponent implements OnInit {

  displayErrorMsg: boolean = false;
  errorMessage: string = ""

  uploading = false;
  members = [];

  sortedMembers;
  pageEvent: PageEvent;

  currentPage: number = 0
  public pageSize: number = 10;
  public totalSize: number = 0;

  uploadDuplicatesList = [];
  uploadDuplicates = [];

  loadingData: boolean = false

  filterByValue = 'firstName'

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

  constructor(
              public dialog: MatDialog,
              public orgService: OrganizationService,
              public memberService: MembershipService
              ) { }

  getMembers(){
    var orgID: string = sessionStorage.getItem('orgID');
    this.loadingData = true

    this.memberService.getMembers(orgID).subscribe(
      (members: Object[]) => {
        this.members = members;
        this.totalSize = this.members.length;
        this.iterator();
        
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server. Please refresh.';
      }
    );
  }


  applyFilter(value: string) {
    const end = (this.currentPage + 1) * this.pageSize;
    const start = this.currentPage * this.pageSize;
    if (value) {
      this.sortedMembers  = this.members.filter(member => 
        member.resident.name[this.filterByValue].toLowerCase().startsWith(value.toLowerCase())
      ).slice(start, end);

    } else {
      this.sortedMembers = this.members.slice(start, end);
    }
  }

  openUploadMembershipDialog(){
    const dialogRef = this.dialog.open(UploadDialog, {width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getMembers();
        if(result['duplicates']) {
          this.uploadDuplicatesList = result['duplicatesList'];
          this.uploadDuplicates = result['duplicates'];
        }
      }
    });
  }

  openCreateMemberDialog(){
    const dialogRef = this.dialog.open(CreateMemberDialog, {width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result) this.getMembers();
    });
  }

  openTagManagementDialog(){
    const dialogRef = this.dialog.open(TagManagementDialog, {width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result) this.getMembers();
    });
  }

  openEditMemberDialog(member: Object){
    const dialogRef = this.dialog.open(EditMemberDialog, {data: member, width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result) this.getMembers();
    });
  }

  public handlePage(e?:PageEvent) {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.iterator();
    return e;
  }

  private iterator() {
    const end = (this.currentPage + 1) * this.pageSize;
    const start = this.currentPage * this.pageSize;
    const part = this.members.slice(start, end);
    this.sortedMembers = part;
    this.loadingData = false;
  }

  sortData(sort: Sort) {

    const data = this.members;
    if (!sort.active || sort.direction === '') {
      return;
    }

    const end = (this.currentPage + 1) * this.pageSize;
    const start = this.currentPage * this.pageSize;

    this.sortedMembers = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      a.number = ""
      b.number = ""

      if(a.resident.phones[0]){
        a.number = a.resident.phones[0].number
      }

      if(b.resident.phones[0]){
        b.number = b.resident.phones[0].number
      }

      if(!b.resident.email){
        b.resident.email = ""
      }

      if(!a.resident.email){
        a.resident.email = ""
      }

      switch (sort.active) {
        case 'firstName': return compare(a.resident.name.firstName, b.resident.name.firstName, isAsc);
        case 'middleName': return compare(a.resident.name.middleName, b.resident.name.middleName, isAsc);
        case 'lastName': return compare(a.resident.name.lastName, b.resident.name.lastName, isAsc);
        case 'phoneNumber': return compare(a.number, b.number, isAsc);
        case 'voter': return compare(a.resident.voter, b.resident.voter, isAsc);
        case 'email': return compare(a.resident.email, b.resident.email, isAsc);
        case 'city': return compare(a.address.city, b.address.city, isAsc);
        case 'zip': return compare(a.address.zip, b.address.zip, isAsc);
        case 'lat': return compare(a.location.coordinates[1], b.location.coordinates[1], isAsc);
        case 'lng': return compare(a.location.coordinates[0], b.location.coordinates[0], isAsc);
        case 'date': return compare(a.date, b.date, isAsc);
        default: return 0;
      }
     
    }).slice(start, end);


    this.sortedMembers.paginator = this.paginator;
    
  }

  changefilterBy(event: any){
    this.filterByValue = event.value 
  }

  ngOnInit() {
    this.getMembers();
  }


  openMemberGraphDialog() {
    const dialogRef = this.dialog.open(MemberGraphDialog, {data: this.members, width: "80%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result) this.getMembers();
    });
  }


  openUploadManagerDialog() {
    const dialogRef = this.dialog.open(UploadsManagerDialog, {data: this.members, width: "80%"});
    dialogRef.afterClosed().subscribe(result => {
     this.getMembers();
    });
  }

  downloadDuplicateList() {
    let downloadLink = document.createElement('a');

    let blob = new Blob(this.uploadDuplicatesList, {type: 'blob'});
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.setAttribute('download', 'MembershipDuplicateList.csv');
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
