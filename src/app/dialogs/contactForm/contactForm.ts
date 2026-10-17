import { Component, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {UntypedFormControl, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {UserService} from '../../services/user.service'
import {User} from  '../../models/user.model'

// Rejects values that are empty once surrounding whitespace is removed
const notBlank = (control: AbstractControl): ValidationErrors | null =>
  (control.value || '').trim() ? null : {required: true};

@Component({
    templateUrl: './contactForm.html',
    styleUrls: ['./contactForm.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class ContactFormDialog {

  readonly maxSubject = 150;
  readonly maxMessage = 5000;

  subject = new UntypedFormControl('', [notBlank, Validators.maxLength(this.maxSubject)]);
  message = new UntypedFormControl('', [notBlank, Validators.maxLength(this.maxMessage)]);

  sending: boolean = false;
  sent: boolean = false;
  errorMessage: string = "";

  replyEmail: string = "";

  constructor(public dialogRef: MatDialogRef<ContactFormDialog>,
              public userService: UserService) {
    const user: User = this.getUser();
    this.replyEmail = user?.loginEmail || "";
  }

  getUser(): User {
    try {
      return JSON.parse(sessionStorage.getItem('user'));
    } catch (e) {
      return null;
    }
  }

  sendEmail(){
    if (this.sending) return;
    this.errorMessage = "";

    if (this.subject.invalid || this.message.invalid) {
      this.subject.markAsTouched();
      this.message.markAsTouched();
      return;
    }

    const orgID: string = sessionStorage.getItem('orgID');
    const subject: string = this.subject.value.trim();
    const message: string = this.message.value.trim();

    this.setSending(true);

    this.userService.contactDevs(subject, message, this.getUser(), orgID).subscribe(() =>{
      this.setSending(false);
      this.sent = true;
    }, error=>{
      console.log(error)
      this.setSending(false);
      this.errorMessage = "Couldn't send your message. Please try again.";
    })
  }

  // Keep the dialog open (no backdrop/Esc close) while the request is in flight
  setSending(sending: boolean){
    this.sending = sending;
    this.dialogRef.disableClose = sending;
  }

  close(){
    this.dialogRef.close(this.sent || undefined)
  }

}
