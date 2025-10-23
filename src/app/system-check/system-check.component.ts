import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { supabase } from '../../integrations/supabase/client';
import { ButtonComponent } from '../button/button.component';

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

@Component({
  selector: 'app-system-check',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './system-check.component.html',
  styleUrls: []
})
export class SystemCheckComponent implements OnInit {
  results: CheckResult[] = [];
  loading = true;

  ngOnInit() {
    this.runChecks();
  }

  async runChecks() {
    this.loading = true;
    const checks: CheckResult[] = [];

    // AI models
    try {
      const res = await fetch(`${environment.openaiApiBaseUrl}/v1/models`);
      const ok = res.ok;
      checks.push({ name: 'AI Models Endpoint', ok, detail: ok ? 'reachable' : `HTTP ${res.status}` });
    } catch (e: any) {
      checks.push({ name: 'AI Models Endpoint', ok: false, detail: e?.message || 'Network error' });
    }

    // TTS Health
    try {
      const res = await fetch(`${environment.ttsApiEndpoint}/v1/health`);
      const ok = res.ok;
      checks.push({ name: 'TTS Health', ok, detail: ok ? 'healthy' : `HTTP ${res.status}` });
    } catch (e: any) {
      checks.push({ name: 'TTS Health', ok: false, detail: e?.message || 'Network error' });
    }

    // Supabase DB
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      checks.push({ name: 'Supabase DB', ok: !error, detail: error ? error.message : 'query ok' });
    } catch (e: any) {
      checks.push({ name: 'Supabase DB', ok: false, detail: e?.message || 'Query failed' });
    }

    // Edge Function: search-products
    try {
      const { data, error } = await supabase.functions.invoke('search-products', {
        body: { query: 'test' }
      });
      checks.push({ name: 'Edge: search-products', ok: !error, detail: error ? error.message : 'ok' });
    } catch (e: any) {
      checks.push({ name: 'Edge: search-products', ok: false, detail: e?.message || 'Invoke failed' });
    }

    // Edge Function: search-open-food-facts
    try {
      const { data, error } = await supabase.functions.invoke('search-open-food-facts', {
        body: { query: 'apple' }
      });
      checks.push({ name: 'Edge: search-open-food-facts', ok: !error, detail: error ? error.message : 'ok' });
    } catch (e: any) {
      checks.push({ name: 'Edge: search-open-food-facts', ok: false, detail: e?.message || 'Invoke failed' });
    }

    // Edge Function: fetch-food-metadata
    try {
      const { data, error } = await supabase.functions.invoke('fetch-food-metadata', {
        body: { food_names: ['Greek Yogurt'] }
      });
      checks.push({ name: 'Edge: fetch-food-metadata', ok: !error, detail: error ? error.message : 'ok' });
    } catch (e: any) {
      checks.push({ name: 'Edge: fetch-food-metadata', ok: false, detail: e?.message || 'Invoke failed' });
    }

    this.results = checks;
    this.loading = false;
  }

  getBadgeClasses(ok: boolean): string {
    return ok
      ? 'bg-teal-900/20 border border-teal-500 text-teal-400'
      : 'bg-red-900/20 border border-red-500 text-red-400';
  }
}