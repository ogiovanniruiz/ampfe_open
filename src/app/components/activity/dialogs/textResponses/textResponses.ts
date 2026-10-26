import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {PhonebankService} from '../../../../services/phonebank.service'
import { TextingService } from 'src/app/services/texting.service';

@Component({
    templateUrl: './textResponses.html',
    styleUrls: ['../../activity.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false

  })

export class TextResponsesDialog implements OnInit{

    orphanedTexts = []

    constructor(
            public dialogRef: MatDialogRef<TextResponsesDialog>, 
            private phonebankService: PhonebankService,
            private textingService: TextingService
        ) { }

    ngOnInit(){
        this.getOrphanedTexts()
    }

    getOrphanedTexts(){
        var orgID: string = sessionStorage.getItem('orgID') || '';
        let campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");

        this.phonebankService.getOrphanedTexts(campaignID).subscribe((result: any[]) =>{
            this.orphanedTexts = result
        })

    }

    return(){this.dialogRef.close()}
}
