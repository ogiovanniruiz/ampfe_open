import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { Group } from 'src/app/models/group.model';
import { GroupService } from 'src/app/services/group.service';
import { formatAddress } from 'src/app/components/canvass/canvassUtils';

type ExportMode = 'mailer' | 'emailPhoneList';

interface FieldOption {
  key: string;
  label: string;
}

// Email/phone list columns, in the order they appear in the CSV
const FIELD_GROUPS: {title: string, fields: FieldOption[]}[] = [
  {title: 'Name', fields: [
    {key: 'firstName', label: 'First name'},
    {key: 'middleName', label: 'Middle name'},
    {key: 'lastName', label: 'Last name'},
  ]},
  {title: 'Contact', fields: [
    {key: 'email', label: 'Email'},
    {key: 'phone', label: 'Phone'},
  ]},
  {title: 'Address', fields: [
    {key: 'address', label: 'Street address'},
    {key: 'city', label: 'City'},
    {key: 'zip', label: 'Zip'},
    {key: 'county', label: 'County'},
    {key: 'precinct', label: 'Precinct'},
  ]},
  {title: 'Demographics', fields: [
    {key: 'age', label: 'Age'},
    {key: 'ethnicity', label: 'Ethnicity'},
    {key: 'party', label: 'Party'},
  ]},
  {title: 'IDs', fields: [
    {key: 'ampID', label: 'Amp ID'},
    {key: 'voterID', label: 'Voter ID'},
  ]},
];

// The server calls the precinct column "precinctID"
const SERVER_FIELD_NAMES: {[key: string]: string} = {precinct: 'precinctID'};

const MAILER_COLUMNS = ['firstName', 'lastName', 'address', 'city', 'state', 'zip'];
const MAILER_COLUMN_LABELS = ['First name', 'Last name', 'Address', 'City', 'State', 'Zip'];

const DEFAULT_FIELDS = ['firstName', 'middleName', 'lastName', 'email', 'phone', 'ampID'];

