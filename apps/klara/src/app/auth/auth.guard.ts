import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  // Token aus localStorage → direkt erlaubt
  // Kein Token → Login
  return authService.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
};
