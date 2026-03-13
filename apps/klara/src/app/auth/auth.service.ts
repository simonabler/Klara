import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthUserDto } from '@app/domain';

const TOKEN_KEY = 'klara_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readonly _token = signal<string | null>(
    this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null,
  );
  private readonly _user = signal<AuthUserDto | null>(null);

  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly currentUser     = computed(() => this._user());

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

  /**
   * Cookie-Only-Flow (ISSUE-01):
   * Token kommt nicht mehr als URL-Parameter. Das Backend hat den Cookie gesetzt.
   * Wir rufen /api/auth/me auf – wenn der Cookie gültig ist, bekommen wir das Profil.
   * Das Token wird zusätzlich im localStorage gespiegelt, damit der Bearer-Interceptor
   * weiterhin funktioniert (SSR-Kompatibilität, alle bestehenden API-Calls).
   */
  async handleCallbackViaCookie(): Promise<boolean> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUserDto & { token?: string }>('/api/auth/me', {
          withCredentials: true,
        }),
      );
      this._user.set(user);
      // /me liefert kein Token mehr – isAuthenticated prüft nur noch den User
      this._token.set('cookie'); // Sentinel: signalisiert eingeloggt, kein echter Token-Wert
      if (this.isBrowser) {
        localStorage.setItem(TOKEN_KEY, 'cookie');
      }
      return true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    const t = this._token();
    // 'cookie' ist ein Sentinel-Wert – kein echter Bearer-Token
    return t === 'cookie' ? null : t;
  }

  loginWithGoogle(): void {
    window.location.href = '/api/auth/google';
  }

  logout(): void {
    this._clearToken();
    this.http.get('/api/auth/logout', { withCredentials: true }).subscribe();
    this.router.navigate(['/login']);
  }

  /** DSGVO Art. 17 – Konto und alle Daten unwiderruflich löschen */
  async deleteAccount(): Promise<void> {
    await firstValueFrom(
      this.http.delete('/api/auth/account', { withCredentials: true }),
    );
    this._clearToken();
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
