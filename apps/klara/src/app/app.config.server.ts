import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ssrBaseUrlInterceptor, SSR_BACKEND_URL } from './auth/ssr-base-url.interceptor';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // SSR braucht absolute URLs für HTTP-Calls – kein Browser-Proxy verfügbar
    provideHttpClient(withFetch(), withInterceptors([ssrBaseUrlInterceptor])),
    {
      provide: SSR_BACKEND_URL,
      // Im Docker-Container: BACKEND_URL=http://backend:3000
      // Lokal (nx serve-ssr): http://localhost:3000
      useFactory: () => process.env['BACKEND_URL'] ?? 'http://localhost:3000',
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
