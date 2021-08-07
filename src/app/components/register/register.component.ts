import { Component, OnInit,ViewChild, ElementRef } from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {FormControl, FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {Router} from "@angular/router";
import {UserService} from '../../services/user/user.service'

import { environment } from '../../../environments/environment';
import {User, UpdatedUser} from '../../models/users/user.model'



/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  displayMessage: boolean = false;
  userMessage: string = '';

  showOauthButton: boolean = false;

  errorMessage: string = ''
  displayErrorMsg: boolean = false;
  loading = false;

  logo_dir = environment.LOGO_DIR;
  @ViewChild('firstName', {static: false}) firstName: ElementRef
  @ViewChild('lastName', {static: false}) lastName: ElementRef
  @ViewChild('phone', {static: false}) phone: ElementRef

  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('password', {static: false}) password: ElementRef
  @ViewChild('repeatPassword', {static: false}) repeatPassword: ElementRef

  states: string[] = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  constructor(private router: Router, private userService: UserService) { }

  public cancel(){
    this.router.navigate(['/']);
  }

  public submitRegistration(){
    var email: string = this.email.nativeElement.value;
    var phone: string = this.phone.nativeElement.value;
    var firstName: string = this.firstName.nativeElement.value;
    var lastName: string = this.lastName.nativeElement.value;
    var password: string = this.password.nativeElement.value;
    var repeatPassword: string = this.repeatPassword.nativeElement.value;

    if (firstName === '' || lastName === '' || email === '' || password === ''){
      this.displayMessage = true;
      this.showOauthButton = false;
      this.userMessage = 'Form is incomplete.';
      return;
    }

    if (password !== repeatPassword) {
      this.displayMessage = true;
      this.showOauthButton = false;
      this.userMessage = 'Passwords do not match.';
      return;
    }

    if (phone && !phone.match("[0-9]{10}")) {
      this.displayMessage = true;
      this.showOauthButton = false;
      this.userMessage = 'Please enter a vaild phone number. No special characters. Numbers only.';
      return;
    }

    if (email && !email.match("[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}")) {
      this.displayMessage = true;
      this.showOauthButton = false;
      this.userMessage = 'Please enter a vaild email';
      return;
    }

    var fullName: string = firstName + ' ' + lastName

    const user: User = {
      name: {firstName, lastName, fullName},
      loginEmail: email
    };

    this.loading = true;
    this.userService.createUser(user, password).subscribe(
      (loginResults: UpdatedUser) => {
        this.loading = false;
        if(!loginResults.success) {
          this.displayMessage = true;
          this.userMessage = loginResults.msg;
          this.showOauthButton = true;

        }else{
          sessionStorage.setItem('user', JSON.stringify(loginResults.user));
          sessionStorage.setItem('jwt', loginResults.jwt);
          this.router.navigate(['/home']);
        }

      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to register due to server error.';
      }
    );
  }

  emailFormControl = new FormControl('', [
    Validators.required,
    Validators.pattern("[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}")
  ]);

  phoneFormControl = new FormControl('', [
    Validators.pattern("[0-9]{3}-[0-9]{3}-[0-9]{4}")
  ]);

  initOauthLogin() {
    this.router.navigate(['/'], {state: {oauth: true}});
  }

  ngOnInit() {}

}
