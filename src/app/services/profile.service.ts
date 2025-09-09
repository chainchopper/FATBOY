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
  role: string;
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

  getProfileById(id: string): Observable<Profile | null> {
    return from(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => response.data as Profile | null)
    );
  }

  async updateProfile(profileData: { first_name: string, last_name: string, avatar_url?: string }): Promise<Profile | null> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const updates = {
      ...profileData,
      id: userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }
    return data as Profile;
  }

  async uploadAvatar(file: File): Promise<string | null> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}