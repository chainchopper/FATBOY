import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CommunityService {

  constructor(private authService: AuthService) { }

  async getContributions() {
    const { data, error } = await supabase
      .from('community_contributions')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url),
        comments:contribution_comments(*, profile:profiles(first_name, last_name))
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contributions:', error);
      return [];
    }
    return data;
  }

  async addContribution(contribution: any) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('community_contributions')
      .insert([{ ...contribution, user_id: userId }])
      .select();

    if (error) {
      console.error('Error adding contribution:', error);
      return null;
    }
    return data[0];
  }

  async addLike(contributionId: string, currentLikes: number) {
    const { error } = await supabase
      .from('community_contributions')
      .update({ likes: currentLikes + 1 })
      .eq('id', contributionId);

    if (error) {
      console.error('Error adding like:', error);
    }
  }

  async addComment(contributionId: string, text: string) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('contribution_comments')
      .insert([{ contribution_id: contributionId, user_id: userId, text }])
      .select(`*, profile:profiles(first_name, last_name)`)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return null;
    }
    return data;
  }
}