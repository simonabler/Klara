import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">

      <!-- ── Sidebar ── -->
      <nav class="sidebar">
        <div class="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
            <rect x="2" y="2" width="22" height="28" rx="5" fill="#fff" opacity=".9"/>
            <rect x="16" y="8" width="18" height="18" rx="4" fill="#7BAABA"/>
            <rect x="22" y="24" width="12" height="12" rx="3" fill="#D4B896"/>
          </svg>
          <a routerLink="/" class="brand-name">klara</a>
        </div>

        <div class="nav-section-label">Übersicht</div>

        <ul class="nav-list">
          <li>
            <a routerLink="/app/students" routerLinkActive="active" class="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Schüler
            </a>
          </li>
          <li>
            <a routerLink="/app/notes" routerLinkActive="active" class="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Notizen
            </a>
          </li>
          <li>
            <a routerLink="/app/classes" routerLinkActive="active" class="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Klassen
            </a>
          </li>
        </ul>

        <div class="sidebar-footer">
          <div class="nav-section-label">System</div>
          <ul class="nav-list">
            <li>
              <a routerLink="/app/settings" routerLinkActive="active" class="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                Einstellungen
              </a>
            </li>
            <li>
              <button class="nav-item logout" (click)="logout()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Abmelden
              </button>
            </li>
          </ul>
          <a routerLink="/impressum" class="impressum-link">Impressum</a>
        </div>
      </nav>

      <!-- ── Content ── -->
      <main class="shell-content">
        <router-outlet />
      </main>

    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background: var(--off-white);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 216px;
      flex-shrink: 0;
      background: var(--navy);
      display: flex;
      flex-direction: column;
      padding: var(--sp-5) 0 var(--sp-4);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: 0 var(--sp-4) var(--sp-5);
      border-bottom: 1px solid rgba(255,255,255,.08);
      margin-bottom: var(--sp-3);
    }
    .brand-name {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 22px;
      color: var(--white);
      letter-spacing: -0.3px;
    }

    .nav-section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(255,255,255,.3);
      padding: var(--sp-2) var(--sp-4) var(--sp-2);
      margin-top: var(--sp-2);
    }

    .nav-list {
      list-style: none;
      padding: 0 var(--sp-3);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: 9px var(--sp-3);
      border-radius: var(--r-sm);
      font-size: 13px;
      font-weight: 450;
      color: rgba(255,255,255,.6);
      cursor: pointer;
      transition: background .12s, color .12s;
      text-decoration: none;
      width: 100%;
      background: none;
      border: none;
      text-align: left;
      margin-bottom: 2px;
    }
    .nav-item svg { opacity: .75; flex-shrink: 0; }
    .nav-item:hover {
      background: rgba(255,255,255,.08);
      color: rgba(255,255,255,.9);
    }
    .nav-item:hover svg { opacity: 1; }
    .nav-item.active {
      background: rgba(255,255,255,.12);
      color: var(--white);
    }
    .nav-item.active svg { opacity: 1; }
    .nav-item.logout:hover { color: #f4a4a4; }

    .sidebar-footer {
      margin-top: auto;
      border-top: 1px solid rgba(255,255,255,.08);
      padding-top: var(--sp-3);
    }
    .impressum-link {
      display: block;
      padding: var(--sp-2) var(--sp-4);
      margin-top: var(--sp-2);
      font-size: 11px;
      color: rgba(255,255,255,.22);
      text-decoration: none;
      transition: color .15s;
      letter-spacing: 0.2px;
    }
    .impressum-link:hover { color: rgba(255,255,255,.5); }

    /* ── Content ── */
    .shell-content {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
    }
  `],
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  logout(): void { this.authService.logout(); }
}
