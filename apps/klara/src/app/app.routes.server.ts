import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '',          renderMode: RenderMode.Prerender },
  { path: 'login',     renderMode: RenderMode.Prerender },
  { path: 'impressum', renderMode: RenderMode.Prerender },
  { path: 'app/**',    renderMode: RenderMode.Client },
  { path: '**',        renderMode: RenderMode.Client },
];