@Component({
    templateUrl: './rawGroupDataDialog.html',
    styleUrls: ['../../../campaignMap.component.scss', './rawGroupDataDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class RawGroupDataDialog implements OnInit{

  orgGroups: Group[] = []
  loadingGroups: boolean = true

  selectedGroup: Group | null = null
  exportMode: ExportMode = 'emailPhoneList'

  fieldGroups = FIELD_GROUPS
  mailerColumns = MAILER_COLUMN_LABELS

  fields = this._formBuilder.group(
    Object.fromEntries(FIELD_GROUPS.flatMap(group => group.fields).map(field => [field.key, DEFAULT_FIELDS.includes(field.key)]))
  );

  exporting: boolean = false
  resultMessage: string = ''
  resultIsError: boolean = false

  constructor(
    @Inject(MAT_DIALOG_DATA) public campaignBoundary: unknown[],
    public dialogRef: MatDialogRef<RawGroupDataDialog>, 
    private _formBuilder: FormBuilder,
    private groupService: GroupService
  ) {}

  ngOnInit(){
    this.getAllCampaignGroups()
  }

  return(){
    this.dialogRef.close()
  }

  getAllCampaignGroups(){
    let campaignID = parseInt(sessionStorage.getItem('campaignID') || '-1');
    let orgID = sessionStorage.getItem('orgID') || '';
    this.groupService.getAllCampaignGroups(campaignID).subscribe(
      (groups: any[]) => {
        this.loadingGroups = false
        this.orgGroups = (groups || []).filter((group: Group) => group.orgID === orgID && group.active && !group.campaignWide)
      },
      error => {
        this.loadingGroups = false
        this.showResult('Could not load your groups. Please try again.', true, error)
      }
    );
  }

  //////////////////////// SELECTION ////////////////////////

  groupTypeLabel(group: Group): string {
    return {HOUSEHOLD: 'Household group', INDIVIDUAL: 'Individual group', MEMBERSHIP: 'Membership group'}[group?.groupBy] || ''
  }

  // Membership records come back without a mailing address
  get mailerAvailable(): boolean {
    return this.selectedGroup?.groupBy !== 'MEMBERSHIP'
  }

  selectGroup(group: Group){
    this.selectedGroup = group
    this.resultMessage = ''
    if(!this.mailerAvailable && this.exportMode === 'mailer') this.exportMode = 'emailPhoneList'
  }

  setMode(mode: ExportMode){
    if(mode === 'mailer' && !this.mailerAvailable) return
    this.exportMode = mode
    this.resultMessage = ''
  }

  get selectedFields(): string[] {
    const values = this.fields.getRawValue()
    return FIELD_GROUPS.flatMap(group => group.fields).map(field => field.key).filter(key => values[key])
  }

  setAllFields(checked: boolean){
    const values = {}
    FIELD_GROUPS.flatMap(group => group.fields).forEach(field => values[field.key] = checked)
    this.fields.setValue(values)
  }

  get canExport(): boolean {
    if(!this.selectedGroup || this.exporting) return false
    if(this.exportMode === 'mailer') return this.mailerAvailable
    return this.selectedFields.length > 0
  }

  //////////////////////// EXPORT ////////////////////////

  exportCSV(){
    if(!this.canExport) return
    this.resultMessage = ''
    if(this.exportMode === 'mailer') this.downloadMailerList(this.selectedGroup)
    else this.downloadEmailPhoneList(this.selectedGroup)
  }

  private showResult(message: string, isError: boolean, error?: any){
    if(error) console.log(error)
    this.exporting = false
    this.resultMessage = message
    this.resultIsError = isError
  }

  downloadEmailPhoneList(group: Group){
    const fields = this.selectedFields
    this.exporting = true;

    this.groupService.exportEmailPhoneList(group, fields.map(field => SERVER_FIELD_NAMES[field] || field)).subscribe(
      (rawGroupData: any[]) => {
        const people = rawGroupData || []
        if(people.length === 0){
          this.showResult('No people in this group have an email or phone.', true)
          return
        }

        const rows = people.map(person => fields.map(field => {
          const value = person[SERVER_FIELD_NAMES[field] || field]
          // The server sends the street address as an object
          if(field === 'address' && value && typeof value === 'object') return formatAddress(value)
          return value
        }))

        const filename = safeFilename(group.name) + '_emailphonelist.csv'
        downloadCSV(filename, toCSV(fields, rows))
        this.showResult(`Exported ${rows.length.toLocaleString()} ${rows.length === 1 ? 'row' : 'rows'} to ${filename}.`, false)
      },
      error => this.showResult('The export failed. Please try again.', true, error)
    );
  }

  downloadMailerList(group: Group){
    this.exporting = true;

    this.groupService.downloadMailer(group).subscribe(
      (households: any[]) => {
        const rows: any[][] = []

        for(const household of households || []){
          const address = household?._id
          const residents = household?.residents || []
          // Skip anything without a mailing address or people
          if(!address || typeof address !== 'object' || !residents.length) continue

          const street = formatAddress(address)
          const city = address.city || ''
          const state = address.state?.abbrv || ''
          const zip = address.zip || ''

          if(residents.length > 1){
            // One family line per household; same values as before so mail-merge templates keep working
            rows.push([residents[0]?.name?.lastName || '', 'FAMILY', street, city, state, zip])
          } else {
            const resident = residents[0]
            rows.push([resident?.name?.firstName || '', resident?.name?.lastName || '', street, city, state, zip])
          }
        }

        if(rows.length === 0){
          this.showResult('No households with a mailing address were found in this group.', true)
          return
        }

        const filename = safeFilename(group.name) + '_mailer.csv'
        downloadCSV(filename, toCSV(MAILER_COLUMNS, rows))
        this.showResult(`Exported ${rows.length.toLocaleString()} ${rows.length === 1 ? 'row' : 'rows'} to ${filename}.`, false)
      },
      error => this.showResult('The export failed. Please try again.', true, error)
    )
  }
}

//////////////////////// CSV HELPERS ////////////////////////

// Quote values that contain commas, quotes or newlines, doubling any quotes
function csvEscape(value: any): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

function toCSV(headers: string[], rows: any[][]): string {
  return [headers.map(csvEscape).join(','), ...rows.map(row => row.map(csvEscape).join(','))].join('\n')
}

function downloadCSV(filename: string, csv: string){
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'})
  const url = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = url
  downloadLink.setAttribute('download', filename)
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  // Give the browser a moment to start the download before freeing the file
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

function safeFilename(name: string): string {
  return (name || 'group').replace(/[\\/:*?"<>|]+/g, '_').trim()
}
