import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Kein Token → sofort zu Login
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Token vorhanden → Profil sicherstellen (API-Call nur wenn nötig)
  return authService.ensureProfile().pipe(
    map((user) => {
      if (user) return true;
      return router.createUrlTree(['/login']);
    }),
  );
};
