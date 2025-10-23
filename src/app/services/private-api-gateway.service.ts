import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { supabase } from '../../integrations/supabase/client';

@Injectable({
  providedIn: 'root'
})
export class PrivateApiGatewayService {
  private gwBase = environment.tailscaleGatewayBaseUrl?.trim();

  constructor(private http: HttpClient) {}

  // Generic GET to /resource on the private gateway
  async get<T = any>(path: string, query?: Record<string, string | number | boolean>): Promise<T> {
    if (this.gwBase) {
      const params = new HttpParams({ fromObject: (query || {}) as any });
      const url = this.join(this.gwBase, path);
      return await firstValueFrom(this.http.get<T>(url, { params }));
    }
    // Fallback to Supabase edge proxy
    const { data, error } = await supabase.functions.invoke('tailscale-proxy', {
      body: {
        method: 'GET',
        path,
        query
      }
    });
    if (error) throw error;
    return data as T;
  }

  // Generic POST
  async post<T = any>(path: string, body?: any): Promise<T> {
    if (this.gwBase) {
      const url = this.join(this.gwBase, path);
      return await firstValueFrom(this.http.post<T>(url, body));
    }
    const { data, error } = await supabase.functions.invoke('tailscale-proxy', {
      body: {
        method: 'POST',
        path,
        body
      }
    });
    if (error) throw error;
    return data as T;
  }

  private join(base: string, path: string): string {
    if (!path) return base;
    const slash = path.startsWith('/') ? '' : '/';
    return `${base}${slash}${path}`;
  }
}