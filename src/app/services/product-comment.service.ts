import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface ProductComment {
  id: string;
  product_client_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profile: {
    first_name: string | null;
    avatar_url: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductCommentService {
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  async getComments(productClientId: string): Promise<ProductComment[]> {
    const { data, error } = await supabase
      .from('product_comments')
      .select(`
        *,
        profile:profiles (
          first_name,
          avatar_url
        )
      `)
      .eq('product_client_id', productClientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      this.notificationService.showError('Could not load comments.');
      return [];
    }
    return data as ProductComment[];
  }

  async addComment(productClientId: string, commentText: string): Promise<ProductComment | null> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.notificationService.showError('You must be logged in to comment.');
      return null;
    }

    const { data, error } = await supabase
      .from('product_comments')
      .insert({
        product_client_id: productClientId,
        user_id: userId,
        comment_text: commentText
      })
      .select(`
        *,
        profile:profiles (
          first_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      this.notificationService.showError('Failed to post comment.');
      return null;
    }
    
    this.notificationService.showSuccess('Comment posted!');
    return data as ProductComment;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('product_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      this.notificationService.showError('Failed to delete comment.');
      return false;
    }
    
    this.notificationService.showInfo('Comment deleted.');
    return true;
  }
}