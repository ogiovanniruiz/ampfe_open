import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { AmplifyService } from 'src/app/services/amplify.service';

@Component({
    templateUrl: './liveElectionResults.html',
    styleUrls: ['../../home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class LiveElectionResultsDialog implements OnInit{

    statewideElectionResults: any;

    sbElectionResults: any;

    rivElectionResults: any;

    loadingSOSResults: boolean = true;
    loadingSBResults: boolean = true;
    loadingRivResults: boolean = true;

    errorMessage: string = '';
    showError: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public summaryType: string,
        public dialogRef: MatDialogRef<LiveElectionResultsDialog>, 
        private ampService: AmplifyService
    
    ) {}

    ngOnInit(){
        this.getLiveRiversideResults();
        this.getLiveSBResults();
        this.getLiveSOSResults();
    }

    refreshAllTables(): void {
        this.rivElectionResults = null;
        this.sbElectionResults = null;
        this.statewideElectionResults = null;
        this.showError = false;
        this.getLiveRiversideResults();
        this.getLiveSBResults();
        this.getLiveSOSResults();
    }

    getLiveRiversideResults(){
        this.rivElectionResults = null;
        this.loadingRivResults = true;
        this.ampService.getLiveRiversideResults().subscribe((response: any) => {
            console.log('Live Riverside Results:', response);
            this.loadingRivResults = false;
            this.rivElectionResults = response

        }, error => {
            this.errorMessage = 'Failed to fetch live Riverside election results. Please try again later.';
            this.showError = true;
            this.loadingRivResults = false;
        }); 
    }

    getLiveSBResults(){
        this.sbElectionResults = null;
        this.loadingSBResults = true;
        this.ampService.getLiveSBResults().subscribe((response: any) => {
            console.log('Live SB Results:', response);
            this.loadingSBResults = false;
            this.sbElectionResults = response

        }, error => {
            this.loadingSBResults = false;
            this.errorMessage = 'Failed to fetch live San Bernardino election results. Please try again later.';
            this.showError = true;
        }); 
    }

    getLiveSOSResults(){
        this.statewideElectionResults = null;
        this.loadingSOSResults = true;
        this.ampService.getLiveSOSResults().subscribe((response: any) => {
            console.log('Live SOS Results:', response);
            this.loadingSOSResults = false;
            this.statewideElectionResults = response

        }, error => {
            this.loadingSOSResults = false;
            this.errorMessage = 'Failed to fetch live statewide election results. Please try again later.';
            this.showError = true;
        }); 
    }

    closeDialog(): void{this.dialogRef.close()}


    getCandidatePosition(candidates: any[], candidateIndex: number): string {
      if (!candidates || !candidates[candidateIndex]) {
        return '-';
      }

      const sorted = [...candidates].sort((a, b) => {
        const votesA = Number(String(a.votes ?? '0').replace(/,/g, ''));
        const votesB = Number(String(b.votes ?? '0').replace(/,/g, ''));

        return votesB - votesA;
      });

      const candidate = candidates[candidateIndex];

      const rank = sorted.findIndex(
        c => c.candidate === candidate.candidate
      ) + 1;

      return rank > 0 ? this.getOrdinal(rank) : '-';
    }

    getRiversideCandidatePosition(candidates: any[], candidate: any): string {
  if (!candidates || !candidate) {
    return '-';
  }

  const sorted = [...candidates].sort((a, b) => {
    const votesA = Number(String(a.votes ?? '0').replace(/,/g, ''));
    const votesB = Number(String(b.votes ?? '0').replace(/,/g, ''));
    return votesB - votesA;
  });

  const rank = sorted.findIndex(
    c => c.candidate === candidate.candidate
  ) + 1;

  return rank > 0 ? this.getOrdinal(rank) : '-';
}

getCandidateByName(candidates: any[], name: string) {
  return candidates?.find(c => c.candidate === name);
}

    getOrdinal(position: number): string {
      const j = position % 10;
      const k = position % 100;

      if (j === 1 && k !== 11) return position + 'st';
      if (j === 2 && k !== 12) return position + 'nd';
      if (j === 3 && k !== 13) return position + 'rd';

      return position + 'th';
    }

    statewidePreferredCandidates: { [race: string]: number[] } = {
      'Governor': [18],
      'Lieutenant Governor': [7],
      'Insurance Commissioner': [2, 0],
      'US Representative District 40': [4],
      'US Representative District 48': [0, 8],
      'State Assembly District 36': [2],
      'State Assembly District 47': [0, 1]
    };

    sbPreferredCandidates: { [race: string]: number[] } = {
      'City of San Bernardino Member, City Council Ward 1 (Vote for  1)': [3],
      'City of San Bernardino Member, City Council Ward 2 (Vote for  1)': [1],
      'City of San Bernardino Member, City Council Ward 4 (Vote for  1)': [4],
      'City of San Bernardino Mayor (Vote for  1)': [0],
      'San Bernardino County Member, Board of Supervisors District 4 (Vote for  1)': [1],
      'City of Loma Linda Member, City Council District 3 (Vote for  1)': [2]
      
    };

rivPreferredCandidates: { [race: string]: string[] } = {
  'Riverside City Council Ward 2': ['ARAM AYRA'],
  'Riverside City Council Ward 4': ['JESSICA QATTAWI'],
  'Riverside City Council Ward 6': ['LUIS HERNANDEZ'],
  'Mbr, Riverside County Bd of Education, TA 1': ['MALIHA WILLIAMSON', 'OLIVER UNAKA'],
  'Mbr, Riverside County Bd of Education, TA 2': ['JANET LONG'],
  'Mbr Gov Bd Murrieta Valley USD TA 3': ['ELLIOT EMMER']
};


}