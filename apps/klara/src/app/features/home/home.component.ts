import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home">
      <div class="welcome">
        @if (user()?.displayName) {
          <p class="welcome-label">Willkommen zurück,</p>
          <h1>{{ user()!.displayName }}</h1>
        } @else {
          <h1>Willkommen bei klara</h1>
        }
        <p class="subtitle">Ihr persönliches Werkzeug zur Schülerdokumentation.</p>
      </div>

      <div class="card-grid">
        <a routerLink="/app/students" class="feature-card">
          <div class="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Schüler</div>
            <div class="card-desc">Profile, Stammdaten, Elterninformationen</div>
          </div>
        </a>
        <a routerLink="/app/classes" class="feature-card">
          <div class="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Klassen</div>
            <div class="card-desc">Klassen anlegen und Schüler zuordnen</div>
          </div>
        </a>
        <a routerLink="/app/notes" class="feature-card">
          <div class="card-icon" style="background: var(--light-teal);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Notizen</div>
            <div class="card-desc">Mitarbeit und Verhalten dokumentieren</div>
          </div>
        </a>
        <a routerLink="/app/assessments" class="feature-card">
          <div class="card-icon" style="background: #EDD9C4;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A5A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Leistungen</div>
            <div class="card-desc">Überprüfungen und Schularbeiten erfassen</div>
          </div>
        </a>
        <a routerLink="/app/settings" class="feature-card">
          <div class="card-icon" style="background: var(--surface); border: 1px solid var(--border);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Einstellungen</div>
            <div class="card-desc">Fächer verwalten</div>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .home { padding: var(--sp-7) var(--sp-6); max-width: 820px; }

    .welcome { margin-bottom: var(--sp-7); }
    .welcome-label { font-size: 13px; color: var(--ink-faint); margin: 0 0 var(--sp-1); }
    h1 {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 400;
      color: var(--navy);
      margin: 0 0 var(--sp-2);
    }
    .subtitle { color: var(--ink-faint); font-size: 15px; margin: 0; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--sp-4);
    }

    .feature-card {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      padding: var(--sp-5);
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      transition: box-shadow .15s, transform .15s;
      cursor: pointer;
      text-decoration: none;
    }
    .feature-card:hover {
      box-shadow: var(--sh-md);
      transform: translateY(-1px);
    }

    .card-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--r-sm);
      background: var(--light-teal);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--navy);
    }

    .card-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 3px;
    }
    .card-desc { font-size: 12px; color: var(--ink-faint); }
  `],
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  readonly user = this.authService.currentUser;
}
