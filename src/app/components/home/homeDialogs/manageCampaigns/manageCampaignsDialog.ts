import { Component, OnInit, ViewChild, ElementRef, Inject, HostListener, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatDialog} from '@angular/material/dialog';

import {Router} from "@angular/router";

//MODELS
import { Organization } from '../../../../models/organization.model'
import { Campaign } from 'src/app/models/campaign.model';
import { CampaignService } from 'src/app/services/campaign.service';


//DIALOGS
import { CreateCampaignDialog } from '../createCampaign/createCampaign';
import { RequestCampaignDialog } from '../requestCampaign/requestCampaign';
import { EditCampaignDialog } from '../editCampaign/editCampaignDialog';
@Component({
    templateUrl: './manageCampaignsDialog.html',
    styleUrls: ['../../home.component.scss', './manageCampaignsDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  

export class ManageCampaignsDialog implements OnInit{

  inactiveCampaigns: Campaign[] = []
  screenSize: string = '50%'
  loadingCampaigns: boolean = false;

  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  constructor(public dialogRef: MatDialogRef<ManageCampaignsDialog>, 
      public campaignService: CampaignService,
      public dialog: MatDialog, 
      public router: Router,
      @Inject(MAT_DIALOG_DATA) public homeOrg: Organization, 
      ) {}
    
  ngOnInit(){
    this.getOrgCampaigns()
  }

  getOrgCampaigns(){
    this.loadingCampaigns = true;
    this.displayErrorMsg = false;

    this.campaignService.getOrgCampaigns(this.homeOrg._id).subscribe(
      (campaigns: Campaign[]) =>{
        this.loadingCampaigns = false;
        this.inactiveCampaigns = (campaigns || []).filter(function(campaign) { return !campaign['active'] && campaign.campaignID >= 109});
      },
      error=>{
        console.log(error)
        this.loadingCampaigns = false;
        this.displayErrorMsg = true;
        this.errorMessage = 'Could not load your campaigns. Please try again.';
      }
    )
  }

      openCreateCampaignDialog(): void {

        const dialogRef = this.dialog.open(CreateCampaignDialog, {autoFocus: false, disableClose: true, width: this.screenSize, maxWidth: this.screenSize});
        dialogRef.afterClosed().subscribe(result => {
          if(result){
            this.dialogRef.close(result)
          }
        });
      }

      openRequestCampaignDialog(): void {

        const dialogRef = this.dialog.open(RequestCampaignDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
        dialogRef.afterClosed().subscribe(result => {
          if(result){}
        });
      }


    openEditCampaignDialog(campaign: Campaign): void{
      const dialogRef = this.dialog.open(EditCampaignDialog, { autoFocus: false, disableClose: true, width: this.screenSize, data: campaign, maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe(result => {
        if(result){this.dialogRef.close(result)}
      });
    }

    public enterMap(campaignID: Number){
  
      var stringID = campaignID.toString();
      sessionStorage.setItem('campaignID', stringID);
  
      this.router.navigate(['/campaignMap']);
      this.dialogRef.close()
    }

  closeDialog(){this.dialogRef.close()}

  trackCampaign(index: number, campaign: Campaign){ return campaign.campaignID }

  private updateScreenSize(){
    this.screenSize = window.innerWidth < 768 ? '100%' : '50%'
  }

  ngAfterContentInit() {
    this.updateScreenSize()
  }

  @HostListener("window:resize", []) updateDays() {  
    this.updateScreenSize()
  }
}