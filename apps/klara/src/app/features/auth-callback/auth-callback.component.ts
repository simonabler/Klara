import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
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
      color: #888;
      font-size: 0.95rem;
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    await this.authService.handleCallback(token);
    this.router.navigate(['/']);
  }
}
