import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../services/target/target.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {ScriptService} from '../../../../services/script/script.service'
import { QueryBuilderConfig, QueryBuilderComponent, Rule } from 'angular2-query-builder';

import {Estimate} from '../../../../models/targets/target.model'
import {AmplifyService} from '../../../../services/amplify/amplify.service';
import {memberConfigTemplate, indivConfigTemplate, hhConfigTemplate} from './config'
import {MembershipService} from '../../../../services/membership/membership.service'

@Component({
    templateUrl: './targetCreatorDialog.html',
  })

  export class TargetCreatorDialog implements OnInit{

    userMessage: string = '';
    displayMessage: boolean = false;
    estimate: Estimate = {totalHouseHolds: 0, totalResidents: 0, filter: {}, houseHolds: []}
    gettingEstimate: boolean = false;
    dataManager: boolean = false;
    dev: boolean = false;
    campaignTargets: unknown[] = [];
    idByHousehold: string;

    polygonKeys = {};
    cities: string[];
    zips: string[];
    uploads: []

    loadingZips: boolean = false 

    @ViewChild('targetName', {static: false}) targetName:ElementRef;
    @ViewChild('campaignWide', {static: false}) campaignWide:ElementRef;
    campaignBoundary;

    queries = {
      condition: 'and',
      rules: []
    };

    indivConfig: QueryBuilderConfig = indivConfigTemplate
    hhConfig: QueryBuilderConfig = hhConfigTemplate
    memberConfig: QueryBuilderConfig = memberConfigTemplate


    constructor(
        public dialogRef: MatDialogRef<TargetCreatorDialog>, 
        public scriptService: ScriptService,
        @Inject(MAT_DIALOG_DATA) public data: any, 
        public targetService: TargetService, 
        public orgService: OrganizationService,
        public ampService: AmplifyService,
        public memberService: MembershipService,
        ) {          
          this.campaignBoundary = data.campaignBoundary;
          var orgID: string = sessionStorage.getItem('orgID')
          var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

          this.indivConfig.fields.polygons.options = []
          this.hhConfig.fields.polygons.options = []
          this.memberConfig.fields.polygons.options = []

          this.memberConfig.fields.uploads.options = []

          for(var i = 0; i < data.polys.length; i++){
            if(data.polys[i].properties.orgID === orgID && data.polys[i].properties.campaignID === campaignID){
              this.hhConfig.fields.polygons.options.push({name: data.polys[i].properties.name, value: data.polys[i].properties.name })
              this.memberConfig.fields.polygons.options.push({name: data.polys[i].properties.name, value: data.polys[i].properties.name })
              this.indivConfig.fields.polygons.options.push({name: data.polys[i].properties.name, value: data.polys[i].properties.name })
              this.polygonKeys[data.polys[i].properties.name] = data.polys[i].geometry.coordinates;
            }
          }
        }

    getCities(){
      this.ampService.getCities(this.campaignBoundary).subscribe(
        (cities: string[]) => {
          this.cities = cities
          for(var i = 0; i < cities.length; i++){
            this.hhConfig.fields.cities.options.push({name: this.cities[i], value: this.cities[i]})
            this.memberConfig.fields.cities.options.push({name: this.cities[i], value: this.cities[i]})
            this.indivConfig.fields.cities.options.push({name: this.cities[i], value: this.cities[i]})
          }
      })
    }

    getZips(){
      this.loadingZips = true
      this.ampService.getZips(this.campaignBoundary).subscribe(
        (zips: string[]) => {
          this.zips = zips
          for(var i = 0; i < zips.length; i++){
            this.hhConfig.fields.zips.options.push({name: zips[i], value: zips[i]})
            //this.memberConfig.fields.zips.options.push({name: zips[i], value: zips[i]})
            this.indivConfig.fields.zips.options.push({name: zips[i], value: zips[i]})
          }
          this.loadingZips = false
      })
    }

    getOrgTags(){
      var orgID: string = sessionStorage.getItem('orgID')
      this.orgService.getOrgTags(orgID).subscribe(
        (tags: string[]) =>{
          this.memberConfig.fields.tags.options = []
          for(var i = 0; i < tags.length; i++){
            this.memberConfig.fields.tags.options.push({name: tags[i], value: tags[i]})
          }
        }, 
        error=>{
          console.log(error)
          //this.displayErrorMsg = true;
          //this.errorMessage = "There was a problem with the server."
        }
      )
    }

    getEstimate(){
      this.gettingEstimate = true;
      this.displayMessage = false;

      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID');


      var idByHousehold: string = this.idByHousehold;
      if (!idByHousehold){
        this.userMessage = 'Please select a target by';
        this.gettingEstimate = false;
        this.displayMessage = true;
        return;
      }

      if(this.queries.rules.length === 0 && idByHousehold != "MEMBERSHIP"){
        this.userMessage = 'Target needs rules.';
        this.gettingEstimate = false;
        this.displayMessage = true;
        return;
      }

      for(var i = 0; i < this.queries.rules.length; i++){

        if(this.queries.rules[i].field === 'polygons'){
          var coordinates = []

          for(var j = 0; j < this.queries.rules[i].value.length; j++){
            coordinates.push(this.polygonKeys[this.queries.rules[i].value[j]])
          }

          var geometry = {type: 'MultiPolygon', coordinates: coordinates}
          this.queries.rules[i].geometry = geometry//this.polygonKeys[this.queries.rules[i].value]
        }
      }

      var estimate: unknown = {
        orgID: orgID,
        campaignID: campaignID,
        queries: this.queries,
        idByHousehold: idByHousehold
      }

      this.targetService.getEstimate(estimate).subscribe(
        (result: Estimate) =>{
          this.estimate = result
          this.gettingEstimate = false;
        },
        error =>{
          console.log(error)
          this.gettingEstimate = false;
          this.userMessage = "There was an error from the server. The query is too large or improperly formed."
          this.displayMessage = true
        }
      )
    }

    createTarget(){

      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
      var orgID: string = sessionStorage.getItem('orgID')

      var targetName: string = this.targetName.nativeElement.value

      if(targetName === ''){
        this.userMessage = "Target needs a name.";
        this.displayMessage = true;
        return
      }

      var idByHousehold: string = this.idByHousehold;
      if (!idByHousehold){
        this.userMessage = 'Please select a target by';
        this.displayMessage = true;
        return;
      }

      if(this.queries.rules.length === 0 && idByHousehold != "MEMBERSHIP"){
        this.userMessage = "Target needs rules.";
        this.displayMessage = true;
        return
      }

      var geometric = false;

      for(var i = 0; i < this.queries.rules.length; i++){
        if(this.queries.rules[i].field === 'polygons'){
          geometric = true;

          var coordinates = []

          for(var j = 0; j < this.queries.rules[i].value.length; j++){
            coordinates.push(this.polygonKeys[this.queries.rules[i].value[j]])
          }

          var geometry = {type: "MultiPolygon", coordinates: coordinates}
          this.queries.rules[i].geometry = geometry
        }
      }

      var campaignWide = this.campaignWide['checked']

      var targetProperties= {
                            name: targetName,
                            idByHousehold: idByHousehold,
                            queries: this.queries,
                            campaignID: campaignID,
                            orgID: orgID,
                            campaignWide: campaignWide,
                            geometric: geometric
                          }

      this.targetService.createTarget(targetProperties).subscribe(
        (result: unknown)=>{
          if(result['success']){
            this.dialogRef.close();
          }else{
            this.userMessage = result['msg']
            this.displayMessage = true
          }
        },
        error =>{
          console.log(error)
        }
      )
    }

    getDataManagerStatus(){
      var user = JSON.parse(sessionStorage.getItem('user'))
      this.dev = user.dev
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      for (var i = 0; i< user.dataManager.length; i++){
        if(user.dataManager[i] === campaignID ){
          this.dataManager = true;
        }
      }
    }
    
    selectTarget(target){
      this.queries = target.properties.queries;
    }

    getCampaignWideTargets(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      this.targetService.getCampaignWideTargets(campaignID).subscribe(
        (targets: unknown[]) =>{
          this.campaignTargets = targets
        },
        error =>{
          console.log(error)
        }
      )
    }

    getScripts(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID')

      this.scriptService.getAllScripts(orgID, campaignID).subscribe(
        (scripts: unknown[]) =>{
          this.hhConfig.fields.scripts.options = []
          this.memberConfig.fields.scripts.options = []
          this.indivConfig.fields.scripts.options = []
          for(var i = 0; i < scripts.length; i++){
            if(scripts[i]['orgStatus'].active){
              for(var j = 0; j < scripts[i]['questions'].length; j++){
                for(var k = 0; k < scripts[i]['questions'][j].responses.length; k++){
                  
                  var name = scripts[i]['title'] + " - " + 
                             scripts[i]['questions'][j]['question'] + " - " + 
                             scripts[i]['questions'][j]['responses'][k]['response']
  
                  var value = {title: scripts[i]['title'], 
                               _id:scripts[i]['_id'],
                               question: scripts[i]['questions'][j]['question'], 
                               response: scripts[i]['questions'][j]['responses'][k]['response']}
  
                  this.hhConfig.fields.scripts.options.push({name: name, value: value})
                  this.memberConfig.fields.scripts.options.push({name: name, value: value})
                  this.indivConfig.fields.scripts.options.push({name: name, value: value})
                }
              }
            }
          }
        },
        error =>{
          console.log(error)
        }
      )
    }

    getNonreponseSets(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID')

      this.scriptService.getAllNonResponseSets(orgID, campaignID).subscribe(
        (nonResponseSets: any[]) =>{
          this.hhConfig.fields.nonResponseSets.options = []
          this.memberConfig.fields.nonResponseSets.options = []
          this.indivConfig.fields.nonResponseSets.options = []

          for(var i = 0; i < nonResponseSets.length; i++){
            for(var j = 0; j < nonResponseSets[i].nonResponses.length; j++){
              var name = nonResponseSets[i]['title'] + " - " + nonResponseSets[i]['nonResponses'][j]['nonResponse']

              var value = {title: nonResponseSets[i]['title'], 
                           _id: nonResponseSets[i]['_id'],
                           nonResponse: nonResponseSets[i]['nonResponses'][j]['nonResponse'],
                           nonResponseType: nonResponseSets[i]['nonResponses'][j]['nonResponseType']
                          }

              if(value.nonResponseType != "DNC" && value.nonResponseType != "INVALIDPHONE"){
                this.hhConfig.fields.nonResponseSets.options.push({name: name, value: value})
                this.memberConfig.fields.nonResponseSets.options.push({name: name, value: value})
                this.indivConfig.fields.nonResponseSets.options.push({name: name, value: value})

              }
            }
          }
        }
      )
    }

    targetBy(event){
      this.queries = undefined
    }

    downloadList(){

      //let binaryData = ['firstName,lastName,middleName,address,city,zip,affidavit\n'];

      let binaryData = ['affidavit, phone\n'];

      for(var i = 0; i < this.estimate.houseHolds['length']; i++){
        for(var k = 0; k < this.estimate.houseHolds[i]['residents'].length; k++){
          //binaryData.push(this.estimate.houseHolds[i]['residents'][k]['name']['firstName'] + ',')
          //binaryData.push(this.estimate.houseHolds[i]['residents'][k]['name']['lastName'] + ',')
         // binaryData.push(this.estimate.houseHolds[i]['residents'][k]['name']['middleName'] + ',')
          
         // var address = this.estimate.houseHolds[i]['_id']['streetNum'] + " "
          //this.estimate.houseHolds[i]['_id']['prefix'] + " "
          //this.estimate.houseHolds[i]['_id']['street'] + " "
          //this.estimate.houseHolds[i]['_id']['suffix'] + " "
          //this.estimate.houseHolds[i]['_id']['unit']
          
          
          //binaryData.push(address + ',')
          //binaryData.push(this.estimate.houseHolds[i]['_id']['city'] + ',')
          //binaryData.push(this.estimate.houseHolds[i]['_id']['zip'] )
          binaryData.push(this.estimate.houseHolds[i]['residents'][k]['affidavit'] + "," +
                          this.estimate.houseHolds[i]['residents'][k]['phones'][0]['number'] + '\n')
        }
        
      }
      

      let downloadLink = document.createElement('a');

      let blob = new Blob(binaryData, {type: 'blob'});
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.setAttribute('download', 'EstimateList.csv');
      document.body.appendChild(downloadLink);
      downloadLink.click();

    }

    getUploads(){
      var orgID: string = sessionStorage.getItem('orgID');
      this.memberService.getUploads(orgID).subscribe(
        (uploads: [])=>{
          this.uploads = uploads
          for(var i = 0; i < uploads.length; i++){
            this.memberConfig.fields.uploads.options.push({name: uploads[i]['fileName'], value: uploads[i]['_id']})
          }
        }
      )
    }

    ngOnInit(){
      this.getDataManagerStatus();
      this.getCampaignWideTargets();
      this.getScripts();
      this.getNonreponseSets();
      this.getCities();
      this.getOrgTags();
      this.getUploads();
      this.getZips()
    }
}