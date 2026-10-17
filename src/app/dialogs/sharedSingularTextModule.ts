import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { SingularTextForm } from '../components/singularTextForm/singularTextForm';

@NgModule({
  declarations: [SingularTextForm],
  imports: [
    CommonModule,
    MaterialModule,
  ],
  exports: [SingularTextForm]
})
export class SharedSingularTextFormModule { }