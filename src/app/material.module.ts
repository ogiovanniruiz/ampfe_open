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
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatFormFieldModule} from '@angular/material/form-field'
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatAutocompleteModule} from '@angular/material/autocomplete'
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
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule} from '@angular/material/tooltip';
import {MatBadgeModule} from '@angular/material/badge';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'
import {ClipboardModule} from '@angular/cdk/clipboard';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import {MatSliderModule} from '@angular/material/slider'
import { LegacyFormFieldDirective } from './directives/legacyFormField.directive';
import { LegacySelectDirective } from './directives/legacySelect.directive';


@NgModule({
  declarations: [],
  imports: [
    LegacyFormFieldDirective,
    LegacySelectDirective,
    MatSliderModule,
    MatAutocompleteModule,
    ClipboardModule,
    MatSnackBarModule,
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
    MatFormFieldModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTabsModule,
    MatBottomSheetModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    FormsModule,
    MatBadgeModule,
    MatStepperModule
  ],
  exports:[
    LegacyFormFieldDirective,
    LegacySelectDirective,
    MatSliderModule,
    MatSnackBarModule,
    ClipboardModule,
    MatAutocompleteModule,
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
    MatButtonToggleModule,
    MatBottomSheetModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatBadgeModule,
    ReactiveFormsModule,
    FormsModule,
    MatStepperModule
  ],
})
export class MaterialModule { }
