import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthUserDto } from '@app/domain';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AuthUserDto | null>(null);

  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly currentUser = computed(() => this._user());

  async handleCallback(token: string): Promise<void> {
    this._token.set(token);
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
    this.http.get('/api/auth/logout').subscribe();
    this.router.navigate(['/login']);
  }
}
