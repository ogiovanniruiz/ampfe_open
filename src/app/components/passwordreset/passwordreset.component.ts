import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {ErrorStateMatcher} from '@angular/material/core';
import {UntypedFormControl, UntypedFormGroup, FormGroupDirective, NgForm, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import {UserService} from '../../services/user.service';

import {UpdatedUser} from '../../models/user.model';
import { environment } from '../../../environments/environment';
import {MatDialog} from '@angular/material/dialog';
import { LoginDialog, loginDialogConfig } from '../../dialogs/loginDialog/loginDialog';


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

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('repeatPassword')?.value ? null : {mismatch: true}

@Component({
  selector: 'app-passwordreset',
  templateUrl: './passwordreset.component.html',
  // Shares the register page's card and form styles
  styleUrls: ['../register/register.component.scss', './passwordreset.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class PasswordresetComponent implements OnInit {

  // Same rule as registration
  readonly minPasswordLength = 8

  logo_dir = environment.LOGO_DIR;

  // The reset token from the emailed link; without it the page asks for an email
  upr: string = '';

  loading = false;
  hidePassword = true;
  message: string = '';

  // Request mode: the email a link was sent to
  sentTo: string = '';

  // Set-password mode
  passwordSaved = false;
  linkExpired = false;

  matcher = new MyErrorStateMatcher();
  repeatMatcher = new RepeatPasswordErrorStateMatcher();

  requestForm = new UntypedFormGroup({
    email: new UntypedFormControl('', [Validators.required, Validators.email]),
  });

  passwordForm = new UntypedFormGroup({
    password: new UntypedFormControl('', [Validators.required, Validators.minLength(this.minPasswordLength)]),
    repeatPassword: new UntypedFormControl('', [Validators.required]),
  }, {validators: passwordsMatch});

  constructor(private router: Router, private user: UserService, private route: ActivatedRoute, public dialog: MatDialog) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.upr = params.upr || '';
      this.message = ''
      this.loading = false
      this.passwordSaved = false
      this.linkExpired = false
    });

    // An old server message goes away as soon as the user edits a form
    const clearMessage = () => { if(this.message && !this.loading) this.message = '' }
    this.requestForm.valueChanges.subscribe(clearMessage)
    this.passwordForm.valueChanges.subscribe(clearMessage)
  }

  //////////////////////// REQUEST A LINK ////////////////////////

  public submitPasswordReset(){
    if(this.loading) return
    if(this.requestForm.invalid){
      this.requestForm.markAllAsTouched()
      return
    }

    const email: string = this.requestForm.value.email.trim()
    this.loading = true
    this.message = ''

    this.user.passwordReset(email, window.location.origin).subscribe(
      (result: UpdatedUser) => {
        this.loading = false
        // The server also reports success for unknown emails, so the sent message never confirms an account exists
        if(result?.success) this.sentTo = email
        else this.message = result?.msg || 'The reset email could not be sent.'
      },
      error => {
        console.log(error)
        this.loading = false
        this.message = 'Couldn\'t send the reset email because of a server error. Please try again.'
      })
  }

  sendAgain(){
    this.sentTo = ''
  }

  //////////////////////// SET A NEW PASSWORD ////////////////////////

  public submitNewPassword(){
    if(this.loading) return
    if(this.passwordForm.invalid){
      this.passwordForm.markAllAsTouched()
      return
    }

    this.loading = true
    this.message = ''

    this.user.setNewPassword(this.upr, this.passwordForm.value.password).subscribe(
      (result: any) => {
        this.loading = false
        if(result?.success){
          this.passwordSaved = true
        } else if(result?.expired){
          this.linkExpired = true
        } else {
          this.message = result?.msg || 'Your password could not be reset.'
        }
      },
      error => {
        console.log(error)
        this.loading = false
        this.message = 'There was an error resetting your password. Please try again.'
      })
  }

  requestNewLink(){
    this.router.navigate(['/passwordreset'])
  }

  //////////////////////// NAVIGATION ////////////////////////

  returnToLoginPage() {
    this.openLoginDialog();
    this.router.navigate(['/']);
  }

  openLoginDialog(){
    this.dialog.open(LoginDialog, loginDialogConfig());
  }
}
