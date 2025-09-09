import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor() { }

  async getDashboardStats() {
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: pendingContributions, error: pendingError } = await supabase
      .from('community_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: totalContributions, error: totalError } = await supabase
      .from('community_contributions')
      .select('*', { count: 'exact', head: true });

    if (usersError || pendingError || totalError) {
      console.error('Error fetching dashboard stats:', usersError || pendingError || totalError);
      return { totalUsers: 0, pendingContributions: 0, totalContributions: 0 };
    }

    return {
      totalUsers: totalUsers || 0,
      pendingContributions: pendingContributions || 0,
      totalContributions: totalContributions || 0
    };
  }

  async getPendingContributions() {
    const { data, error } = await supabase
      .from('community_contributions')
      .select(`*, profile:profiles(first_name, last_name)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending contributions:', error);
      return [];
    }
    return data;
  }

  async updateContributionStatus(id: string, status: 'approved' | 'rejected') {
    const { data, error } = await supabase
      .from('community_contributions')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating contribution status:', error);
      return null;
    }
    return data[0];
  }
}