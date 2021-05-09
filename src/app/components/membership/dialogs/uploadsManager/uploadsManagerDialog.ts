import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import {UserService} from '../../../../services/user/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'

import {MembershipService} from '../../../../services/membership/membership.service'

@Component({
  templateUrl: './uploadsManagerDialog.html',
})

export class UploadsManagerDialog implements OnInit{

  sortedUploads;
  pageEvent: PageEvent;

  currentPage: number = 0;
  public pageSize: number = 5;
  public totalSize: number = 0;
  uploads = []

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

    constructor(public dialogRef: MatDialogRef<UploadsManagerDialog>,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public userService: UserService,
                public memberService: MembershipService,
                public orgService: OrganizationService) {}


  userMessage: string = '';
  displayMessage: boolean = false;

  public handlePage(e?:PageEvent) {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.iterator();
    return e;
  }

  private iterator() {
    const end = (this.currentPage + 1) * this.pageSize;
    const start = this.currentPage * this.pageSize;
    const part = this.uploads.slice(start, end);
    this.sortedUploads = part;
  }

  sortData(sort: Sort) {
    const data = this.uploads.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedUploads = data;
      return;
    }

    this.sortedUploads = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'fileName': return compare(a.fileName, b.fileName, isAsc);
        case 'geocoded': return compare(a.geocoded, b.geocoded, isAsc);
        case 'geographyFound': return compare(a.geographyFound, b.geographyFound, isAsc);
        case 'date': return compare(a.date, b.date, isAsc);
        default: return 0;
      }
    });

    this.sortedUploads.paginator = this.paginator;
  }

  cancel(){this.dialogRef.close()}

  ngOnInit(){
    this.getUploads();
  }

  getUploads(){
    var orgID: string = sessionStorage.getItem('orgID');
    this.memberService.getUploads(orgID).subscribe(
      (result: any)=>{
        this.uploads = result
        this.sortedUploads = this.uploads.slice();
        this.totalSize = this.uploads.length;
        this.iterator();
      }
    )

  }

  deleteUpload(upload){

    if(confirm('Are you sure you want to delete this upload? Data is not recoverable.')){
      this.memberService.deleteUpload(upload._id).subscribe(
        result =>{ 
          this.getUploads()
        }
      )
    }
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
