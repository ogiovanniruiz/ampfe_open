import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef} from '@angular/material/dialog';
import { SummaryService } from 'src/app/services/summary.service';

interface DistrictOption {
  id: string;
  name: string;
}

interface TurnoutRow {
  key: string;
  label: string;
  registered: number;
  voted: number;
  turnout: number | null;
  useInProjection: boolean;
}

interface PartyRow {
  label: string;
  count: number;
  pct: number;
}

// Elections shown in the turnout table; the defaults match the old projection (midterms only)
const ELECTIONS = [
  {key: '2024', label: '2024', presidential: true},
  {key: '2022', label: '2022', presidential: false},
  {key: '2020', label: '2020', presidential: true},
  {key: '2018', label: '2018', presidential: false},
  {key: '2016', label: '2016', presidential: true},
  {key: '2025', label: '2025 Special (Prop 50)', presidential: false},
]
const DEFAULT_PROJECTION_YEARS = ['2022', '2018']

const DISTRICT_TYPE_LABELS: {[type: string]: [string, string]} = {
  COUNTY: ['county', 'counties'],
  CITYWIDE: ['city', 'cities'],
  CITYWARD: ['city ward', 'city wards'],
  ASSEMBLY: ['assembly district', 'assembly districts'],
  SENATE: ['senate district', 'senate districts'],
  CONGRESSIONAL: ['congressional district', 'congressional districts'],
}

