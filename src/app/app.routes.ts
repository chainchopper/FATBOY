import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // Keep import for reference, but not used
import { AdminGuard } from './guards/admin.guard'; // Keep import for reference, but not used

export const routes: Routes = [
  // Public and User Routes - Eagerly loaded for initial experience
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'scanner', loadComponent: () => import('./unified-scanner/unified-scanner.component').then(m => m.UnifiedScannerComponent) },
  { path: 'products/:id', loadComponent: () => import('./product-details/product-details.component').then(m => m.ProductDetailsComponent) }, // New route
  
  // Authenticated User Routes - Now whitelisted for development
  { path: 'favorites', loadComponent: () => import('./favorites/favorites.component').then(m => m.FavoritesComponent) },
  { path: 'preferences', loadComponent: () => import('./preferences/preferences.component').then(m => m.PreferencesComponent) },
  { path: 'history', loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) },
  { path: 'suggestions', loadComponent: () => import('./suggestions/suggestions.component').then(m => m.SuggestionsComponent) },
  { path: 'community', loadComponent: () => import('./community/community.component').then(m => m.CommunityComponent) },
  { path: 'shopping-list', loadComponent: () => import('./shopping-list/shopping-list.component').then(m => m.ShoppingListComponent) },
  { path: 'achievements', loadComponent: () => import('./achievements/achievements.component').then(m => m.AchievementsComponent) },
  { path: 'food-diary', loadComponent: () => import('./food-diary/food-diary.component').then(m => m.FoodDiaryComponent) },
  { path: 'profile', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'users/:id', loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'profile/edit', loadComponent: () => import('./profile-editor/profile-editor.component').then(m => m.ProfileEditorComponent) },
  { path: 'manual-entry', loadComponent: () => import('./manual-entry/manual-entry.component').then(m => m.ManualEntryComponent) },
  { path: 'leaderboard', loadComponent: () => import('./leaderboard/leaderboard.component').then(m => m.LeaderboardComponent) },
  { path: 'friends', loadComponent: () => import('./friends/friends.component').then(m => m.FriendsComponent) },
  { path: 'console', loadComponent: () => import('./agent-console/agent-console.component').then(m => m.AgentConsoleComponent) },

  // Protected Admin Routes - Now whitelisted for development
  { 
    path: 'admin', 
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'dev-console', loadComponent: () => import('./dev-console/dev-console.component').then(m => m.DevConsoleComponent) }
    ]
  }
];