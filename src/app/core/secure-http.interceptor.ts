import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

function shouldAttach(url: string): boolean {
  try {
    const target = new URL(url, window.location.origin);

    // Normalize trusted hosts as string[]
    const envTrusted = (environment.trustedHosts as unknown as string[]) || [];
    const trusted = new Set<string>(envTrusted);

    // Also trust the Tailscale gateway host if configured
    const gw = environment.tailscaleGatewayBaseUrl || '';
    if (gw) {
      try {
        const gwHost = new URL(gw).host;
        trusted.add(gwHost);
      } catch {
        // ignore parse issues
      }
    }

    return trusted.has(target.host);
  } catch {
    // Relative URLs or parse errors: never attach
    return false;
  }
}

export const secureHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const cf = environment.cloudflareAccess || {};
  if (!cf.clientId || !cf.clientSecret) {
    return next(req);
  }
  if (!shouldAttach(req.url)) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      'CF-Access-Client-Id': cf.clientId,
      'CF-Access-Client-Secret': cf.clientSecret
    }
  });
  return next(cloned);
};