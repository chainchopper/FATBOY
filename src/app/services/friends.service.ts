import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';
import { from, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

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
      .from('friend_requests')
      .select(`
        id,
        status,
        requester:profiles!friend_requests_requester_id_fkey (
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
      .from('friend_requests')
      .select('id, addressee:profiles!friend_requests_addressee_id_fkey(*)')
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    const { data: part2, error: error2 } = await supabase
      .from('friend_requests')
      .select('id, requester:profiles!friend_requests_requester_id_fkey(*)')
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

  // Updates the status of a friend request (e.g., to 'accepted' or 'declined')
  async updateFriendRequest(requestId: number, status: 'accepted' | 'declined'): Promise<any> {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId);
    
    if (error) console.error('Error updating friend request:', error);
    return data;
  }

  // Removes a friendship or declines a request
  async removeFriendship(friendshipId: number): Promise<any> {
    const { data, error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', friendshipId);

    if (error) console.error('Error removing friendship:', error);
    return data;
  }
}