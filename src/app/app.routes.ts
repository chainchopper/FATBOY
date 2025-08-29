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
import { ShoppingListComponent } from './shopping-list/shopping-list.component';
import { AchievementsComponent } from './achievements/achievements.component';
import { LoginComponent } from './login/login.component';
import { FoodDiaryComponent } from './food-diary/food-diary.component';

export const routes: Routes = [
  { path: '', redirectTo: '/ocr-scanner', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'scanner', component: ScannerComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'saved', component: SavedComponent },
  { path: 'preferences', component: PreferencesComponent },
  { path: 'ocr-scanner', component: OcrScannerComponent },
  { path: 'ocr-results', component: OcrResultsComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'suggestions', component: SuggestionsComponent },
  { path: 'community', component: CommunityComponent },
  { path: 'shopping-list', component: ShoppingListComponent },
  { path: 'achievements', component: AchievementsComponent },
  { path: 'food-diary', component: FoodDiaryComponent }
];