@Component({
    templateUrl: './districtDataSummaryDialog.html',
    styleUrls: ['./districtDataSummaryDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class DistrictDataSummaryDialog implements OnInit{

  loading = true
  error = false

  districtList: DistrictOption[] = []
  districtType: string = ''
  electionType: string = ''
  selected: string = null

  // Counts for the current selection, and per-district rows when "All" is selected
  counts: any = null
  districtRows: any[] = []
  computedAt: Date = null

  turnoutRows: TurnoutRow[] = []
  partyRows: PartyRow[] = []
  partyView: 'chart' | 'table' = 'chart'

  projectedTurnOutPercent: number | null = null
  projectedVotes: number | null = null
  winNumber: number | null = null

  // Which years count toward the projection; kept when switching districts
  private projectionYears = new Set<string>(DEFAULT_PROJECTION_YEARS)
  private request = 0

  constructor(
    public dialogRef: MatDialogRef<DistrictDataSummaryDialog>, 
    private summaryService: SummaryService,
  ) {}

  ngOnInit(){
    // No district given: the server answers with the first district and the full list
    this.load(undefined)
  }

  return(){
    this.dialogRef.close()
  }

  //////////////////////// LOADING ////////////////////////

  load(districtID: string, refresh: boolean = false){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    const request = ++this.request

    this.loading = true
    this.error = false

    this.summaryService.getDistrictDataSummary(campaignID, districtID, refresh).subscribe(
      (response: any) => {
        if(request !== this.request) return
        this.loading = false

        this.districtList = response?.districtList || []
        this.districtType = response?.districtType || ''
        this.electionType = response?.electionType || ''
        this.selected = response?.selected ?? null
        this.counts = response?.total || null
        this.districtRows = this.selected === 'ALL' ? (response?.districts || []) : []
        this.computedAt = response?.computedAt ? new Date(response.computedAt) : null

        this.buildRows()
      },
      error => {
        if(request !== this.request) return
        console.log(error)
        this.loading = false
        this.error = true
      }
    )
  }

  selectDistrict(districtID: string){
    if(districtID === this.selected && !this.error) return
    this.load(districtID)
  }

  refresh(){
    this.load(this.selected || undefined, true)
  }

  retry(){
    this.load(this.selected || undefined)
  }

  //////////////////////// DERIVED ////////////////////////

  get hasDistricts(): boolean {
    return this.districtList.length > 0
  }

  get selectedName(): string {
    if(this.selected === 'ALL') return 'All ' + this.districtTypePlural
    return this.districtList.find(d => d.id === this.selected)?.name || ''
  }

  get loadingName(): string {
    return this.selectedName || 'the first ' + this.districtTypeSingular
  }

  get districtTypeSingular(): string {
    return DISTRICT_TYPE_LABELS[this.districtType]?.[0] || 'district'
  }

  get districtTypePlural(): string {
    return DISTRICT_TYPE_LABELS[this.districtType]?.[1] || 'districts'
  }

  get subtitle(): string {
    const n = this.districtList.length
    if(!n) return ''
    return `${n} ${n === 1 ? this.districtTypeSingular : this.districtTypePlural}` + (this.electionType ? ` · ${this.electionType} election` : '')
  }

  get updatedLabel(): string {
    if(!this.computedAt) return ''
    const minutes = Math.round((Date.now() - this.computedAt.getTime()) / 60000)
    if(minutes < 1) return 'Updated just now'
    if(minutes < 60) return `Updated ${minutes} min ago`
    const hours = Math.round(minutes / 60)
    return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  private buildRows(){
    const c = this.counts
    if(!c){
      this.turnoutRows = []
      this.partyRows = []
      this.calculateProjectedVotes()
      return
    }

    this.turnoutRows = ELECTIONS.map(election => {
      const registered = c['numReg' + election.key] || 0
      const voted = c['numVoted' + election.key] || 0
      return {
        key: election.key,
        label: election.label,
        registered,
        voted,
        turnout: registered > 0 ? voted / registered : null,
        useInProjection: this.projectionYears.has(election.key),
      }
    })

    const total = c.totalVoters || 0
    const parties = [
      {label: 'Democratic', count: c.numDems},
      {label: 'Republican', count: c.numReps},
      {label: 'No party preference', count: c.numNPP},
      {label: 'MPL', count: c.numMPL},
      {label: 'MPC', count: c.numMPC},
    ]
    const named = parties.reduce((sum, p) => sum + (p.count || 0), 0)
    parties.push({label: 'Other / unknown', count: Math.max(0, total - named)})

    this.partyRows = parties
      .filter(p => p.count > 0)
      .map(p => ({label: p.label, count: p.count, pct: total ? Math.round(p.count / total * 1000) / 10 : 0}))

    this.calculateProjectedVotes()
  }

  toggleProjectionYear(row: TurnoutRow, checked: boolean){
    row.useInProjection = checked
    if(checked) this.projectionYears.add(row.key)
    else this.projectionYears.delete(row.key)
    this.calculateProjectedVotes()
  }

  // Average turnout of the chosen elections (skipping any with no registered voters), applied to today's registration
  calculateProjectedVotes(){
    const rates = this.turnoutRows.filter(row => row.useInProjection && row.turnout !== null).map(row => row.turnout)
    const total = this.counts?.totalVoters || 0

    if(!rates.length || !total){
      this.projectedTurnOutPercent = null
      this.projectedVotes = null
      this.winNumber = null
      return
    }

    const projectedTurnOut = rates.reduce((a, b) => a + b, 0) / rates.length
    this.projectedTurnOutPercent = Math.round(projectedTurnOut * 1000) / 10
    this.projectedVotes = Math.round(total * projectedTurnOut)
    this.winNumber = Math.round(this.projectedVotes / 2) + 1
  }

  // The same projection for one district row in the "All" comparison table
  districtProjectedVotes(row: any): number | null {
    const rates = ELECTIONS
      .filter(e => this.projectionYears.has(e.key) && row['numReg' + e.key] > 0)
      .map(e => row['numVoted' + e.key] / row['numReg' + e.key])
    if(!rates.length || !row.totalVoters) return null
    return Math.round(row.totalVoters * rates.reduce((a, b) => a + b, 0) / rates.length)
  }

  pct(part: number, whole: number): number {
    return whole ? Math.round(part / whole * 1000) / 10 : 0
  }

  trackByKey(index: number, item: any){ return item.key || item.id || item.label }
}
