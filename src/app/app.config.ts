import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  // Existing icons
  Camera, Menu, Bell, MessageCircle, BookOpen, BarChart2, Heart, History, ShoppingCart,
  Award, Users, Lightbulb, Globe, Settings, User, LogIn, LogOut, Edit3, Upload, Plus, Mic,
  Barcode, RotateCcw, Twitter, Instagram, Github,
  // Newly added icons used throughout templates
  BookPlus, Share2, Trash2, X, Check, MessageSquare, UserPlus, Activity,
  Apple, Carrot, Fish, Bird, Cookie, Wheat, CupSoda, Milk, HelpCircle,
  // Some templates reference a scan overlay; include ScanLine if available
  ScanLine
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    importProvidersFrom(
      LucideAngularModule.pick({
        // Existing
        Camera, Menu, Bell, MessageCircle, BookOpen, BarChart2, Heart, History, ShoppingCart,
        Award, Users, Lightbulb, Globe, Settings, User, LogIn, LogOut, Edit3, Upload, Plus, Mic,
        Barcode, RotateCcw, Twitter, Instagram, Github,
        // New
        BookPlus, Share2, Trash2, X, Check, MessageSquare, UserPlus, Activity,
        Apple, Carrot, Fish, Bird, Cookie, Wheat, CupSoda, Milk, HelpCircle,
        ScanLine
      })
    )
  ]
};