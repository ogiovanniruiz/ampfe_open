import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service';
import {CampaignService} from '../../../../services/campaign/campaign.service';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {TargetService} from '../../../../services/target/target.service';

import {User, UpdatedUser} from '../../../../models/users/user.model'

import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model';

@Component({
    templateUrl: './editCampaignDialog.html',
    styleUrls: ['../../organization.component.scss']
})
  
export class EditCampaignDialog implements OnInit{

  @ViewChild('editCampaignName', {static: true}) editCampaignName: ElementRef;
  @ViewChild('editCampaignDescription', {static: true}) editCampaignDescription: ElementRef;
  @ViewChild('editState', {static: false}) editState: ElementRef;
  @ViewChild('editDistrictBoundaryType', {static: false}) editDistrictBoundaryType: ElementRef;
  @ViewChild('editDistrictBoundary', {static: false}) editDistrictBoundary: ElementRef;
  @ViewChild('editElectionType', {static: false}) editElectionType: ElementRef;

  stateList = ['California'];
  districtBoundariesType = ['County', 'Bos', 'Citywide', 'Cityward', 'Assembly', 'Congressional', 'Board Of Equalization', 'Senate', 'Recreational', 'School', 'Water', 'Statewide'];
  districtBoundaries = [];
  districtBoundariesResults = [];
  electionTypes = ['General', 'Primary', 'Presidential General', 'Presidential Primary', 'Special', 'Local', 'None'];
  loadingIDS: boolean = false;

  fundedByCreatorOrg: boolean;
  geographical: boolean;
  creatorOrgName: string = '';

  userMessage: string = '';
  displayMessage: boolean = false;

  errorMessage: string = '';
  displayErrorMsg: boolean = false;

  loader: boolean = true;

  targetsNum: number;

  campaignBoundary: any[]= [];

  finishLoading: boolean = false

  constructor(public dialogRef: MatDialogRef<EditCampaignDialog>, 
            @Inject(MAT_DIALOG_DATA) public data: any, 
            public userService: UserService, 
            public campaignService: CampaignService,
            public targetService: TargetService,
            public orgService: OrganizationService) {}

  editCampaign(command: string){
    var editData = {};

    var campaignName: string = this.editCampaignName.nativeElement.value
    if(campaignName === ""){
      this.displayMessage = true;
      this.userMessage = 'Campaign needs a name.';
      return;
    }
    var campaignDescription: string = this.editCampaignDescription.nativeElement.value;

    if (this.targetsNum === 0) {
      var editState: string = this.stateList[0];
      if (!editState) {
        this.displayMessage = true;
        this.userMessage = 'Please choose a state.';
        return;
      }

      var editDistrictBoundaryType: string = this.editDistrictBoundaryType['value'];
      if (!editDistrictBoundaryType) {
        this.displayMessage = true;
        this.userMessage = 'Please choose a district type.';
        return;
      }

      var editElectionType: string = this.editElectionType['value'];
      if (!editElectionType) {
        this.displayMessage = true;
        this.userMessage = 'Please choose an election type.';
        return;
      }

      var geographical: boolean = this.geographical;
      if (!geographical) {
        this.displayMessage = true;
        this.userMessage = 'Please select a geographic restriction setting.';
        return
      }

      var fundedByCreatorOrg: boolean = this.fundedByCreatorOrg;
      if (!fundedByCreatorOrg) {
        this.displayMessage = true;
        this.userMessage = 'Please select if creator org will fund this campaign.';
        return
      }

      var boundaryID: string = this.editDistrictBoundary['value'];
      if ((!boundaryID || Object.keys(this.districtBoundaries).length === 0) //&& (editDistrictBoundaryType !== 'Statewide' && (editDistrictBoundaryType !== 'None'))
      ) {
        this.displayMessage = true;
        this.userMessage = 'Please choose a district.';
        return;
      }

      let boundaryType: string;
      boundaryType = 'DISTRICT';

      editData = {
        boundaryType,
        boundaryID,
        editElectionType,
        geographical,
        fundedByCreatorOrg,
      };
    }

    this.loader = true;
    this.campaignService.editCampaign(campaignName, campaignDescription, editData, this.data.campaignID, command).subscribe(
      (result: UpdatedOrg)=>{
        if(result.success){
          this.dialogRef.close(result)
        }else{
          this.displayMessage = true;
          this.userMessage = result.msg
        }
        this.loader = false;
    }, error=>{
      console.log(error)
      this.loader = false;
      this.displayErrorMsg = true;
      this.errorMessage = 'A problem with the server prevented Campaign Update.';
    })
  }

  getDistricts() {
    if(this.stateList[0] && this.editDistrictBoundaryType['value']) {
      this.editDistrictBoundary['value'] = undefined;
      this.districtBoundaries = [];
      this.districtBoundariesResults = [];
      this.loadingIDS = true;

      this.campaignService.getDistricts(this.stateList[0], this.editDistrictBoundaryType['value']).subscribe(
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

  getCampaignBoundary(){
    this.campaignService.getCampaignBoundary(this.data.campaignID).subscribe(
      (boundary: any) =>{
        this.campaignBoundary = boundary;
        this.prefillCampaignDetails()
    })
  }

  deleteCampaign() {
    if (confirm('Would you like to delete this campaign from the database?')) {
      this.campaignService.deleteCampaign(this.data.campaignID, this.data.orgIDs).subscribe(
          (results: any) => {
            if (results.success) {
              this.dialogRef.close(results)
            } else {
              this.displayMessage = true;
              this.userMessage = results.msg;
            }
            this.loader = false;
          },
          error => {
            this.loader = false;
            this.displayErrorMsg = true;
            this.errorMessage = 'A problem with the server prevented Campaign Update.';
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

  prefillCampaignDetails(){
    this.editCampaignName.nativeElement.value = this.data.name;
    this.editCampaignDescription.nativeElement.value = this.data.description;

    var user: User = JSON.parse(sessionStorage.getItem('user'));

    this.targetService.getAllCampaignTargets(this.data.campaignID).subscribe(async (targets: []) =>{

      this.targetsNum = targets.length;

      if(user.dev){
        this.targetsNum = 0
      }

      if (this.targetsNum === 0) {

        this.editDistrictBoundaryType['value'] = this.campaignBoundary[0].properties.districtType.charAt(0).toUpperCase() + this.campaignBoundary[0].properties.districtType.slice(1).toLowerCase();

        this.getDistricts();
        var bound = [];
        for(var i = 0; i < this.campaignBoundary.length; i++){
          bound[i] = await this.campaignBoundary[i].properties.identifier;
        }
        this.editDistrictBoundary['value'] = bound;
        this.editElectionType['value'] = this.data.electionType;
        this.geographical = this.data.geographical.toString();
        this.fundedByCreatorOrg = this.data.fundedByCreatorOrg.toString();
      }

      this.orgService.getOrganization(this.data.creatorOrg).subscribe(
          (org: Organization) =>{
            this.creatorOrgName = org.name;
            this.finishLoading = true
            this.loader = false;
          }
      );

    });

  }

  return(){this.dialogRef.close()}
  
  ngOnInit(){
    this.getCampaignBoundary()
  }
} 
