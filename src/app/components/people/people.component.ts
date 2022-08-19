import { Component, OnInit, ElementRef, ViewChild  } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {UploadDialog} from './dialogs/uploadDialog'
import { PersonService } from 'src/app/services/person/person.service';
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-people',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss']
})
export class PeopleComponent implements OnInit {
  errorMessage: string = '';
  loading: boolean = false;
  userMessage: string = ''
  displayUserMsg: boolean = false;
  showResults: boolean = false;

  results: any[]

  pageEvent: PageEvent;

  currentPage: number = 0
  public pageSize: number = 10;
  public totalSize: number = 0;

  sortedMembers;

  @ViewChild('firstName', {static: false}) firstName: ElementRef;
  @ViewChild('lastName', {static: false}) lastName: ElementRef;
  @ViewChild('streetName', {static: false}) streetName: ElementRef;
  @ViewChild('streetNum', {static: false}) streetNum: ElementRef;
  @ViewChild('city', {static: false}) city: ElementRef;
  @ViewChild('zip', {static: false}) zip: ElementRef;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  
  constructor(public dialog: MatDialog, public personService: PersonService) { }
  

  ngOnInit(): void {
  }

  searchPerson(){
    var person = {}

    if(this.firstName.nativeElement.value && this.firstName.nativeElement.value != '') person['firstName'] = this.firstName.nativeElement.value
    if(this.lastName.nativeElement.value && this.lastName.nativeElement.value != '') person['lastName'] = this.lastName.nativeElement.value

    if(this.streetNum.nativeElement.value && this.streetNum.nativeElement.value != '') person['streetNum'] = this.streetNum.nativeElement.value
    if(this.streetName.nativeElement.value && this.streetName.nativeElement.value != '') person['streetName'] = this.streetName.nativeElement.value

    if(this.city.nativeElement.value && this.city.nativeElement.value != '') person['city'] = this.city.nativeElement.value
    if(this.zip.nativeElement.value && this.zip.nativeElement.value != '') person['zip'] = this.zip.nativeElement.value

    if(!person['firstName'] && !person['lastName'] && !person['streetNum'] && !person['streetName']){
      this.userMessage = "Not enough search criteria."
      this.displayUserMsg = true;
      return
    }

    this.loading = true;

    this.personService.getPerson(person).subscribe((results: []) =>{
      this.results = results
        this.displayUserMsg = true;
        this.userMessage = "There are " + results.length + " results."
        this.showResults = true;

        this.totalSize = this.results.length;
        this.iterator();
      
      this.showResults = true
    })



  }

  openDetailsDialog(person){

    const dialogRef = this.dialog.open(UploadDialog, {width: "50%", data: person});
    dialogRef.afterClosed().subscribe(result => {
      if(result) console.log(result)
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
    const part = this.results.slice(start, end);
    this.sortedMembers = part;
    this.loading = false;
  }

  sortData(sort: Sort) {

    const data = this.results;
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
        default: return 0;
      }
     
    }).slice(start, end);


    this.sortedMembers.paginator = this.paginator;
    
  }

}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
