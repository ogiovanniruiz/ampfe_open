import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {UntypedFormControl, UntypedFormGroup, FormGroupDirective, NgForm, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {Router} from "@angular/router";
import {UserService} from '../../services/user.service'

import { environment } from '../../../environments/environment';
import {User, UpdatedUser} from '../../models/user.model'
import { LoginDialog, loginDialogConfig } from '../../dialogs/loginDialog/loginDialog';
import {MatDialog} from '@angular/material/dialog';


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

/** The confirm field also shows an error when the two passwords differ (a form-level error). */
class RepeatPasswordErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const interacted = !!(control && (control.dirty || control.touched)) || !!form?.submitted
    return interacted && !!(control?.invalid || control?.parent?.hasError('mismatch'))
  }
}

// Whitespace-only names count as empty
const notBlank = (control: AbstractControl): ValidationErrors | null =>
  (control.value || '').trim() ? null : {required: true}

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('repeatPassword')?.value ? null : {mismatch: true}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RegisterComponent implements OnInit {

  readonly minPasswordLength = 8

  logo_dir = environment.LOGO_DIR;

  loading = false;
  hidePassword = true;

  // Shown in the banner: the server's reply or a connection problem
  message: string = '';
  // The email is already registered; the banner offers Sign in
  emailExists: boolean = false;

  matcher = new MyErrorStateMatcher();
  repeatMatcher = new RepeatPasswordErrorStateMatcher();

  form = new UntypedFormGroup({
    firstName: new UntypedFormControl('', [notBlank]),
    lastName: new UntypedFormControl('', [notBlank]),
    email: new UntypedFormControl('', [Validators.required, Validators.email]),
    password: new UntypedFormControl('', [Validators.required, Validators.minLength(this.minPasswordLength)]),
    repeatPassword: new UntypedFormControl('', [Validators.required]),
  }, {validators: passwordsMatch});

  constructor(private router: Router, private userService: UserService, public dialog: MatDialog) { }

  ngOnInit() {
    // An old server message goes away as soon as the user edits the form
    this.form.valueChanges.subscribe(() => {
      if(this.message && !this.loading){
        this.message = ''
        this.emailExists = false
      }
    })
  }

  openLoginDialog(){
    this.dialog.open(LoginDialog, loginDialogConfig());
  }

  returnToLoginPage() {
    this.openLoginDialog();
    this.router.navigate(['/']);
  }

  public submitRegistration(){
    if(this.loading) return

    if(this.form.invalid){
      this.form.markAllAsTouched()
      return
    }

    const firstName: string = this.form.value.firstName.trim()
    const lastName: string = this.form.value.lastName.trim()
    const email: string = this.form.value.email.trim()
    const password: string = this.form.value.password

    const user: User = {
      name: {firstName, lastName, fullName: firstName + ' ' + lastName},
      loginEmail: email
    };

    this.loading = true;
    this.message = ''
    this.emailExists = false

    this.userService.createUser(user, password).subscribe(
      (loginResults: UpdatedUser) => {
        this.loading = false;
        if(!loginResults.success) {
          this.message = loginResults.msg || 'The account could not be created.';
          this.emailExists = /already exists|login with/i.test(this.message)
          return
        }

        sessionStorage.setItem('user', JSON.stringify(loginResults.user));
        sessionStorage.setItem('jwt', loginResults.jwt);
        this.router.navigate(['/home']);
      },
      error => {
        console.log(error);
        this.loading = false;
        this.message = 'Couldn\'t create your account because of a server error. Please try again.';
      }
    );
  }
}
