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
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/ocr-scanner', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'scanner', component: ScannerComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'ocr-scanner', component: OcrScannerComponent },
  { path: 'ocr-results', component: OcrResultsComponent },
  // Protected routes
  { path: 'saved', component: SavedComponent, canActivate: [AuthGuard] },
  { path: 'preferences', component: PreferencesComponent, canActivate: [AuthGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [AuthGuard] },
  { path: 'suggestions', component: SuggestionsComponent, canActivate: [AuthGuard] },
  { path: 'community', component: CommunityComponent, canActivate: [AuthGuard] },
  { path: 'shopping-list', component: ShoppingListComponent, canActivate: [AuthGuard] },
  { path: 'achievements', component: AchievementsComponent, canActivate: [AuthGuard] },
  { path: 'food-diary', component: FoodDiaryComponent, canActivate: [AuthGuard] }
];