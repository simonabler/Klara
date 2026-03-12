import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AppShellComponent } from './shell/app-shell.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { AuthCallbackComponent } from './features/auth-callback/auth-callback.component';

export const appRoutes: Route[] = [
  // ── Öffentliche Routen ──────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    title: 'Klara – Dokumentationstool für Lehrkräfte',
  },
  { path: 'login', component: LoginComponent, title: 'Klara – Anmelden' },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'impressum',
    loadComponent: () => import('./features/impressum/impressum.component').then(m => m.ImpressumComponent),
    title: 'Impressum – Klara',
  },

  // ── App (geschützt) ─────────────────────────────────────────────────────
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent, title: 'Klara' },
      { path: 'notes',           loadComponent: () => import('./features/notes/notes-page.component').then(m => m.NotesPageComponent),             title: 'Notizen – Klara' },
      { path: 'students',        loadComponent: () => import('./features/students/list/student-list.component').then(m => m.StudentListComponent),   title: 'Schüler – Klara' },
      { path: 'students/new',    loadComponent: () => import('./features/students/form/student-form.component').then(m => m.StudentFormComponent),   title: 'Neuer Schüler – Klara' },
      { path: 'students/import', loadComponent: () => import('./features/students/import/student-import.component').then(m => m.StudentImportComponent), title: 'Schüler importieren – Klara' },
      { path: 'students/:id',    loadComponent: () => import('./features/students/detail/student-detail.component').then(m => m.StudentDetailComponent), title: 'Schülerprofil – Klara' },
      { path: 'students/:id/edit', loadComponent: () => import('./features/students/form/student-form.component').then(m => m.StudentFormComponent), title: 'Schüler bearbeiten – Klara' },
      { path: 'classes',         loadComponent: () => import('./features/classes/list/class-list.component').then(m => m.ClassListComponent),       title: 'Klassen – Klara' },
      { path: 'classes/new',     loadComponent: () => import('./features/classes/form/class-form.component').then(m => m.ClassFormComponent),       title: 'Neue Klasse – Klara' },
      { path: 'classes/:id/edit',loadComponent: () => import('./features/classes/form/class-form.component').then(m => m.ClassFormComponent),       title: 'Klasse bearbeiten – Klara' },
      { path: 'settings',        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),              title: 'Einstellungen – Klara' },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
