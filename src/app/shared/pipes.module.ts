import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';

@NgModule({
  imports: [CommonModule],
  exports: [CommonModule, TitleCasePipe]
})
export class PipesModule { }