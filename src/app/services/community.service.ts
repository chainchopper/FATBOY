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
        id,
        product_name,
        brand,
        ingredients,
        notes,
        created_at,
        status,
        metadata,
        profile:profiles(first_name, last_name, avatar_url),
        comments:contribution_comments(*, profile:profiles(first_name, last_name)),
        likes:nirvana_post_likes(user_id)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contributions:', error);
      return [];
    }
    return data;
  }

  async getMyContributions() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('community_contributions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching my contributions:', error);
      return [];
    }
    return data;
  }

  async getContributionsByUserId(userId: string) {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('community_contributions')
      .select('id, product_name, brand, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching contributions for user ${userId}:`, error);
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
    
    // Log this activity
    supabase.rpc('log_user_activity', { 
      activity_type: 'community', 
      activity_description: `Contributed a new product: ${contribution.product_name}` 
    }).then();

    return data[0];
  }

  async toggleLike(postId: string, likes: { user_id: string }[]): Promise<any> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const userHasLiked = likes.some(like => like.user_id === userId);

    if (userHasLiked) {
      // Unlike
      const { error } = await supabase
        .from('nirvana_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (error) console.error('Error unliking post:', error);
      return { action: 'unliked' };
    } else {
      // Like
      const { error } = await supabase
        .from('nirvana_post_likes')
        .insert({ post_id: postId, user_id: userId });
      if (error) console.error('Error liking post:', error);
      return { action: 'liked' };
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