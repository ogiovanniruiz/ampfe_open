import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {GeometryService} from '../../../../services/geometry/geometry.service'

@Component({
    templateUrl: './clinicDialog.html',
  })

  export class ClinicDialog implements OnInit{
    userMessage: string;
    displayMessage: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<ClinicDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public geoService: GeometryService,
        public orgService: OrganizationService) {}

    ngOnInit(){}

}
