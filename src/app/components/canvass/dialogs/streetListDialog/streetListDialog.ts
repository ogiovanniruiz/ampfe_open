import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import { MatDialogRef, MAT_DIALOG_DATA,MatDialog} from '@angular/material/dialog';
import { CanvassService } from 'src/app/services/canvass.service';

//DIALOGS
import {ComplexDialog} from '../complexDialog/complexDialog'
import { HouseholdDialog, householdDialogConfig } from '../householdDialog/householdDialog';
import { EditHouseholdDialog, editHouseholdDialogConfig } from '../editHouseholdDialog/editHouseholdDialog';

//MODELS
import { Survey } from 'src/app/models/survey.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { Activity, } from 'src/app/models/activity.model';
import { ActivityHouseholdRecord, CanvassDialogData } from '../../../../models/contact.record.model';
import { formatAddress, syncBuildingStatus } from '../../canvassUtils';

type DoorStatus = 'todo' | 'partial' | 'passed' | 'complete';

interface DoorView {
    building: any;
    number: string;
    title: string;
    subtitle: string;
    detail: string;
    status: DoorStatus;
    statusLabel: string;
    finished: boolean;
}

interface DoorGroup {
    label: string;
    doors: DoorView[];
}

interface StreetView {
    key: string;
    name: string;
    groups: DoorGroup[];
    visibleCount: number;
    done: number;
    total: number;
    finished: boolean;
}

