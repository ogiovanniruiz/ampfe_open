import { Component, OnInit } from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {FormControl, FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import {UserService} from '../../services/user/user.service';

import {UpdatedUser} from '../../models/users/user.model';
import { environment } from '../../../environments/environment';


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-passwordreset',
  templateUrl: './passwordreset.component.html',
  styleUrls: ['./passwordreset.component.scss']
})
export class PasswordresetComponent implements OnInit {

  showErrorMessage = false;
  errorMessage: string;

  resetUpdate = false;
  resetMessage: string;

  showOauthButton: boolean = false;

  upr: string;

  logo_dir = environment.LOGO_DIR;

  constructor(private router: Router, private user: UserService, private route: ActivatedRoute) {}

  public cancel(){
    this.router.navigate(['/']);
  }

  public submitPasswordReset(email: string){
    if (email === ''){
      this.showErrorMessage = true;
      this.errorMessage = 'Form is incomplete.';
    } else {
      this.showErrorMessage = false;
      this.user.passwordReset(email, window.location.origin).subscribe(
      (passwordResetesults: UpdatedUser) => {
            if (passwordResetesults.success) {
              this.resetMessage = "Email Sent";
            } else {
              this.showErrorMessage = true;
              this.showOauthButton = true;
              this.errorMessage = passwordResetesults.msg;
            }
      });
    }
  }

  public submitNewPassword(password: string, password_repeat: string){
    if (password !== password_repeat){
      this.showErrorMessage = true;
      this.errorMessage = 'Passwords do not match.';
    } else if (password === "" || password_repeat === ""){
      this.showErrorMessage = true;
      this.errorMessage = 'Form is incomplete.';
    } else {
      this.showErrorMessage = false;
      this.user.setNewPassword(this.upr, password).subscribe(
          (passwordResetesults: UpdatedUser) => {
            this.resetUpdate = passwordResetesults.success;
            this.resetMessage = passwordResetesults.msg;
      }, error => {
            this.resetUpdate = true;
            this.errorMessage = 'There was an error resetting your password. Please try again.';
       });
    }
  }

  emailFormControl = new FormControl('', [
    Validators.required,
    Validators.email,
  ]);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.upr = params.upr;
    });
  }

  initOauthLogin() {
    this.router.navigate(['/'], {state: {oauth: true}});
  }

}
