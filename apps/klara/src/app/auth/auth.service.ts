import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

  constructor() {
    // Beim Start: wenn Token vorhanden, Profil laden
    if (this._token()) {
      this.loadProfile();
    }
  }

  async handleCallback(token: string): Promise<void> {
    this._token.set(token);
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    await this.loadProfile();
  }

  getToken(): string | null {
    return this._token();
  }

  private loadProfile(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<AuthUserDto>('/api/auth/me').subscribe({
        next: (user) => { this._user.set(user); resolve(); },
        error: () => { this.logout(); resolve(); },
      });
    });
  }

  loginWithGoogle(): void {
    window.location.href = '/api/auth/google';
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.http.get('/api/auth/logout').subscribe();
    this.router.navigate(['/login']);
  }
}
