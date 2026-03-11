import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthUserDto } from '@app/domain';

const TOKEN_KEY = 'klara_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readonly _token = signal<string | null>(
    this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null,
  );
  private readonly _user = signal<AuthUserDto | null>(null);

  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly currentUser = computed(() => this._user());

  /** Wird vom Guard aufgerufen, um das Profil bei Bedarf nachzuladen */
  ensureProfile(): Observable<AuthUserDto | null> {
    if (this._user()) return of(this._user());
    if (!this._token()) return of(null);

    return this.http.get<AuthUserDto>('/api/auth/me').pipe(
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._clearToken();
        return of(null);
      }),
    );
  }

  async handleCallback(token: string): Promise<void> {
    this._token.set(token);
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    // Profil sofort laden nach Login
    return new Promise((resolve) => {
      this.http.get<AuthUserDto>('/api/auth/me').subscribe({
        next: (user) => { this._user.set(user); resolve(); },
        error: () => { this._clearToken(); resolve(); },
      });
    });
  }

  getToken(): string | null {
    return this._token();
  }

  loginWithGoogle(): void {
    window.location.href = '/api/auth/google';
  }

  logout(): void {
    this._clearToken();
    this.http.get('/api/auth/logout').subscribe();
    this.router.navigate(['/login']);
  }

  private _clearToken(): void {
    this._token.set(null);
    this._user.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}
