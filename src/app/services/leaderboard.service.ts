import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { from } from 'rxjs';
import { FriendsService } from './friends.service';
import { AuthService } from './auth.service';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  avatar_url: string;
  user_id: string;
}

export interface LeaderboardStats {
  rank: number | null;
  score: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {

  constructor(
    private friendsService: FriendsService,
    private authService: AuthService
  ) { }

  async getGlobalLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('nirvana_leaderboard')
      .select(`
        score,
        profiles (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching global leaderboard:', error);
      return [];
    }

    return data.map((entry: any, index: number) => ({
      rank: index + 1,
      username: `${entry.profiles.first_name || 'Anonymous'} ${entry.profiles.last_name || ''}`.trim(),
      score: entry.score,
      avatar_url: entry.profiles.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${entry.profiles.first_name || 'A'}`,
      user_id: entry.profiles.id
    }));
  }

  async getUserStats(userId: string): Promise<LeaderboardStats> {
    const leaderboard = await this.getGlobalLeaderboard();
    const userEntry = leaderboard.find(entry => entry.user_id === userId);
    return {
      rank: userEntry ? userEntry.rank : null,
      score: userEntry ? userEntry.score : null
    };
  }

  async getFriendsLeaderboard(): Promise<LeaderboardEntry[]> {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) return [];

    const friends = await this.friendsService.getFriends();
    const friendIds = friends.map(f => f.profile.id);
    const allUserIds = [currentUserId, ...friendIds];

    const { data, error } = await supabase
      .from('nirvana_leaderboard')
      .select(`
        score,
        profiles (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .in('user_id', allUserIds)
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching friends leaderboard:', error);
      return [];
    }

    return data.map((entry: any, index: number) => ({
      rank: index + 1,
      username: `${entry.profiles.first_name || 'Anonymous'} ${entry.profiles.last_name || ''}`.trim(),
      score: entry.score,
      avatar_url: entry.profiles.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${entry.profiles.first_name || 'A'}`,
      user_id: entry.profiles.id
    }));
  }

  incrementScore(points: number) {
    return from(supabase.rpc('increment_score', { points_to_add: points }));
  }
}