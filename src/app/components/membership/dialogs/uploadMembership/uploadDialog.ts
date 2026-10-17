import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UntypedFormControl} from '@angular/forms';
import {Subscription} from 'rxjs';

import {UserService} from '../../../../services/user.service';
import {OrganizationService} from '../../../../services/organization/organization.service';

import {MembershipService} from '../../../../services/membership.service';
import { TagDefinition } from 'src/app/models/organization.model';

interface ColumnMapping {
  header: string;
  control: UntypedFormControl;
}

// Normalized CSV header -> our header, used to pre-fill the column mapping
const HEADER_ALIASES: {[normalized: string]: string} = {
  voterid: 'voterID', registrantid: 'voterID', voternumber: 'voterID',
  fullname: 'full name', name: 'full name',
  firstname: 'first name', fname: 'first name', first: 'first name', givenname: 'first name',
  middlename: 'middle name', mname: 'middle name', middle: 'middle name', middleinitial: 'middle name',
  lastname: 'last name', lname: 'last name', last: 'last name', surname: 'last name',
  phone: 'phone', phonenumber: 'phone', cell: 'phone', cellphone: 'phone', mobile: 'phone', mobilephone: 'phone',
  email: 'email', emailaddress: 'email',
  address: 'address', address1: 'address', street: 'address', streetaddress: 'address',
  address2: 'address2',
  city: 'city',
  state: 'state',
  zip: 'zip', zipcode: 'zip', postalcode: 'zip',
  ethnicity: 'ethnicity',
  tag: 'tag', tags: 'tag',
  unit: 'unit', apt: 'unit', apartment: 'unit',
};

const NAME_PARTS = ['first name', 'middle name', 'last name'];

