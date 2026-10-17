import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { CampaignMapComponent} from './campaignMap.component';
import { MaterialModule } from '../../material.module';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { LeafletDrawModule } from '@bluehalo/ngx-leaflet-draw';
import { CreatePolygonDialog } from './dialogs/polygon/createPolygon/createPolygonDialog';
import { SearchDialog } from './dialogs/search/searchAddress/searchDialog';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FitLabelsDirective } from '../../directives/fitLabels.directive';
import { NonResponseEditorComponent } from './dialogs/nonresponsesets/nonResponseEditor/nonResponseEditor';
import { SurveyQuestionsEditorComponent } from './dialogs/surveys/surveyQuestionsEditor/surveyQuestionsEditor';

import { EditPolygonDialog } from './dialogs/polygon/editPolygon/editPolygonDialog';
import { PermissionsDialog } from './dialogs/permissions/permissionsDialog';
import { CampaignBillingDialog } from './dialogs/billing/campaignBillingDialog';
import { CreateSurveyDialog } from './dialogs/surveys/createSurvey/createSurveyDialog';
import { EditSurveyDialog } from './dialogs/surveys/editSurvey/editSurveyDialog';
import { CreateNonresponseSetDialog } from './dialogs/nonresponsesets/createNonresponseSet/createNonresponseSet';
import { EditNonResponseDialog } from './dialogs/nonresponsesets/editNonresponseSet/editNonResponseDialog';
import { GroupCreatorDialog } from './dialogs/groups/createGroup/groupCreatorDialog';
import { GroupReviewDialog } from './dialogs/groups/otherGroups/otherGroupsDialog';
import { SearchVoterListDialog } from './dialogs/search/searchVoterLIst/searchVoterList';
import { RawContactDataDialog } from './dialogs/summary/rawContactData/rawContactDataDialog'
import { OtherSurveysDialog } from './dialogs/surveys/otherSurveys/otherSurveysDialog';
import { GroupEditorDialog } from './dialogs/groups/editGroup/groupEditorDialog';
import { DistrictDataSummaryDialog } from './dialogs/summary/districtDataSummary/districtDataSummaryDialog';
import { CampaignSummaryDialog } from './dialogs/summary/campaignSummary/campaignSummaryDialog';
import { SummaryTableComponent } from './dialogs/summary/summaryTable/summaryTable';
import { PrecinctPlanningSummaryDialog } from './dialogs/summary/precinctPlanningSummary/precinctPlanningSummary';
import { OtherNonresponseSetsDialog } from './dialogs/nonresponsesets/otherNonresponseSets/otherNonresponseSets';
import { MorePolygonsDialog } from './dialogs/polygon/morePolygons/morePolygonsDialog';
import { SearchPrecinctsDialog } from './dialogs/search/searchPrecincts/searchPrecincts';
import { DemographicSummaryDialog } from './dialogs/summary/demographicSummary/demographicSummary';
import {RawGroupDataDialog} from './dialogs/summary/rawGroupData/rawGroupDataDialog'


const routes: Routes = [
  { path: '', component: CampaignMapComponent}
];

@NgModule({
    declarations: [CampaignMapComponent,
      CreatePolygonDialog, 
      CreateSurveyDialog, 
      EditPolygonDialog, 
      SearchDialog,  
      PermissionsDialog, 
      CampaignBillingDialog,
      EditSurveyDialog, 
      OtherSurveysDialog,
      OtherNonresponseSetsDialog,
      CreateNonresponseSetDialog, 
      EditNonResponseDialog,
      GroupCreatorDialog,
      GroupReviewDialog,
      GroupEditorDialog,
      SearchVoterListDialog,
      RawContactDataDialog,
      DistrictDataSummaryDialog,
      CampaignSummaryDialog,
      SummaryTableComponent,
      PrecinctPlanningSummaryDialog,
      MorePolygonsDialog,
      SearchPrecinctsDialog,
      DemographicSummaryDialog,
      RawGroupDataDialog,
      NonResponseEditorComponent,
      SurveyQuestionsEditorComponent
    ],
      
    imports: [
        CommonModule,
        MaterialModule,
        LeafletModule,
        LeafletDrawModule,
        DragDropModule,
        FitLabelsDirective,
        RouterModule.forChild(routes),
    ]
})
export class CampaignMapModule { }
