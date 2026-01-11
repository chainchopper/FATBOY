import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  LucideAngularModule,
  Camera, Menu, Bell, MessageCircle, BookOpen, BarChart2, Heart, History, ShoppingCart,
  Award, Users, Lightbulb, Globe, Settings, User, LogIn, LogOut, Edit3, Upload, Plus, Mic,
  Barcode, RotateCcw, Twitter, Instagram, Github, BookPlus, Share2, Trash2, X, Check,
  MessageSquare, UserPlus, Activity, Apple, Carrot, Fish, Bird, Cookie, Wheat, CupSoda, Milk, HelpCircle, ScanLine
} from 'lucide-angular';
import { secureHttpInterceptor } from './core/secure-http.interceptor';
import { UiSoundService } from './services/ui-sound.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([secureHttpInterceptor])),
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    UiSoundService, // Add UI sound service globally
    importProvidersFrom(
      LucideAngularModule.pick({
        Camera, Menu, Bell, MessageCircle, BookOpen, BarChart2, Heart, History, ShoppingCart,
        Award, Users, Lightbulb, Globe, Settings, User, LogIn, LogOut, Edit3, Upload, Plus, Mic,
        Barcode, RotateCcw, Twitter, Instagram, Github,
        BookPlus, Share2, Trash2, X, Check, MessageSquare, UserPlus, Activity,
        Apple, Carrot, Fish, Bird, Cookie, Wheat, CupSoda, Milk, HelpCircle,
        ScanLine
      })
    )
  ]
};