@Component({
  templateUrl: './uploadDialog.html',
  styleUrls: ['../../membership.component.scss', './uploadDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class UploadDialog implements OnInit, OnDestroy{

    selectedTags = new UntypedFormControl();
    checkVoterfile = new UntypedFormControl(false);
    checkDuplicates = new UntypedFormControl(false);

    tags: string[] = [];
    // Tags with values: a column can be mapped to one of them, its cells holding each person's value
    tagValueTargets: {label: string, value: string}[] = [];

    file: File;

    userMessage: string = '';
    displayMessage: boolean = false;

    uploading: boolean = false;
    dragOver: boolean = false;

    ourHeaders: string[] = ['voterID', 'full name', 'first name', 'middle name', 'last name', 'phone', 'email', 'address', 'address2','city', 'state', 'zip', 'ethnicity', 'tag', 'unit'];
    columns: ColumnMapping[] = [];

    private columnSubs: Subscription[] = [];

    @ViewChild('uploadName', {static: true}) uploadName: ElementRef;


    constructor(public dialogRef: MatDialogRef<UploadDialog>,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public userService: UserService,
                public memberService: MembershipService,
                public orgService: OrganizationService,
                private snackBar: MatSnackBar) {}

    getOrgTags(){
      var orgID: string = sessionStorage.getItem('orgID');
      this.orgService.getOrgTags(orgID).subscribe(
        (tags: string[]) =>{
          this.tags = tags;
        },error =>{
          console.log(error)
          this.showMessage('Could not load tags. You can still upload without them.');
        }
      );
      this.orgService.getTagDefinitions(orgID).subscribe(
        (definitions: TagDefinition[]) => {
          this.tagValueTargets = (definitions || []).filter(d => d.values?.length).map(d => ({label: d.label, value: 'tagValue:' + d.label}));
          this.suggestTagColumns();
        },
        error => console.log(error)
      );
    }

    // A column named like a tag with values (e.g. "Immigrant Justice") is mapped to that tag
    private suggestTagColumns(){
      const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
      this.columns.filter(col => !col.control.value).forEach(col => {
        const target = this.tagValueTargets.find(t => normalize(t.label) === normalize(col.header));
        if(target && !this.isUsed(target.value, col)) col.control.setValue(target.value);
      });
    }

    get mappedCount(): number {
      return this.columns.filter(col => col.control.value).length;
    }

    // The server only saves rows with a first name or voterID (full name is split into first/last)
    get hasNameOrId(): boolean {
      return this.columns.some(col => ['first name', 'full name', 'voterID'].includes(col.control.value));
    }

    isUsed(ourHeader: string, current: ColumnMapping): boolean {
      return this.columns.some(col => col !== current && col.control.value === ourHeader);
    }

    fileChanged(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length) this.loadFile(input.files[0]);
      // Allow picking the same file again after changing it
      input.value = '';
    }

    onDragOver(event: DragEvent){
      event.preventDefault();
      this.dragOver = true;
    }

    onDrop(event: DragEvent){
      event.preventDefault();
      this.dragOver = false;
      const file = event.dataTransfer && event.dataTransfer.files[0];
      if (!file) return;
      if (!/\.csv$/i.test(file.name)) {
        this.showMessage('Please choose a .csv file.');
        return;
      }
      this.loadFile(file);
    }

    loadFile(file: File){
      this.file = file;
      this.displayMessage = false;

      if (!this.uploadName.nativeElement.value) {
        this.uploadName.nativeElement.value = file.name.replace(/\.[^.]+$/, '');
      }

      // Only the header row is needed here, so skip reading the whole file
      const reader = new FileReader();
      reader.onloadend = () => this.constructHeaderObject(reader.result);
      reader.readAsText(file.slice(0, 64 * 1024));
    }

    constructHeaderObject(text: string | ArrayBuffer){
      this.clearColumns();
      if (typeof(text) !== 'string') return;

      const firstLine = text.replace(/^﻿/, '').split(/\r?\n/)[0];
      const headers = this.splitCsvLine(firstLine).filter(header => header);

      if (!headers.length) {
        this.showMessage('No column headers were found in the first row of this file.');
        return;
      }

      const used = new Set<string>();
      this.columns = headers.map(header => {
        let suggestion = HEADER_ALIASES[header.toLowerCase().replace(/[^a-z0-9]/g, '')] || null;
        if (suggestion && used.has(suggestion)) suggestion = null;
        if (suggestion) used.add(suggestion);
        return {header, control: new UntypedFormControl(suggestion)};
      });

      // Don't suggest full name alongside first/middle/last name
      if (used.has('full name') && NAME_PARTS.some(part => used.has(part))) {
        this.columns.filter(col => col.control.value === 'full name').forEach(col => col.control.setValue(null));
      }

      this.suggestTagColumns();

      this.columns.forEach(col => {
        this.columnSubs.push(col.control.valueChanges.subscribe(value => this.onMappingChanged(col, value)));
      });
    }

    // Quote-aware split of a single CSV line
    splitCsvLine(line: string): string[] {
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());
      return fields;
    }

    onMappingChanged(changed: ColumnMapping, value: string){
      this.displayMessage = false;
      if (!value) return;

      const conflicts = (other: string) =>
        other === value ||
        (value === 'full name' && NAME_PARTS.includes(other)) ||
        (NAME_PARTS.includes(value) && other === 'full name');

      this.columns.forEach(col => {
        if (col !== changed && col.control.value && conflicts(col.control.value)) {
          col.control.setValue(null, {emitEvent: false});
        }
      });
    }

    checkUpload(){
      if (this.uploading) return;

      if (!this.file){
        this.showMessage('Choose a CSV file to upload.');
        return;
      }

      const uploadName = (this.uploadName.nativeElement.value || '').trim();
      if (!uploadName){
        this.showMessage('Give this upload a name.');
        return;
      }

      if (!this.hasNameOrId){
        this.showMessage('Map a column to first name, full name or voterID. Rows without one are skipped.');
        return;
      }

      var formData = new FormData();

      var orgID = sessionStorage.getItem('orgID');
      var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];
      formData.append('file', this.file);
      formData.append('orgID', orgID);
      formData.append('userID', userID);
      formData.append('uploadName', uploadName);
      formData.append('checkDuplicates', String(!!this.checkDuplicates.value));
      formData.append('checkVoterfile', String(!!this.checkVoterfile.value));

      this.columns
        .filter(col => col.control.value)
        .forEach(col => formData.append(col.header, col.control.value));

      if (this.selectedTags.value && this.selectedTags.value.length){
        formData.append('selectedTags', this.selectedTags.value.toString());
      }

      if (this.tags && this.tags.length){
        formData.append('orgTags', this.tags.toString());
      }

      this.displayMessage = false;
      this.uploadData(formData);
    }

    uploadData(formData: FormData){
      this.setUploading(true);

      this.memberService.uploadMembership(formData).subscribe(
        (result:any) =>{
          this.setUploading(false);
          if (result.success){
            this.snackBar.open('Upload complete.', 'Dismiss', {duration: 3000});
            this.dialogRef.close("Uploaded");
          }
          else this.showMessage(result.msg || 'The upload failed.');
        },
        error =>{
          console.log(error)
          this.setUploading(false);
          this.showMessage('There was a problem with the server. Please try again.');
        }
      );
    }

    // Keep the dialog open (no backdrop/Esc close) while the request is in flight
    setUploading(uploading: boolean){
      this.uploading = uploading;
      this.dialogRef.disableClose = uploading;
    }

    showMessage(message: string){
      this.userMessage = message;
      this.displayMessage = true;
    }

    clearColumns(){
      this.columnSubs.forEach(sub => sub.unsubscribe());
      this.columnSubs = [];
      this.columns = [];
    }

    cancel(){this.dialogRef.close()}

    ngOnInit(){
      this.getOrgTags();
    }

    ngOnDestroy(){
      this.clearColumns();
    }
}
