import { Routes } from '@angular/router';
import { ResultsComponent } from './results/results.component';
import { SavedComponent } from './saved/saved.component';
import { PreferencesComponent } from './preferences/preferences.component';
import { OcrResultsComponent } from './ocr-results/ocr-results.component';
import { HistoryComponent } from './history/history.component';
import { SuggestionsComponent } from './suggestions/suggestions.component';
import { CommunityComponent } from './community/community.component';
import { ShoppingListComponent } from './shopping-list/shopping-list.component';
import { AchievementsComponent } from './achievements/achievements.component';
import { LoginComponent } from './login/login.component';
import { FoodDiaryComponent } from './food-diary/food-diary.component';
import { AuthGuard } from './guards/auth.guard';
import { UnifiedScannerComponent } from './unified-scanner/unified-scanner.component';
import { ProfileComponent } from './profile/profile.component';
import { ReceiptScannerComponent } from './receipt-scanner/receipt-scanner.component';
import { FriendsComponent } from './friends/friends.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { ManualEntryComponent } from './manual-entry/manual-entry.component';

export const routes: Routes = [
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'scanner', component: UnifiedScannerComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'ocr-results', component: OcrResultsComponent },
  // Protected routes
  { path: 'saved', component: SavedComponent, canActivate: [AuthGuard] },
  { path: 'preferences', component: PreferencesComponent, canActivate: [AuthGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [AuthGuard] },
  { path: 'suggestions', component: SuggestionsComponent, canActivate: [AuthGuard] },
  { path: 'community', component: CommunityComponent, canActivate: [AuthGuard] },
  { path: 'shopping-list', component: ShoppingListComponent, canActivate: [AuthGuard] },
  { path: 'achievements', component: AchievementsComponent, canActivate: [AuthGuard] },
  { path: 'food-diary', component: FoodDiaryComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'receipt-scanner', component: ReceiptScannerComponent, canActivate: [AuthGuard] },
  { path: 'friends', component: FriendsComponent, canActivate: [AuthGuard] },
  { path: 'leaderboard', component: LeaderboardComponent, canActivate: [AuthGuard] },
  { path: 'manual-entry', component: ManualEntryComponent, canActivate: [AuthGuard] }
];