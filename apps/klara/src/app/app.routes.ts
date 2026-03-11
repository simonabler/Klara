import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AppShellComponent } from './shell/app-shell.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { AuthCallbackComponent } from './features/auth-callback/auth-callback.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent, title: 'Klara – Anmelden' },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent, title: 'Klara' },
      { path: 'students', loadComponent: () => import('./features/students/list/student-list.component').then(m => m.StudentListComponent), title: 'Schüler – Klara' },
      { path: 'students/new', loadComponent: () => import('./features/students/form/student-form.component').then(m => m.StudentFormComponent), title: 'Neuer Schüler – Klara' },
      { path: 'students/:id', loadComponent: () => import('./features/students/detail/student-detail.component').then(m => m.StudentDetailComponent), title: 'Schülerprofil – Klara' },
      { path: 'students/:id/edit', loadComponent: () => import('./features/students/form/student-form.component').then(m => m.StudentFormComponent), title: 'Schüler bearbeiten – Klara' },
      { path: 'classes', loadComponent: () => import('./features/classes/list/class-list.component').then(m => m.ClassListComponent), title: 'Klassen – Klara' },
      { path: 'classes/new', loadComponent: () => import('./features/classes/form/class-form.component').then(m => m.ClassFormComponent), title: 'Neue Klasse – Klara' },
      { path: 'classes/:id/edit', loadComponent: () => import('./features/classes/form/class-form.component').then(m => m.ClassFormComponent), title: 'Klasse bearbeiten – Klara' },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent), title: 'Einstellungen – Klara' },
    ],
  },
  { path: '**', redirectTo: '' },
];
