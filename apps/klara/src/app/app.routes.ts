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
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent, title: 'Klara' },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/list/student-list.component').then(
            (m) => m.StudentListComponent,
          ),
        title: 'Schüler – Klara',
      },
      {
        path: 'students/new',
        loadComponent: () =>
          import('./features/students/form/student-form.component').then(
            (m) => m.StudentFormComponent,
          ),
        title: 'Neuer Schüler – Klara',
      },
      {
        path: 'students/:id',
        loadComponent: () =>
          import('./features/students/detail/student-detail.component').then(
            (m) => m.StudentDetailComponent,
          ),
        title: 'Schülerprofil – Klara',
      },
      {
        path: 'students/:id/edit',
        loadComponent: () =>
          import('./features/students/form/student-form.component').then(
            (m) => m.StudentFormComponent,
          ),
        title: 'Schüler bearbeiten – Klara',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
