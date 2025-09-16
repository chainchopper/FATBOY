import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { LucideAngularModule,
  Camera, Menu, Bell, MessageCircle, BookOpen, BarChart2, Heart, History, ShoppingCart,
  Award, Users, Lightbulb, Globe, Settings, User, LogIn, LogOut, Edit3, Upload, Plus, Mic,
  Barcode, RotateCcw, Twitter, Instagram, Github
} from 'lucide-angular';

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
    // Register only the icons we use (avoids missing-icon runtime errors)
    importProvidersFrom(
      LucideAngularModule.pick({
        Camera,
        Menu,
        Bell,
        MessageCircle,
        BookOpen,
        BarChart2,
        Heart,
        History,
        ShoppingCart,
        Award,
        Users,
        Lightbulb,
        Globe,
        Settings,
        User,
        LogIn,
        LogOut,
        Edit3,
        Upload,
        Plus,
        Mic,
        Barcode,
        RotateCcw,
        Twitter,
        Instagram,
        Github
      })
    )
  ]
};