import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../../services/target/target.service'
import {GeometryService} from '../../../../../services/geometry/geometry.service'


@Component({
    templateUrl: './editPolygonDialog.html',
  })
  
export class EditPolygonDialog implements OnInit{

  @ViewChild('polygonName', {static: true}) polygonName:ElementRef;
  @ViewChild('description', {static: true}) description:ElementRef;

  userMessage: string = ''
  displayMessage: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<EditPolygonDialog>, 
    @Inject(MAT_DIALOG_DATA) public data: any, 
    public geoService: GeometryService,
    public targetService: TargetService) {}
  
  editPolygon(){
    var polygonName: string = this.polygonName.nativeElement.value;
    var description: string = this.description.nativeElement.value;

    if(polygonName === ''){
      this.userMessage = 'Polygon needs a name.';
      this.displayMessage = true;
      return
    }

    var polygonDetail = {
      _id: this.data._id,
      properties: {
        name: polygonName,
        description: description,
      },
    }
      
    this.geoService.editPolygon(polygonDetail).subscribe(
      (polygon: any) => {
          this.dialogRef.close({polygon: polygon});
      }, 
      error =>{
        console.log(error)
      }
    )
  }

  prefillPolygonData(){
    this.polygonName.nativeElement.value = this.data.properties.name
    if(this.data.properties.description) this.description.nativeElement.value = this.data.properties.description
  }

  ngOnInit(){
    this.prefillPolygonData()
  }

  delete(){
    this.geoService.removePolygon(this.data._id).subscribe(
      () => {
        this.dialogRef.close({delete: true});
      }
    )
  }
}
