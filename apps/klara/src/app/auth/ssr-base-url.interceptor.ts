import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

/**
 * Injektions-Token für die absolute Backend-URL im SSR-Kontext.
 * Wird nur in app.config.server.ts bereitgestellt.
 */
export const SSR_BACKEND_URL = new InjectionToken<string>('SSR_BACKEND_URL');

/**
 * Im SSR-Kontext laufen HTTP-Requests serverseitig – es gibt keinen Browser-Proxy.
 * Dieser Interceptor prefixiert relative `/api/...`-URLs mit der absoluten Backend-URL,
 * damit der Node-Express-Prozess die Calls direkt ans Backend weiterleiten kann.
 *
 * Im Browser ist dieser Interceptor nicht aktiv (nur in app.config.server.ts registriert).
 */
export const ssrBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const backendUrl = inject(SSR_BACKEND_URL);

  // Nur relative /api-URLs transformieren
  if (req.url.startsWith('/api')) {
    return next(req.clone({ url: `${backendUrl}${req.url}` }));
  }

  return next(req);
};
