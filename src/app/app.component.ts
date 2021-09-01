import { Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import {FormControl, FormGroupDirective, NgForm, Validators, NgControlStatus} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import {Router, ActivatedRoute, Params } from "@angular/router";

import { OAuthService } from 'angular-oauth2-oidc';
import { JwksValidationHandler } from 'angular-oauth2-oidc-jwks';
import { authConfig } from './auth.config';
import { KeyValueDiffers } from '@angular/core';

import {MatDialog} from '@angular/material/dialog';
import {UserService} from './services/user/user.service'

import { environment } from '../environments/environment';

import { UpdatedUser } from './models/users/user.model';
import {ContactFormDialog} from './dialogs/contactForm';

import { version } from '../environments/version';
import {User} from './models/users/user.model'


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit{

  constructor(private oauthService: OAuthService, 
              private userService: UserService, 
              public router: Router, 
              public dialog: MatDialog,
              differs:  KeyValueDiffers ,
              private route: ActivatedRoute,
              ) {
    this.configureWithNewConfigApi();
    this.differ = differs.find([]).create();
  }

  public version: string = version.version;

  public synced: boolean = true;
  public serverVersion: string;
  public checkingVersion: boolean = false;

  displayMessage: boolean = false;
  userMessage: string;
  isDev: boolean = false;
  differ:any;
  checkFlag: boolean = false;

  timeOld;
  timeNow;
  timeCheck;

  errorMessage: string = '';
  displayErrorMessage: boolean = false;

  user: User;

  logo_dir: string = environment.LOGO_DIR;
  theme: string = environment.THEME;
  demoVersion: boolean = environment.demoVersion

  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('password', {static: false}) password: ElementRef

  private configureWithNewConfigApi() {
    this.oauthService.configure(authConfig);
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  initOauthLogin() {
    if(!this.claims){
      this.oauthService.initImplicitFlow();
    }else{
      this.googleLogin(this.claims)
    }
  }

  googleLogin(claims: any){
    this.userService.oauthLogin(claims).subscribe(
      (loginResults: UpdatedUser)=> {
        if(loginResults.success){
          sessionStorage.setItem('user', JSON.stringify(loginResults.user));
          sessionStorage.setItem('jwt', loginResults.jwt);

          setTimeout(()=>{ 
            this.router.navigate(['/home']);
            
          }, 100);
        }else if(!loginResults.success){
          if(this.claims){
            this.createOauthUser(this.claims)
          }
        }
    }, error =>{
      console.log(error)
      this.displayMessage = false;
      this.displayErrorMessage = true;
      this.errorMessage = 'Failed to login due to server error'
    })
  }

  createOauthUser(claims: any){
    this.userService.createOauthUser(claims).subscribe(
      (loginResults: UpdatedUser)=> {
        sessionStorage.setItem('user', JSON.stringify(loginResults.user));
        sessionStorage.setItem('jwt', loginResults.jwt);

        this.router.navigate(['/home']);
        
    }, error =>{
      console.log(error)
      this.displayMessage = false;
      this.displayErrorMessage = true;
      this.errorMessage = 'Failed to login due to server error'
    
    })
  }

  localLogin(){
    var email = this.email.nativeElement.value;
    if(!email){
      this.displayMessage = true;
      this.displayErrorMessage = false;
      this.userMessage = 'Requires an email.'
      return
    }

    var password = this.password.nativeElement.value;
    if(!password){
      this.displayMessage = true;
      this.displayErrorMessage = false;
      this.userMessage = 'Requires a password.'
      return
    }

    this.timeNow = new Date().getSeconds();
    if(this.timeOld && this.timeCheck && this.timeNow < this.timeCheck){
      this.displayMessage = true;
      this.displayErrorMessage = false;
      this.userMessage = 'Error! try again.';
      this.timeOld = this.timeNow;
      this.timeCheck = (this.timeOld + 1.1);
      return
    }
    this.timeOld = this.timeNow;
    this.timeCheck = (this.timeOld + 1.1);

    this.userService.localLogin(email, password).subscribe(
      (loginResults: UpdatedUser)=> {
        if(loginResults.success){
          sessionStorage.setItem('user', JSON.stringify(loginResults.user));
          sessionStorage.setItem('jwt', loginResults.jwt);
          this.router.navigate(['/home']);
        }else {
          this.displayMessage = true;
          this.userMessage = loginResults.msg;
        }
      }, 
      error =>{
        console.log(error)
        this.displayMessage = false;
        this.displayErrorMessage = true;
        this.errorMessage = 'Failed to login due to server error'
    })
  }

  localRegister(){
    this.router.navigate(['/register']);
  }

  localForgotPassword(){
    this.router.navigate(['/passwordreset']);
  }

  openContactDialog(): void {
    this.dialog.open(ContactFormDialog, {width: '50%'});
  }

  goToHome(){
    this.router.navigate(['/home']);
  }

  goToOrganization(){
    this.router.navigate(['/organization']);
  }

  back(){
    
    if (this.router.url === '/organization'){
      this.router.navigate(['/home']);
    } else if (this.router.url === '/dashboard' || this.router.url === '/membership'){
      this.router.navigate(['/organization']); 
    } else if(this.router.url === '/canvass' || this.router.url === '/texting' || this.router.url === '/phonebank' || this.router.url === '/petition'  || this.router.url === '/hotline'){
      this.router.navigate(['/activity'])
    }else if(this.router.url ==='/canvass/groupForm'){
      this.router.navigate(['/canvass'])
    }else {
      this.router.navigate(['/dashboard'])
    }
  }

  logOff(){
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('jwt')
    this.checkFlag = false;

    this.oauthService.logOut();
    this.router.navigate(['/']);
  }

  checkVersion(){
    this.synced = false;
    this.checkingVersion = true;

    this.userService.checkVersion(this.version).subscribe(result =>{
      this.checkingVersion = false;
      this.synced = result['sync']
      this.serverVersion = result['serverVersion']
    },
    error => {
      this.displayErrorMessage = true;
      this.checkingVersion = false;
      this.errorMessage = 'Failed to get server version due to a server error. Please refresh the page.'
      console.log(error)
    })
  }

  get claims(){
    var claims = this.oauthService.getIdentityClaims();
    if (!claims) return null;
    return claims; 
  }

  emailFormControl = new FormControl('', [Validators.required,Validators.email]);
  
  
  ngDoCheck(){
    var changes: boolean = this.differ.diff(this.claims);
    var jwt: string = sessionStorage.getItem('jwt')
    if (changes && !this.checkFlag && !jwt){
      this.googleLogin(this.claims);
      this.checkFlag = true;
    }

    if(history.state && history.state.oauth){
      this.initOauthLogin()
    }
  }

  ngOnInit() {
    this.checkVersion();

    this.route.queryParams.subscribe((params: Params) => {
      if(params['dir']){
        sessionStorage.setItem('rdr', params['dir'] )
      }
    });
  }

}

