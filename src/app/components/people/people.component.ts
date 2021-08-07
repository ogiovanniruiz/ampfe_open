import { Component, OnInit } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {UploadDialog} from './dialogs/uploadDialog'

@Component({
  selector: 'app-people',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss']
})
export class PeopleComponent implements OnInit {
  errorMessage: string = '';
  loading: boolean = false;
  
  constructor(public dialog: MatDialog, ) { }
  

  ngOnInit(): void {
  }

  openUploadDialog(){

    const dialogRef = this.dialog.open(UploadDialog, {width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result) console.log(result)
    });

  }

}
