import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Public and User Routes - Eagerly loaded for initial experience
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'scanner', loadComponent: () => import('./unified-scanner/unified-scanner.component').then(m => m.UnifiedScannerComponent) },
  { path: 'results', loadComponent: () => import('./results/results.component').then(m => m.ResultsComponent) },
  { path: 'ocr-results', loadComponent: () => import('./ocr-results/ocr-results.component').then(m => m.OcrResultsComponent) },
  
  // Authenticated User Routes - Lazy loaded
  { path: 'favorites', loadComponent: () => import('./favorites/favorites.component').then(m => m.FavoritesComponent), canActivate: [AuthGuard] },
  { path: 'preferences', loadComponent: () => import('./preferences/preferences.component').then(m => m.PreferencesComponent), canActivate: [AuthGuard] },
  { path: 'history', loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent), canActivate: [AuthGuard] },
  { path: 'suggestions', loadComponent: () => import('./suggestions/suggestions.component').then(m => m.SuggestionsComponent), canActivate: [AuthGuard] },
  { path: 'community', loadComponent: () => import('./community/community.component').then(m => m.CommunityComponent), canActivate: [AuthGuard] },
  { path: 'shopping-list', loadComponent: () => import('./shopping-list/shopping-list.component').then(m => m.ShoppingListComponent), canActivate: [AuthGuard] },
  { path: 'achievements', loadComponent: () => import('./achievements/achievements.component').then(m => m.AchievementsComponent), canActivate: [AuthGuard] },
  { path: 'food-diary', loadComponent: () => import('./food-diary/food-diary.component').then(m => m.FoodDiaryComponent), canActivate: [AuthGuard] },
  { path: 'profile', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] },
  { path: 'users/:id', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] },
  { path: 'profile/edit', loadComponent: () => import('./profile-editor/profile-editor.component').then(m => m.ProfileEditorComponent), canActivate: [AuthGuard] },
  { path: 'manual-entry', loadComponent: () => import('./manual-entry/manual-entry.component').then(m => m.ManualEntryComponent), canActivate: [AuthGuard] },
  { path: 'leaderboard', loadComponent: () => import('./leaderboard/leaderboard.component').then(m => m.LeaderboardComponent), canActivate: [AuthGuard] },
  { path: 'friends', loadComponent: () => import('./friends/friends.component').then(m => m.FriendsComponent), canActivate: [AuthGuard] },
  { path: 'console', loadComponent: () => import('./agent-console/agent-console.component').then(m => m.AgentConsoleComponent), canActivate: [AuthGuard] },

  // Protected Admin Routes - Lazy loaded
  { 
    path: 'admin', 
    canActivate: [AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'dev-console', loadComponent: () => import('./dev-console/dev-console.component').then(m => m.DevConsoleComponent) }
    ]
  }
];