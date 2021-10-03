import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../../services/target/target.service'
import {GeometryService} from '../../../../../services/geometry/geometry.service'


@Component({
    templateUrl: './createPolygonDialog.html',
  })
  
  export class CreatePolygonDialog implements OnInit{

    @ViewChild('polygonName', {static: true}) polygonName:ElementRef;
    @ViewChild('description', {static: true}) description:ElementRef;

    userMessage: string = ''
    displayMessage: boolean = false;

    demographics: {totalPop: 0}

    constructor(
        public dialogRef: MatDialogRef<CreatePolygonDialog>, 
        @Inject(MAT_DIALOG_DATA) public data: any, 
        public geoService: GeometryService,
        public targetService: TargetService) {

          console.log(data)
          this.demographics = data.properties.demographics
        }
  
    createPolygon(){
      var polygonName: string = this.polygonName.nativeElement.value;

      var description: string = this.description.nativeElement.value;

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
          description: description,
          campaignID: campaignID,
          userID: userID,
          demographics: this.data.properties.demographics
        },
        geometry: this.data.geometry
      }
      
      this.geoService.createPolygon(polygonDetail).subscribe(
        (polygon: any) => {

          if(polygon.polygon){
            this.dialogRef.close({polygon: polygon.polygon});
            return
          }

          this.userMessage = polygon.msg
          this.displayMessage = true
 
        }, 
        error =>{
          console.log(error)

        }
      )
    }

    ngOnInit(){}

    cancel(){
      this.dialogRef.close({cancel: true});
    }
}
