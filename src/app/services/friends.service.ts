import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';

// Define interfaces for our data structures
export interface FriendRequest {
  id: number;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  requester: Profile;
}

export interface Friend {
  id: number; // This is the friendship ID
  profile: Profile;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface ActivityFeedItem {
  activity_id: string;
  user_id: string;
  activity_type: string;
  activity_description: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

export type FriendshipStatus = 'friends' | 'pending_sent' | 'pending_received' | 'not_friends' | 'self';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {

  constructor(private authService: AuthService) { }

  // Fetches pending friend requests for the current user
  async getFriendRequests(): Promise<FriendRequest[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('nirvana_friend_requests')
      .select(`
        id,
        status,
        requester:profiles!nirvana_friend_requests_requester_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }
    return data as any;
  }

  // Fetches the list of accepted friends for the current user
  async getFriends(): Promise<Friend[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return [];

    // We need to query twice because the user can be either the requester or addressee
    const { data: part1, error: error1 } = await supabase
      .from('nirvana_friend_requests')
      .select('id, addressee:profiles!nirvana_friend_requests_addressee_id_fkey(*)')
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    const { data: part2, error: error2 } = await supabase
      .from('nirvana_friend_requests')
      .select('id, requester:profiles!nirvana_friend_requests_requester_id_fkey(*)')
      .eq('addressee_id', userId)
      .eq('status', 'accepted');

    if (error1 || error2) {
      console.error('Error fetching friends:', error1 || error2);
      return [];
    }

    const friends1 = part1.map((item: any) => ({ id: item.id, profile: item.addressee }));
    const friends2 = part2.map((item: any) => ({ id: item.id, profile: item.requester }));
    
    return [...friends1, ...friends2];
  }

  // Searches for users who are not the current user and not already friends/requested
  async searchUsers(query: string): Promise<Profile[]> {
    const userId = this.authService.getCurrentUserId();
    if (!userId || !query) return [];

    // Get IDs of current friends and pending requests to exclude them from search
    const friends = await this.getFriends();
    const friendIds = friends.map(f => f.profile.id);
    const requests = await this.getFriendRequests();
    const requestIds = requests.map(r => r.requester.id);
    const excludedIds = [userId, ...friendIds, ...requestIds];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .ilike('first_name', `%${query}%`) // Case-insensitive search
      .not('id', 'in', `(${excludedIds.join(',')})`);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    return data as Profile[];
  }

  // Sends a friend request to another user
  async sendFriendRequest(addresseeId: string): Promise<any> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('nirvana_friend_requests')
      .insert({
        requester_id: userId,
        addressee_id: addresseeId,
        status: 'pending'
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return null;
    }
    return data;
  }

  // Updates the status of a friend request (e.g., to 'accepted' or 'declined')
  async updateFriendRequest(requestId: number, status: 'accepted' | 'declined'): Promise<any> {
    const { data, error } = await supabase
      .from('nirvana_friend_requests')
      .update({ status })
      .eq('id', requestId);
    
    if (error) console.error('Error updating friend request:', error);
    return data;
  }

  // Removes a friendship or declines a request
  async removeFriendship(friendshipId: number): Promise<any> {
    const { data, error } = await supabase
      .from('nirvana_friend_requests')
      .delete()
      .eq('id', friendshipId);

    if (error) console.error('Error removing friendship:', error);
    return data;
  }

  // Fetches the activity feed for the current user's friends
  async getFriendActivity(): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase.rpc('fatboy_get_friends_activity_feed');
    if (error) {
      console.error('Error fetching friend activity feed:', error);
      return [];
    }
    return data as ActivityFeedItem[];
  }

  // Fetches the activity feed for a specific user
  async getUserActivity(userId: string): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase.rpc('fatboy_get_user_activity_feed', { user_id_param: userId });
    if (error) {
      console.error(`Error fetching activity feed for user ${userId}:`, error);
      return [];
    }
    return data as ActivityFeedItem[];
  }

  // New method to check friendship status
  async getFriendshipStatus(otherUserId: string): Promise<FriendshipStatus> {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) return 'not_friends';
    if (currentUserId === otherUserId) return 'self';

    const { data, error } = await supabase
      .from('nirvana_friend_requests')
      .select('requester_id, status')
      .or(`(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking friendship status:', error);
      return 'not_friends';
    }

    if (!data) {
      return 'not_friends';
    }

    if (data.status === 'accepted') {
      return 'friends';
    }

    if (data.status === 'pending') {
      if (data.requester_id === currentUserId) {
        return 'pending_sent';
      } else {
        return 'pending_received';
      }
    }

    return 'not_friends';
  }

  async getGlobalActivity(limit = 50): Promise<ActivityFeedItem[]> {
    const { data, error } = await supabase
      .from('fatboy_user_activity')
      .select(`
        id,
        user_id,
        type,
        description,
        created_at,
        profile:profiles (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
  
    if (error) {
      console.error('Error fetching global activity feed:', error);
      return [];
    }
    
    return data.map((item: any) => ({
      activity_id: item.id,
      user_id: item.user_id,
      activity_type: item.type,
      activity_description: item.description,
      created_at: item.created_at,
      first_name: item.profile.first_name,
      last_name: item.profile.last_name,
      avatar_url: item.profile.avatar_url
    }));
  }
}