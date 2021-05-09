import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../services/target/target.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {ScriptService} from '../../../../services/script/script.service'
import {GeometryService} from '../../../../services/geometry/geometry.service'


@Component({
    templateUrl: './polygonDialog.html',
  })
  
  export class PolygonDialog implements OnInit{

    @ViewChild('polygonName', {static: true}) polygonName:ElementRef;

    userMessage: string = ''
    displayMessage: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<PolygonDialog>, 
        @Inject(MAT_DIALOG_DATA) public data: any, 
        public geoService: GeometryService,
        public targetService: TargetService) {
          console.log(data)
        }
  
    onNoClick(): void {
      this.dialogRef.close();
    }


    createPolygon(){
      var polygonName: string = this.polygonName.nativeElement.value;

      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
      var orgID: string = sessionStorage.getItem('orgID')
      var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

      if(polygonName === ''){
        this.userMessage = 'Polygon needs a name.';
        this.displayMessage = true;
        return
      }

      var polygonDetail = {
        properties: {
          name: polygonName,
          orgID: orgID,
          campaignID: campaignID,
          userID: userID
        },
        geometry: this.data.geometry
      }
      
      this.geoService.createPolygon(polygonDetail).subscribe(
        (polygon: any) => {
          if(polygon['success']){
            this.dialogRef.close(polygon);

          }else{
            console.log("Error?")
          }


        }, 
        error =>{
          console.log(error)

        }
      )
    }

    ngOnInit(){}
}
