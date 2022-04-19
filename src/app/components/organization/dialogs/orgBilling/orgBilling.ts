import { Component, ChangeDetectorRef, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service'
import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model'
import {User, UpdatedUser} from '../../../../models/users/user.model'

import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { StripeService } from '../../../../services/organization/stripe.service';
declare const stripe: any;
declare const elements: any;

@Component({
  templateUrl: './orgBilling.html',
})

export class OrgBillingDialog implements OnInit{

  displayMessage: boolean = false;
  userMessage: string = "";

  displayErrorMsg: boolean = false
  errorMessage: string = '';

  subscribed: boolean = false;
  dev: boolean = false;

  @ViewChild('cardInfo') cardInfo: ElementRef;

  totalAmount: number;
  card: any;
  cardHandler = this.onChange.bind(this);
  cardError: string;
  
  constructor(public dialogRef: MatDialogRef<OrgBillingDialog>,
              @Inject(MAT_DIALOG_DATA) public data: Organization, 
              public orgService: OrganizationService,
              public stripeService: StripeService,
              private cd: ChangeDetectorRef,
              ) {
                this.subscribed = this.data.subscribed
                //console.log(this.data)
                this.totalAmount = this.data.subscription.cost //6000//data['totalAmount'];
              }
              
  closeDialog(): void{this.dialogRef.close()}

  ngOnDestroy() {
    if (this.card) {
        this.card.removeEventListener('change', this.cardHandler);
        this.card.destroy();
    }
  }
  ngAfterViewInit() {
    this.initiateCardElement();
  }

  onChange({error}) {
    if (error) {
        this.cardError = error.message;
    } else {
        this.cardError = null;
    }
    this.cd.detectChanges();
  }

  onSuccess(token) {
    this.createOrder(token.id);
  }

  onError(error) {
    if (error.message) {
      this.cardError = error.message;
    }
  }

  createOrder(id: any){
    this.stripeService.createOrder(id).subscribe(result =>{
      //console.log(result)
    })

  }
  toggleSubscribedStatus(toggle: boolean){
    var orgID: string = this.data._id

    this.orgService.updateSubscribedStatus(orgID, toggle).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success){
          this.subscribed = toggle
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was a problem with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  initiateCardElement() {
    // Giving a base style here, but most of the style is in scss file
    const cardStyle = {
        base: {
            color: '#193155',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4',
            },
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
        },
    };

    this.card = elements.create('card', {
      iconStyle: 'solid',
      style: {
        base: {
          iconColor: '#193155',
          color: '#193155',
          fontWeight: 500,
          fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
          fontSize: '16px',
          fontSmoothing: 'antialiased',
  
          ':-webkit-autofill': {
            color: '#193155',
          },
          '::placeholder': {
            color: 'grey',
          },
        },
        invalid: {
          iconColor: '#ad1d2e',
          color: '#ad1d2e',
        },
      },
    });

    this.card.mount(this.cardInfo.nativeElement);
    this.card.addEventListener('change', this.cardHandler);

  }

async createStripeToken() {
  const {token, error} = await stripe.createToken(this.card);
  if (token) {
      this.onSuccess(token);
  } else {
      this.onError(error);
  }
}

  ngOnInit(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));
    this.dev = user.dev
  }
} 
