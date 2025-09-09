import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor() { }

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