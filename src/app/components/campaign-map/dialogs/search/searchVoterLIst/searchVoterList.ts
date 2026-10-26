import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { PersonService } from 'src/app/services/person.service';
import { formatAddress } from 'src/app/components/canvass/canvassUtils';
import { formatPhone, normalizePhone } from 'src/app/utils/phone';

// The server returns one extra match so we know there are more than we show
const RESULT_LIMIT = 50;

const PARTIES = ['DEM', 'REP', 'NPP', 'MPL', 'MPC', 'OTH']

const ETHNICITY_LABELS = {
  white: 'White', hispanic: 'Hispanic', black: 'Black', api: 'Asian / Pacific Islander',
  native: 'Native American', other: 'Other', multiple: 'Multiple'
}

// districts keys in the order they're listed
// (countyID is shown as the county, with the voter's own county name first)
const DISTRICT_LABELS = [
  ['bosID', 'Board of Supervisors'], ['citywideID', 'City'], ['citywardID', 'City ward'],
  ['assemblyID', 'Assembly'], ['senateID', 'Senate'], ['congressionalID', 'Congressional'],
  ['new_congressionalID', 'New congressional'], ['schooldistrictID', 'School district'],
  ['schooldistrictareaID', 'School district area'], ['schoolID', 'School'], ['boeID', 'Board of Education'],
  ['recreationalID', 'Recreation'], ['waterID', 'Water']
]

interface Fact { label: string; value: string }

