import { Route } from '@angular/router';
import { HomeComponent } from './features/home/home.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    title: 'Klara',
  },
  // Weitere Routen werden ab Issue 4 hinzugefügt:
  // { path: 'students', ... }
  // { path: 'classes', ... }
  // { path: 'notes', ... }
  // { path: 'assessments', ... }
  {
    path: '**',
    redirectTo: '',
  },
];
