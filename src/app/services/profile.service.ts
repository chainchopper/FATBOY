import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(private authService: AuthService) { }

  getProfile(): Observable<Profile | null> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        return from(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        ).pipe(
          map(response => response.data as Profile | null)
        );
      })
    );
  }
}