import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';

export interface PrepopulationResult {
  foodName: string;
  status: 'success' | 'skipped' | 'not_found' | 'failed';
  product?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DevConsoleService {

  constructor() { }

  async prepopulateData(foodNames: string[]): Promise<PrepopulationResult[]> {
    if (foodNames.length === 0) {
      return [];
    }

    const { data, error } = await supabase.functions.invoke('fetch-food-metadata', {
      body: { food_names: foodNames }
    });

    if (error) {
      console.error('Error invoking fetch-food-metadata function:', error);
      throw new Error('Failed to call the pre-population service.');
    }

    return data as PrepopulationResult[];
  }
}