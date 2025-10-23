// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, CF-Access-Client-Id, CF-Access-Client-Secret',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth (require logged-in user)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  // Parse body and target settings
  const { method = 'GET', path = '', query = {}, body } = await req.json().catch(() => ({}));
  const targetBase = Deno.env.get('TARGET_BASE_URL') || '';
  if (!targetBase) {
    return new Response(JSON.stringify({ error: 'TARGET_BASE_URL not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  // Optional Cloudflare Access service token
  const cfId = Deno.env.get('CF_ACCESS_CLIENT_ID') || '';
  const cfSecret = Deno.env.get('CF_ACCESS_CLIENT_SECRET') || '';

  // Build URL
  const url = new URL(path.startsWith('/') ? path : `/${path}`, targetBase);
  Object.entries(query || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  // Prepare headers
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (cfId && cfSecret) {
    headers['CF-Access-Client-Id'] = cfId;
    headers['CF-Access-Client-Secret'] = cfSecret;
  }

  try {
    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('Content-Type') || 'application/json';
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': contentType }
    });
  } catch (err) {
    console.error('tailscale-proxy error', err);
    return new Response(JSON.stringify({ error: 'Upstream error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});