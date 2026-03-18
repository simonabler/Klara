import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const token       = authService.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Auth-Endpunkte selbst niemals in den 401-Handler einschließen –
  // sonst entsteht ein Loop: logout → 401 → logout → 401 → …
  const isAuthEndpoint = req.url.includes('/api/auth/');

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthEndpoint) {
        // JWT abgelaufen oder ungültig → logout + zurück zur Login-Seite
        authService.logout();
      }
      return throwError(() => err);
    }),
  );
};
