import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <main class="callback-page">
      <p>Anmeldung wird verarbeitet…</p>
    </main>
  `,
  styles: [`
    .callback-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: var(--ink-faint);
      font-size: 14px;
      background: var(--off-white);
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  async ngOnInit(): Promise<void> {
    // Token kommt nicht mehr als URL-Parameter – stattdessen /api/auth/me aufrufen.
    // Das JWT-Cookie wurde vom Backend gesetzt und wird automatisch mitgesendet.
    const success = await this.authService.handleCallbackViaCookie();

    if (success) {
      this.router.navigate(['/app']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
