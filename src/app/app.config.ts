import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { LucideAngularModule, icons } from 'lucide-angular';
// import { CameraFeedComponent } from './camera-feed/camera-feed.component'; // Removed global import

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    provideAnimations(), // required animations providers
    provideToastr({ // Toastr providers
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    // Provide all lucide icons globally using the correct method
    importProvidersFrom(LucideAngularModule.pick(icons)),
    // importProvidersFrom(CameraFeedComponent) // Removed global import for CameraFeedComponent
  ]
};