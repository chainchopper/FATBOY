import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { from } from 'rxjs';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  avatar_url: string;
  user_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {

  constructor() { }

  async getGlobalLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard')
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
      console.error('Error fetching leaderboard:', error);
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