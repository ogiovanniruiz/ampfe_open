import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { CampaignService } from 'src/app/services/campaign.service';
import {District} from '../../models/district.model'

@Component({
    selector: 'app-root',
    templateUrl: './mapDialog.html',
    styleUrls: ['../../app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class MapDialog implements OnInit{

  stateList: string[] = ['California'];

  assemblyDistrictsFormControl = new FormControl([]);
  assemblyList: string[] = [];

  senateDistrictsFormControl = new FormControl([]);
  senateList: string[] = [];

  congressionalDistrictsFormControl = new FormControl([]);
  congressionalList: string[] = [];

  bosDistrictsFormControl = new FormControl([]);
  bosList: string[] = [];

  wardDistrictsFormControl = new FormControl([]);
  wardList: string[] = [];


  constructor(
      public dialogRef: MatDialogRef<MapDialog>,
      private campaignService: CampaignService
    ) 
  {}

  ngOnInit() {
      this.getDistrictProperties()
  }

  closeSettings(){
      this.dialogRef.close()
  }

  selectIEUDistricts(){
      this.assemblyDistrictsFormControl.setValue(["CA_ASSEMBLY_50", "CA_ASSEMBLY_53", "CA_ASSEMBLY_58", "CA_ASSEMBLY_60", "CA_ASSEMBLY_47"])
      this.senateDistrictsFormControl.setValue(["CA_SENATE_23", "CA_SENATE_29", "CA_SENATE_31",]);
      this.congressionalDistrictsFormControl.setValue(['CA_CONGRESSIONAL_41']);
      this.bosDistrictsFormControl.setValue(["CA_BOS_RIV_1", "CA_BOS_RIV_2", "CA_BOS_RIV_3", "CA_BOS_RIV_4", "CA_BOS_RIV_5", 
                                             "CA_BOS_SB_1", "CA_BOS_SB_2", "CA_BOS_SB_3", "CA_BOS_SB_4", "CA_BOS_SB_5"]);

      this.wardDistrictsFormControl.setValue(["CA_CITYWARD_SANBERNARDINOWARD1", 
                                              "CA_CITYWARD_SANBERNARDINOWARD2", 
                                              "CA_CITYWARD_SANBERNARDINOWARD3", 
                                              "CA_CITYWARD_SANBERNARDINOWARD4", 
                                              "CA_CITYWARD_SANBERNARDINOWARD5", 
                                              "CA_CITYWARD_SANBERNARDINOWARD6", 
                                              "CA_CITYWARD_SANBERNARDINOWARD7", 
                                              "CA_CITYWARD_RIVERSIDE1", 
                                              "CA_CITYWARD_RIVERSIDE2", 
                                              "CA_CITYWARD_RIVERSIDE3",
                                              "CA_CITYWARD_RIVERSIDE4",
                                              "CA_CITYWARD_RIVERSIDE5",
                                              "CA_CITYWARD_RIVERSIDE6",
                                              "CA_CITYWARD_RIVERSIDE7"
                                            ]);                                    
  }

  getDistrictProperties(){
    this.campaignService.getDistrictProperties(this.stateList[0], "ASSEMBLY").subscribe(
      (districts: District[]) => {
        this.assemblyList = districts.map((district: District) =>{return district.properties.identifier})  
      }
    )

    this.campaignService.getDistrictProperties(this.stateList[0], "SENATE").subscribe(
      (districts: District[]) => {
        this.senateList = districts.map((district: District) =>{return district.properties.identifier})
      }
    )

    this.campaignService.getDistrictProperties(this.stateList[0], "CONGRESSIONAL").subscribe(
      (districts: District[]) => {
        this.congressionalList = districts.map((district: District) =>{return district.properties.identifier})      
      }
    )
    
    this.campaignService.getDistrictProperties(this.stateList[0], "BOS").subscribe(
      (districts: District[]) => {
        this.bosList = districts.map((district: District) =>{return district.properties.identifier})
      }
    )

    this.campaignService.getDistrictProperties(this.stateList[0], "CITYWARD").subscribe(
      (districts: District[]) => {
        this.wardList = districts.map((district: District) =>{return district.properties.identifier})
      }
    )
  }

  getDistrictsById(){
      var selectedBOSDistricts: string[] = this.bosDistrictsFormControl.value
      var selectedWardDistricts: string[] = this.wardDistrictsFormControl.value

      var selectedAssemblyDistricts: string[] = this.assemblyDistrictsFormControl.value
      var selectedSenateDistricts: string[] = this.senateDistrictsFormControl.value
      var selectedCongressionalDistricts: string[] = this.congressionalDistrictsFormControl.value
      var totalSelectedDistricts: string[] = selectedSenateDistricts.concat(selectedBOSDistricts, selectedAssemblyDistricts, selectedCongressionalDistricts, selectedWardDistricts)
      
      this.dialogRef.close(totalSelectedDistricts)
  }
}