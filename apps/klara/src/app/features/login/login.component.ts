import { Component, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main class="login-page">
      <div class="login-card">
        <h1>Klara</h1>
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
      </div>
    </main>
  `,
  styles: [`
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8f8f6;
    }
    .login-card {
      background: white;
      border-radius: 12px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      max-width: 360px;
      width: 100%;
    }
    h1 {
      font-size: 2rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: #888;
      font-size: 0.95rem;
      margin: 0 0 2rem;
    }
    .google-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
      color: #333;
    }
    .google-btn:hover {
      background: #f5f5f5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  login(): void {
    this.authService.loginWithGoogle();
  }
}
