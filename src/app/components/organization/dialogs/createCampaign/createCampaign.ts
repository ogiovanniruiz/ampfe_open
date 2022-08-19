import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

import {CampaignService} from '../../../../services/campaign/campaign.service';
import {UpdatedCampaign} from '../../../../models/campaigns/campaign.model';

@Component({
  templateUrl: './createCampaign.html',
  styleUrls: ['../../organization.component.scss']
})

export class CreateCampaignDialog implements OnInit{
  displayMessage = false;
  userMessage: String = '';

  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  stateList = ['California'];
  districtBoundariesType = ['SchoolDistrict','County', 'Bos', 'Citywide', 'Cityward', 'Assembly', 'Congressional', 'Board Of Equalization', 'Senate', 'Recreational', 'Water', 'Statewide'];
  districtBoundaries = [];
  districtBoundariesResults = [];
  electionTypes = ['General', 'Primary', 'Presidential General', 'Presidential Primary', 'Special', 'Local', 'None'];
  loadingIDS: boolean = false;

  fundedByCreatorOrg: boolean;
  geographical: boolean;

  loader: boolean = false;

  @ViewChild('campaignName', {static: true}) campaignName: ElementRef;
  @ViewChild('description', {static: true}) description: ElementRef;
  @ViewChild('districtBoundaryType', {static: true}) districtBoundaryType: ElementRef;
  @ViewChild('districtBoundary', {static: true}) districtBoundary: ElementRef;
  @ViewChild('electionType', {static: true}) electionType: ElementRef;

  constructor(public dialogRef: MatDialogRef<CreateCampaignDialog>,
              public campaignService: CampaignService) {}

  closeDialog(): void{this.dialogRef.close()}

  createCampaign(){
    var campaignName:string = this.campaignName.nativeElement.value;
    if( campaignName === ""){
      this.displayMessage = true;
      this.userMessage = 'Campaign needs a name.';
      return
    }

    var description: string = this.description.nativeElement.value;



    var districtBoundaryType: string = this.districtBoundaryType['value'];
    if (!districtBoundaryType) {
      this.displayMessage = true;
      this.userMessage = 'Please choose a district type.';
      return;
    }

    var electionType: string = this.electionType['value'];
    if (!electionType) {
      this.displayMessage = true;
      this.userMessage = 'Please choose an election type.';
      return;
    }

    var geographical: boolean = this.geographical;
    if (!geographical){
      this.displayMessage = true;
      this.userMessage = 'Please select a geographic restriction setting.';
      return
    }

    var fundedByCreator: boolean = this.fundedByCreatorOrg;
    if (!fundedByCreator){
      this.displayMessage = true;
      this.userMessage = 'Please select if creator org will fund this campaign.';
      return
    }

    var boundaryID: object = this.districtBoundary['value'];
    if ((!boundaryID || Object.keys(this.districtBoundaries).length === 0)
    ) {
      this.displayMessage = true;
      this.userMessage = 'Please choose a district.';
      return;
    }

    let boundaryType: string;

    boundaryType = 'DISTRICT';


    var orgID: string = sessionStorage.getItem('orgID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];

    this.loader = true;
    this.campaignService.createCampaign(campaignName, description, boundaryType, boundaryID, electionType, fundedByCreator, orgID, userID, geographical).subscribe(
      (results: UpdatedCampaign) => {
        if(results.success) {
          this.dialogRef.close(results);
        } else {
          this.userMessage = results.msg;
          this.displayMessage = true;
        }
        this.loader = false;
      },
      error => {
        this.loader = false;
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  getDistricts() {
    if(this.stateList[0] && this.districtBoundaryType['value']) {

      this.districtBoundary['value'] = undefined;
      this.districtBoundaries = [];
      this.districtBoundariesResults = [];
      this.loadingIDS = true;

          this.campaignService.getDistricts(this.stateList[0], this.districtBoundaryType['value']).subscribe(
            (results: any) => {

                this.loadingIDS = false;
                this.districtBoundaries = results;
                this.districtBoundariesResults = results;

            },
            error => {
              this.loadingIDS = false;
              this.displayErrorMsg = true;
              this.errorMessage = 'There was a problem with the server.';
            }
        );
      
    }
  }

  applyFilter(value: string) {
    if (value) {
      this.districtBoundaries = this.districtBoundariesResults;
      this.districtBoundaries = this.districtBoundaries.filter(option => option.properties.name.toLowerCase().startsWith(value.toLowerCase()));
    } else {
      this.districtBoundaries = this.districtBoundariesResults;
    }
  }

  ngOnInit(){}
} 
