import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../services/user/user.service'
import {User} from  '../models/users/user.model'


@Component({
    templateUrl: './contactForm.html',
  })
  
export class ContactFormDialog implements OnInit{

  isBug: boolean = false;
  sending: boolean = false;
  userMessage: string = ""
  displayMessage: boolean = false;

  errorMessage: string = ""
  displayErrorMsg: boolean = false;

  @ViewChild('subject', {static: false}) subject:ElementRef;
  @ViewChild('message', {static: false}) message:ElementRef;

  constructor(public dialogRef: MatDialogRef<ContactFormDialog>, 
              public userService: UserService) {}
  
  onNoClick(): void {this.dialogRef.close()}

  sendEmail(){
    var subject: string = this.subject.nativeElement.value
    var message: string = this.message.nativeElement.value
    var user: User = JSON.parse(sessionStorage.getItem('user'))

    if(subject === ""){
      this.displayMessage = true;
      this.userMessage = "Message requires a subject."
      return
    }

    if(message === ""){
      this.displayMessage = true;
      this.userMessage = "A message body is required to send."
      return
    }

    this.sending = true;

    this.userService.contactDevs(subject, message, user).subscribe(result =>{
      if(result){
        this.dialogRef.close(result)
      } 
    }, error=>{
      this.displayErrorMsg = true;
      this.errorMessage = "A problem with the server prevented message submission."
      console.log(error)
    })
  }

  closeSettings(){
    this.dialogRef.close()
  }

  ngOnInit(){}

}