@Component({
    templateUrl: './streetListDialog.html',
    styleUrls: ['../../canvass.component.scss', './streetListDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class StreetListDialog implements OnInit{
    survey: Survey;
    nonResponseSet: NonResponseSet;
    activity: Activity;

    streets: any[] = []
    streetViews: StreetView[] = []

    loadingStreets: boolean = true;
    loadError: boolean = false;
    activityInactive: boolean = false;
    showNearestPollingLocations: boolean = false;
    showPartisan: boolean = false;
    // Set when a door was worked from this list, so the map knows to reload
    changed: boolean = false;

    searchText: string = '';
    showMode: 'todo' | 'all' = 'todo';
    sortMode: 'order' | 'sides' = 'order';

    doneDoors: number = 0;
    totalDoors: number = 0;

    // Streets the canvasser opened, kept open across refreshes
    expandedStreets = new Set<string>();
    
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: CanvassDialogData,
        public dialogRef: MatDialogRef<StreetListDialog>,
        public dialog: MatDialog,
        public canvassService: CanvassService,
    ){
        this.survey = data.survey
        this.nonResponseSet = data.nonResponseSet
        this.activity = data.activity
        this.showNearestPollingLocations = data.showNearestPollingLocations
        this.showPartisan = data.showPartisan
    }

    ngOnInit(){
        this.getHouseholdList()
    }

    return(){this.dialogRef.close(this.changed)}

    getHouseholdList(){
        this.loadingStreets = true
        this.loadError = false
        this.canvassService.getCanvassStreetList(this.activity._id).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
            (streets: any[]) => {
                this.loadingStreets = false
                if(streets?.['inactive']){
                    this.activityInactive = true
                    this.streets = []
                    this.refreshView()
                    return
                }
                this.streets = streets || []
                this.refreshView()
            },
            error => {
                console.log(error)
                this.loadingStreets = false
                this.loadError = true
                this.streets = []
                this.refreshView()
            })
    }

    //////////////////////// VIEW ////////////////////////

    // Rebuilds everything the template shows: counts, filtering, sorting and grouping
    refreshView(){
        const search = this.searchText.trim().toLowerCase()
        let doneDoors = 0
        let totalDoors = 0

        const views: StreetView[] = []

        for (const street of this.streets){
            const name = [street._id?.street, street._id?.suffix].filter(Boolean).join(' ') || 'Unknown street'
            const key = name + '|' + (street.buildings[0]?._id ? JSON.stringify(street.buildings[0]._id) : '')

            let done = 0
            let total = 0
            for (const building of street.buildings){
                syncBuildingStatus(building)
                total += building.records.length
                done += building.records.filter(record => record.complete || record.passed).length
            }
            doneDoors += done
            totalDoors += total

            const streetMatches = !!search && name.toLowerCase().includes(search)

            const doors = street.buildings
                .map(building => this.toDoorView(building))
                .filter(door => this.showMode === 'all' || !door.finished)
                .filter(door => !search || streetMatches || this.doorMatches(door, search))
                .sort((a, b) => this.compareDoors(a, b))

            // While searching, streets without matches disappear entirely
            if (search && doors.length === 0) continue

            views.push({
                key,
                name,
                groups: this.groupDoors(doors),
                visibleCount: doors.length,
                done,
                total,
                finished: total > 0 && done >= total,
            })
        }

        // Streets with doors left come first; finished streets sink to the bottom
        views.sort((a, b) => (Number(a.finished) - Number(b.finished)) || a.name.localeCompare(b.name, undefined, {numeric: true}))

        this.streetViews = views
        this.doneDoors = doneDoors
        this.totalDoors = totalDoors
    }

    toDoorView(building: any): DoorView {
        const records = building.records
        const first = records[0].household
        const units = records.length
        const doneUnits = records.filter(record => record.complete || record.passed).length
        const completeUnits = records.filter(record => record.complete).length

        let status: DoorStatus = 'todo'
        let statusLabel = 'To do'
        if (doneUnits >= units) {
            status = completeUnits >= units ? 'complete' : 'passed'
            statusLabel = status === 'complete' ? 'Complete' : 'Passed'
        } else if (doneUnits > 0) {
            status = 'partial'
            statusLabel = `${doneUnits}/${units} done`
        }

        const residents = records.reduce((sum, record) => sum + (record.household?.residents?.length || 0), 0)
        const detail = units > 1
            ? `${units} units`
            : `${residents} resident${residents === 1 ? '' : 's'}`

        return {
            building,
            number: first._id?.streetNum ? String(first._id.streetNum) : '',
            title: first._id?.streetNum ? formatAddress(first._id, units === 1) : (first.fullAddress1 || 'No address'),
            subtitle: first.fullAddress2 || '',
            detail,
            status,
            statusLabel,
            finished: doneUnits >= units,
        }
    }

    doorMatches(door: DoorView, search: string): boolean {
        const units = door.building.records.map(record => record.household?._id?.unit || '').join(' ')
        return [door.number, door.title, door.subtitle, units].join(' ').toLowerCase().includes(search)
    }

    compareDoors(a: DoorView, b: DoorView): number {
        return (a.number || a.title).localeCompare(b.number || b.title, undefined, {numeric: true})
    }

    groupDoors(doors: DoorView[]): DoorGroup[] {
        if (this.sortMode === 'order') return [{label: '', doors}]

        const odd: DoorView[] = []
        const even: DoorView[] = []
        const other: DoorView[] = []

        for (const door of doors){
            const num = parseInt(door.number, 10)
            if (isNaN(num)) other.push(door)
            else if (num % 2 === 0) even.push(door)
            else odd.push(door)
        }

        return [
            {label: 'Odd side', doors: odd},
            {label: 'Even side', doors: even},
            {label: 'Other', doors: other},
        ].filter(group => group.doors.length > 0)
    }

    isExpanded(street: StreetView): boolean {
        if (this.searchText.trim()) return true
        return this.expandedStreets.has(street.key)
    }

    setExpanded(street: StreetView, expanded: boolean){
        if (expanded) this.expandedStreets.add(street.key)
        else this.expandedStreets.delete(street.key)
    }

    clearSearch(){
        this.searchText = ''
        this.refreshView()
    }

    trackStreet(index: number, street: StreetView){ return street.key }
    trackDoor(index: number, door: DoorView){ return door.building._id ? JSON.stringify(door.building._id) : index }

    //////////////////////// DOORS ////////////////////////

    openHousehold(building: any){
        if(building.records.length === 1){
            const canvassHouseholdRecord: ActivityHouseholdRecord = building.records[0]
            const finished = canvassHouseholdRecord.complete || canvassHouseholdRecord.passed
            const dialogData: CanvassDialogData = {canvassHouseholdRecord: canvassHouseholdRecord, activity: this.activity, survey: this.survey, nonResponseSet: this.nonResponseSet, showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan}

            // Finished doors open the same review/reset dialog the map uses
            const dialogComponent: any = finished ? EditHouseholdDialog : HouseholdDialog
            const dialogRef = this.dialog.open(dialogComponent, finished ? editHouseholdDialogConfig(dialogData) : householdDialogConfig(dialogData));

            dialogRef.afterClosed().subscribe((updatedRecord: ActivityHouseholdRecord) => {
                if(!updatedRecord){return}

                building.records[0] = updatedRecord
                this.changed = true
                this.refreshView()
            })
            return
        }

        const dialogData: CanvassDialogData = {building: building, activity: this.activity, survey: this.survey, nonResponseSet: this.nonResponseSet, showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan}

        const dialogRef = this.dialog.open(ComplexDialog, {autoFocus: false, data: dialogData, width: "100%", maxWidth:"100%", disableClose: true});

        // ComplexDialog updates the building's records in place and hands it back
        dialogRef.afterClosed().subscribe((result: any) => {
            if(!result?.building) return
            this.changed = true
            this.refreshView()
        })
    }

    //////////////////////// WALK LIST ////////////////////////

    // Same ordering as the screen (numeric, optionally by side), but every door is included
    printStreetList(){
        let binaryData = [];
        const value = (part) => (part === undefined || part === null) ? '' : String(part).trim()

        const streets = [...this.streets].sort((a, b) =>
            [a._id?.street, a._id?.suffix].join(' ').localeCompare([b._id?.street, b._id?.suffix].join(' '), undefined, {numeric: true}))

        for (const street of streets){
            binaryData.push([value(street._id?.street), value(street._id?.suffix)].filter(Boolean).join(' ') + '\n\n')

            const doors = street.buildings.map(building => this.toDoorView(building)).sort((a, b) => this.compareDoors(a, b))

            for (const group of this.groupDoors(doors)){
                if (group.label) binaryData.push('  ' + group.label + '\n')

                for (const door of group.doors){
                    for (const record of door.building.records){
                        binaryData.push('    ' + formatAddress(record.household._id) + '\n')

                        for (const resident of record.household.residents){
                            const line = [value(resident['name']?.['firstName']), value(resident['name']?.['lastName']), value(resident['party'])]
                            binaryData.push('        ' + line.filter(Boolean).join(' ') + '\n')
                        }
                        binaryData.push('\n')
                    }
                }
            }

            binaryData.push('\n')
        }

        let downloadLink = document.createElement('a');

        let blob = new Blob(binaryData, {type: 'text/plain'});
        const url = window.URL.createObjectURL(blob);
        downloadLink.href = url;

        var filename: string = this.activity.name + '_walk_list.txt'
        downloadLink.setAttribute('download', filename );
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        // Give the browser a moment to start the download before freeing the file
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
}
