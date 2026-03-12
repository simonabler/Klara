import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="login-page">
      <div class="login-card">

        <!-- Logo -->
        <div class="logo-group">
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
            <rect x="2" y="2" width="22" height="28" rx="5" fill="#2E3F5C"/>
            <rect x="16" y="8" width="18" height="18" rx="4" fill="#7BAABA"/>
            <rect x="22" y="24" width="12" height="12" rx="3" fill="#D4B896" opacity=".9"/>
          </svg>
          <span class="logo-name">klara</span>
        </div>

        <p class="tagline">Dokumentationstool für Lehrkräfte</p>

        <button class="google-btn" (click)="login()">
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Mit Google anmelden
        </button>

        @if (isDev()) {
          <div class="divider"><span>oder</span></div>
          <button class="demo-btn" (click)="demoLogin()">Demo-Zugang verwenden</button>
          <p class="demo-hint">Kein Google-Konto erforderlich</p>
        }

      </div>
    </main>
  `,
  styles: [`
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--off-white);
    }
    .login-card {
      background: var(--white);
      border-radius: var(--r-lg);
      padding: var(--sp-7) var(--sp-6);
      text-align: center;
      box-shadow: var(--sh-md);
      max-width: 360px;
      width: 100%;
    }

    /* Logo */
    .logo-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      margin-bottom: var(--sp-2);
    }
    .logo-name {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 28px;
      color: var(--navy);
      letter-spacing: -0.5px;
    }
    .tagline {
      color: var(--ink-faint);
      font-size: 13px;
      margin: 0 0 var(--sp-6);
    }

    /* Google Button */
    .google-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      width: 100%;
      padding: 11px var(--sp-5);
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--white);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s;
    }
    .google-btn:hover {
      border-color: var(--teal);
      box-shadow: var(--sh-sm);
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      margin: var(--sp-5) 0;
      color: var(--border);
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    .divider span { color: var(--ink-faint); font-size: 12px; }

    /* Demo Button */
    .demo-btn {
      width: 100%;
      padding: 10px var(--sp-5);
      border: 1.5px dashed var(--border);
      border-radius: var(--r-sm);
      background: transparent;
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--ink-light);
      cursor: pointer;
      transition: border-color .15s, color .15s;
    }
    .demo-btn:hover {
      border-color: var(--teal);
      color: var(--ink);
    }
    .demo-hint {
      margin: var(--sp-2) 0 0;
      font-size: 11px;
      color: var(--ink-faint);
    }

    @media (max-width: 480px) {
      .card { padding: var(--sp-5) var(--sp-4); margin: var(--sp-4); }
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  isDev(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  login(): void { this.authService.loginWithGoogle(); }
  demoLogin(): void { window.location.href = '/api/auth/demo'; }
}
