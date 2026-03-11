import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { AuthCallbackComponent } from './features/auth-callback/auth-callback.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Klara – Anmelden',
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard],
    title: 'Klara',
  },
  // Weitere geschützte Routen ab Issue 4:
  // { path: 'students', canActivate: [authGuard], ... }
  {
    path: '**',
    redirectTo: '',
  },
];
