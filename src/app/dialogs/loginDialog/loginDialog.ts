import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { version } from '../../../environments/version';
import {UserService} from '../../services/user.service'
import {Router, ActivatedRoute, Params } from "@angular/router";
import {ErrorStateMatcher} from '@angular/material/core';
import {UntypedFormControl, UntypedFormGroup, FormGroupDirective, NgForm, Validators} from '@angular/forms';
import { UpdatedUser } from '../../models/user.model';
import {MatDialogRef, MatDialogConfig} from '@angular/material/dialog';
import { OAuthService } from 'angular-oauth2-oidc';

import { authConfig } from '../../auth.config';
import { JwksValidationHandler } from 'angular-oauth2-oidc-jwks';


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
      const isSubmitted = form && form.submitted;
      return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
    }
  }


// Every place that opens the login dialog uses this: full width on phones, a centered card elsewhere
export function loginDialogConfig(): MatDialogConfig {
  // Phones: a centered card with the map showing around it, not the full-screen app-dialog panel
  const isMobile = window.innerWidth < 768
  return isMobile
    ? {autoFocus: false, disableClose: true, panelClass: 'app-login-dialog',
       width: 'calc(100vw - 32px)', maxWidth: '420px', maxHeight: 'calc(100dvh - 32px)'}
    : {autoFocus: false, disableClose: true, width: '420px', maxWidth: '94vw'}
}

@Component({
    selector: 'app-login-dialog',
    templateUrl: './loginDialog.html',
    styleUrls: ['./loginDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class LoginDialog implements OnInit{

  constructor(private oauthService: OAuthService,
              public dialogRef: MatDialogRef<LoginDialog>,
              private userService: UserService,
              public router: Router,
              private route: ActivatedRoute,
            )
  {
        this.configureWithNewConfigApi();
  }

  hide = true;

  public version: string = version.version;

  // synced: the app matches the server's version; versionCheckFailed: the server couldn't be reached
  public synced: boolean = false;
  public serverVersion: string;
  public checkingVersion: boolean = false;
  public versionCheckFailed: boolean = false;

  loggingIn: boolean = false;

  // The email/password form stays hidden until "Sign in with email" is pressed
  showEmailForm: boolean = false;
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  // Shown in the banner: the server's reply (e.g. wrong password) or a connection problem
  message: string = '';

  logo_dir: string = environment.LOGO_DIR;

  production: boolean = environment.production

  matcher = new MyErrorStateMatcher();

  loginForm = new UntypedFormGroup({
    email: new UntypedFormControl('', [Validators.required, Validators.email]),
    password: new UntypedFormControl('', [Validators.required]),
  });

  get emailControl(): UntypedFormControl {
    return this.loginForm.get('email') as UntypedFormControl
  }

  get passwordControl(): UntypedFormControl {
    return this.loginForm.get('password') as UntypedFormControl
  }

  ngOnInit() {
    this.checkVersion();

    this.route.queryParams.subscribe((params: Params) => {
      if(params.dir){
        sessionStorage.setItem('rdr', params.dir)
      }
    });

    // A stale "wrong password" message goes away as soon as the user edits the form
    this.loginForm.valueChanges.subscribe(() => {
      if(this.message && !this.loggingIn) this.message = ''
    })
  }

  checkVersion(){
    this.checkingVersion = true;
    this.versionCheckFailed = false;
    this.message = ''

    this.userService.checkVersion(this.version).subscribe(result =>{
      this.checkingVersion = false;
      this.synced = result['sync']
      this.serverVersion = result['serverVersion']
    },
    error => {
      console.log(error)
      this.checkingVersion = false;
      this.versionCheckFailed = true;
    })
  }

  openEmailForm(){
    this.showEmailForm = true
    // Focus once the form has rendered
    setTimeout(() => this.emailInput?.nativeElement.focus())
  }

  localRegister(){
    this.dialogRef.close()
    this.router.navigate(['/register']);
  }

  localForgotPassword(){
    this.dialogRef.close()
    this.router.navigate(['/passwordreset']);
  }

  localLogin(){
    if(this.loggingIn) return

    if(this.loginForm.invalid){
      this.loginForm.markAllAsTouched()
      return
    }

    const email: string = this.emailControl.value.trim()
    const password: string = this.passwordControl.value

    this.loggingIn = true
    this.message = ''

    this.userService.localLogin(email, password).subscribe(
      (loginResults: UpdatedUser)=> {
        this.loggingIn = false
        if(loginResults.success){
          sessionStorage.setItem('user', JSON.stringify(loginResults.user));
          sessionStorage.setItem('jwt', loginResults.jwt);
          this.dialogRef.close()
          this.router.navigate(['/home']);
        }else {
          this.message = loginResults.msg || 'The email or password is incorrect.';
        }
      },
      error =>{
        console.log(error)
        this.loggingIn = false
        this.message = 'Couldn\'t sign in because of a server error. Please try again.'
    })
  }

  get claims(){
    var claims = this.oauthService.getIdentityClaims();
    if (claims) return claims;
    return null;
  }

  private configureWithNewConfigApi() {
    this.oauthService.configure(authConfig);
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  initOauthLogin() {
    if(this.claims){
      this.dialogRef.close()
      this.router.navigate(['/home']);
      return
    }

    this.oauthService.initImplicitFlow();
  }

  updateApp(){
    window.location.reload()
  }

}
