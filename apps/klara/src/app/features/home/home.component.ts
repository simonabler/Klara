import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home">
      <div class="welcome">
        <h1>Willkommen bei Klara</h1>
        <p class="subtitle">Ihr persönliches Werkzeug zur Schülerdokumentation.</p>
      </div>

      <div class="card-grid">
        <a routerLink="/students" class="feature-card">
          <span class="card-icon">👤</span>
          <div>
            <div class="card-label">Schüler</div>
            <div class="card-desc">Profile, Stammdaten, Elterninformationen</div>
          </div>
        </a>
        <a routerLink="/classes" class="feature-card">
          <span class="card-icon">🏫</span>
          <div>
            <div class="card-label">Klassen</div>
            <div class="card-desc">Klassen anlegen und Schüler zuordnen</div>
          </div>
        </a>
        <a routerLink="/settings" class="feature-card">
          <span class="card-icon">⚙</span>
          <div>
            <div class="card-label">Einstellungen</div>
            <div class="card-desc">Fächer und Schulstufen verwalten</div>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .home { padding: 2.5rem; max-width: 820px; }
    .welcome { margin-bottom: 2.5rem; }
    h1 { font-size: 1.6rem; font-weight: 600; margin: 0 0 0.4rem; }
    .subtitle { color: #999; margin: 0; font-size: 0.95rem; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; }
    .feature-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: white; border: 1px solid #ebebeb; border-radius: 12px; text-decoration: none; color: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
    .feature-card:hover { border-color: #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card-icon { font-size: 1.5rem; flex-shrink: 0; }
    .card-label { font-weight: 500; font-size: 0.95rem; margin-bottom: 0.2rem; }
    .card-desc { font-size: 0.8rem; color: #aaa; }
  `],
})
export class HomeComponent {}
