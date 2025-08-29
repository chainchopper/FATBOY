import { Routes } from '@angular/router';
import { ScannerComponent } from './scanner/scanner.component';
import { ResultsComponent } from './results/results.component';
import { SavedComponent } from './saved/saved.component';
import { PreferencesComponent } from './preferences/preferences.component';
import { OcrScannerComponent } from './ocr-scanner/ocr-scanner.component';
import { OcrResultsComponent } from './ocr-results/ocr-results.component';
import { HistoryComponent } from './history/history.component';
import { SuggestionsComponent } from './suggestions/suggestions.component';
import { CommunityComponent } from './community/community.component';

export const routes: Routes = [
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'scanner', component: ScannerComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'saved', component: SavedComponent },
  { path: 'preferences', component: PreferencesComponent },
  { path: 'ocr-scanner', component: OcrScannerComponent },
  { path: 'ocr-results', component: OcrResultsComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'suggestions', component: SuggestionsComponent },
  { path: 'community', component: CommunityComponent }
];