import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home">
      <div class="welcome">
        <h1>Willkommen bei Klara</h1>
        <p class="subtitle">Ihr persönliches Werkzeug zur Schülerdokumentation.</p>
      </div>

      <div class="card-grid">
        <a routerLink="/students" class="feature-card">
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
        <a routerLink="/classes" class="feature-card">
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
        <a routerLink="/settings" class="feature-card">
          <div class="card-icon" style="background: #EDD9C4;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A5A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">Einstellungen</div>
            <div class="card-desc">Fächer und Schulstufen verwalten</div>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .home { padding: var(--sp-7) var(--sp-6); max-width: 780px; }

    .welcome { margin-bottom: var(--sp-7); }
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
export class HomeComponent {}