@Component({
    templateUrl: './searchVoterList.html',
    styleUrls: ['../search-dialogs.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class SearchVoterListDialog {

  firstName: string = ''
  lastName: string = ''
  streetNum: string = ''
  streetName: string = ''
  city: string = ''
  zip: string = ''
  voterID: string = ''
  phone: string = ''
  email: string = ''
  party: string = ''
  ageMin: number = null
  ageMax: number = null

  parties = PARTIES
  showMoreOptions: boolean = false

  results: any[] = null
  hasMore: boolean = false

  searching: boolean = false
  errorMessage: string = ''

  constructor(
    public dialogRef: MatDialogRef<SearchVoterListDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public personService: PersonService
  ){}

  cancel(): void {
    this.dialogRef.close();
  }

  // Filled "more options" stay visible so they're never applied out of sight
  get moreOptionsUsed(): boolean {
    return !!(this.voterID.trim() || this.phone.trim() || this.email.trim() || this.party || this.ageMin != null || this.ageMax != null)
  }

  search(){
    const person: any = {
      firstName: this.firstName.trim(), lastName: this.lastName.trim(),
      streetNum: this.streetNum.trim(), streetName: this.streetName.trim(),
      city: this.city.trim(), zip: this.zip.trim(),
      voterID: this.voterID.trim(), phone: normalizePhone(this.phone), email: this.email.trim(),
      party: this.party, ageMin: this.ageMin, ageMax: this.ageMax
    }
    Object.keys(person).forEach(key => { if(person[key] === '' || person[key] == null) delete person[key] })

    // Same rule as the server: party, age, first name, city or ZIP alone match too many voters
    const anchored = person.lastName || (person.streetName && (person.city || person.zip)) || person.voterID || person.phone || person.email
    if(!anchored){
      this.errorMessage = 'Enter a last name, a street with a city or ZIP, a voter ID, a phone or an email.'
      return
    }
    if(this.searching) return

    person.campaignID = parseInt(sessionStorage.getItem('campaignID'))

    this.searching = true
    this.errorMessage = ''
    this.detailsCache.clear()

    this.personService.getPerson(person).subscribe(
      (results: any[]) => {
        this.searching = false
        const rows = results || []
        this.hasMore = rows.length > RESULT_LIMIT
        this.results = rows.slice(0, RESULT_LIMIT)
      },
      error => {
        console.log(error)
        this.searching = false
        this.errorMessage = 'The voter search failed. Please try again.'
      }
    )
  }

  fullName(voter: any): string {
    const name = voter?.resident?.name || {}
    return [name.firstName, name.middleName, name.lastName].filter(Boolean).join(' ')
  }

  addressLine(voter: any): string {
    const street = voter?.address ? formatAddress(voter.address) : (voter?.fullAddress1 || '')
    const city = [voter?.address?.city, voter?.address?.zip].filter(Boolean).join(' ')
    return [street, city].filter(Boolean).join(', ')
  }

  hasLocation(voter: any): boolean {
    return Array.isArray(voter?.location?.coordinates) && voter.location.coordinates.length === 2
  }

  showOnMap(event: Event, voter: any){
    // The button sits in the panel header; don't toggle the panel on the way out
    event.stopPropagation()
    this.dialogRef.close({type: 'voter', voter, name: this.fullName(voter), address: this.addressLine(voter)})
  }

  // Voter details, built once per voter when its panel first opens
  private detailsCache = new Map<any, any>()

  details(voter: any){
    if(!this.detailsCache.has(voter)) this.detailsCache.set(voter, this.buildDetails(voter))
    return this.detailsCache.get(voter)
  }

  private buildDetails(voter: any){
    const r = voter?.resident || {}
    const facts = (list: Fact[]) => list.filter(f => f.value)

    const phones = (r.phones || []).map(p => p?.number).filter(Boolean).map(n => formatPhone(n))
    const regDates = (r.regDates || []).map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => b.getTime() - a.getTime())

    const contact = facts([
      {label: phones.length > 1 ? 'Phones' : 'Phone', value: phones.join(', ')},
      {label: (r.emails || []).length > 1 ? 'Emails' : 'Email', value: (r.emails || []).filter(Boolean).join(', ')}
    ])

    const demographics = facts([
      {label: 'Gender', value: r.gender && r.gender !== 'unknown' ? this.capitalize(r.gender) : ''},
      {label: 'Date of birth', value: this.formatDate(r.dob)},
      {label: 'Age', value: r.age != null ? String(r.age) : ''},
      {label: 'Ethnicity', value: ETHNICITY_LABELS[r.ethnicity] || ''},
      {label: 'Likely Spanish speaker', value: this.yesNo(r.spanish_probable)}
    ])

    const voting = facts([
      {label: 'Party', value: r.party || ''},
      {label: 'Voting propensity', value: this.getPropensityLabel(r)},
      {label: 'General / primary / special', value: [r.generalPropensity, r.primaryPropensity, r.specialPropensity].some(p => p != null)
        ? [r.generalPropensity, r.primaryPropensity, r.specialPropensity].map(p => p ?? '–').join(' / ') : ''},
      {label: 'Registered', value: regDates.length ? this.formatDate(regDates[0]) : ''},
      {label: 'Permanent absentee', value: this.yesNo(r.pav)},
      {label: 'Voted this cycle', value: this.yesNo(r.voted_current_cycle)}
    ])

    // Newest election first
    const voteHistory = [...(r.voteHistory || [])]
      .filter(v => v?.year)
      .sort((a, b) => String(b.year).localeCompare(String(a.year)))

    const districts = facts([
      {label: 'Precinct', value: voter?.registrationPrecinctID || ''},
      {label: 'County', value: voter?.county || voter?.districts?.countyID || ''},
      ...DISTRICT_LABELS.map(([key, label]) => ({label, value: voter?.districts?.[key] || ''}))
    ])

    return {contact, demographics, voting, voteHistory, districts}
  }

  // Same weighting as the phonebank and canvass
  private getPropensityLabel(resident: any): string {
    if(resident.generalPropensity == null || resident.primaryPropensity == null || resident.specialPropensity == null) return ''
    const overall = (resident.generalPropensity*3 + resident.primaryPropensity*2 + resident.specialPropensity*1)/6
    if(overall >= 66) return 'High'
    if(overall >= 33) return 'Medium'
    return 'Low'
  }

  private formatDate(value: any): string {
    if(!value) return ''
    const date = new Date(value)
    // Stored as midnight UTC; show that calendar day wherever the viewer is
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'})
  }

  private yesNo(value: any): string {
    return value === true ? 'Yes' : value === false ? 'No' : ''
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  trackVoter(index: number, voter: any){ return voter?._id || index }
}
