import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScannerComponent } from './scanner/scanner.component';
import { ResultsComponent } from './results/results.component';
import { SavedComponent } from './saved/saved.component';
import { PreferencesComponent } from './preferences/preferences.component';

const routes: Routes = [
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'scanner', component: ScannerComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'saved', component: SavedComponent },
  { path: 'preferences', component: PreferencesComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }