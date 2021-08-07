import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {CampaignService} from '../../../../services/campaign/campaign.service'
import {Sort} from '@angular/material/sort';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {User} from '../../../../models/users/user.model'

@Component({
    templateUrl: './devStatus.html',
  })
  
export class DevStatusDialog implements OnInit{

  allUsers: User[] = [];

  sortedUsers: any;
  sortedUsersOriginal: any;
  currentPage: number = 0
  public pageSize: number = 10;
  public totalSize: number = 0;

  errorMessage: string = ""
  displayErrorMsg: boolean = false;

  pageEvent: PageEvent;
  loading: boolean = true;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

  
  constructor(public dialogRef: MatDialogRef<DevStatusDialog>, 
              @Inject(MAT_DIALOG_DATA) public data: any, 
              public userService: UserService, 
              public campaignService: CampaignService) {
               
              }
  
  onNoClick(): void {this.dialogRef.close()}

  closeSettings(){
    this.dialogRef.close()
  }

  getAllUsers(){
    this.userService.getAllUsers().subscribe(
      (users: User[]) => {
        this.allUsers = users;
        this.sortedUsers = this.allUsers.slice();
        this.totalSize = this.allUsers.length 
        this.iterator();
        this.loading = false;
      },
      error =>{
        this.displayErrorMsg = true;
        this.errorMessage = "A problem with the sever prevented User list fetch."
        console.log(error)
      }
    )
  }

  updateDevStatus(user: Object, developer: boolean){    
    this.loading = true;
    this.userService.updateDevStatus(user, developer).subscribe(
      (user: User) =>{ 
        if(user){
          this.getAllUsers();
        }
      },
      error=>{
        this.displayErrorMsg = true;
        this.errorMessage = "A problem with the sever prevented User Update."
        console.log(error)
      }
    ) 
  }

  ngOnInit(){
    this.getAllUsers();
  }

  public handlePage(e: any) {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.iterator();
    return e
  }

  private iterator() {
    const end = (this.currentPage + 1) * this.pageSize;
    const start = this.currentPage * this.pageSize;
    const part = this.allUsers.slice(start, end);
    this.sortedUsers = part;
  }

  sortData(sort: Sort) {
    const data = this.allUsers.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedUsers = data;
      return;
    }

    this.sortedUsers = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'firstName': return compare(a.name.firstName, b.name.firstName, isAsc);
        case 'lastName': return compare(a.name.lastName, b.name.lastName, isAsc);
        case 'email': return compare(a.loginEmail, b.loginEmail, isAsc);
        default: return 0;
      }
    });

    this.sortedUsers.paginator = this.paginator;

  }

  setFilter(value: string) {
    if (!value) {
      this.sortedUsersOriginal = this.sortedUsers;
    }
  }

  applyFilter(value: string) {
    this.sortedUsers = this.sortedUsersOriginal.filter(singleItem => singleItem.name.firstName.toLowerCase().includes(value.toLowerCase()));
  }
} 

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
