import { NgModule } from '@angular/core';

import 'hammerjs';
import { MatDialogModule,} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatExpansionModule,} from '@angular/material/expansion';
import {MatRadioModule,} from '@angular/material/radio';
import {MatSidenavModule,} from '@angular/material/sidenav';

import {MatPaginatorModule} from '@angular/material/paginator';
import {MatButtonModule,} from '@angular/material/button';
import {MatCardModule,} from '@angular/material/card';
import {MatToolbarModule,} from '@angular/material/toolbar';

import {MatInputModule, } from '@angular/material/input';
import {MatSelectModule, } from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatListModule} from '@angular/material/list';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatMenuModule} from '@angular/material/menu';

import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';

import {MatCheckboxModule} from '@angular/material/checkbox';

import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule} from '@angular/material/tooltip';
import {MatBadgeModule} from '@angular/material/badge';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'

@NgModule({
  declarations: [],
  imports: [

    MatIconModule,
    MatButtonModule,
    MatInputModule, 
    MatSelectModule,
    MatCardModule,
    MatToolbarModule,
   MatSidenavModule,
    MatGridListModule,
    MatListModule,
    MatMenuModule,
    MatExpansionModule,
    //MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
   MatTabsModule,

    MatDialogModule,
    MatSlideToggleModule,

    //MatAutocompleteModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    FormsModule,
    MatBadgeModule

  ],
  exports:[

    MatIconModule,
    MatButtonModule,
    MatInputModule, 
    MatSelectModule,
    MatCardModule,
    MatToolbarModule,
    MatSidenavModule,
     MatGridListModule,
     MatListModule,
    MatMenuModule,
    MatExpansionModule,
  //  MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
   MatCheckboxModule,
   MatTabsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  //  MatAutocompleteModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
   MatBadgeModule,

    FlexLayoutModule,
    ReactiveFormsModule,
    FormsModule,
  ]
})
export class MaterialModule { }
