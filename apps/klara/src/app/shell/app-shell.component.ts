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
      <nav class="sidebar">
        <div class="sidebar-brand">
          <a routerLink="/" class="brand-link">Klara</a>
        </div>

        <ul class="nav-list">
          <li>
            <a routerLink="/students" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">👤</span>
              <span class="nav-label">Schüler</span>
            </a>
          </li>
          <li>
            <a routerLink="/classes" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">🏫</span>
              <span class="nav-label">Klassen</span>
            </a>
          </li>
        </ul>

        <div class="sidebar-footer">
          <a routerLink="/settings" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚙</span>
            <span class="nav-label">Einstellungen</span>
          </a>
          <button class="nav-item logout-btn" (click)="logout()">
            <span class="nav-icon logout-icon">↪</span>
            <span class="nav-label">Abmelden</span>
          </button>
        </div>
      </nav>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background: #f8f8f6;
    }

    /* ─── Sidebar ─── */
    .sidebar {
      width: 210px;
      flex-shrink: 0;
      background: #fff;
      border-right: 1px solid #ebebeb;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .sidebar-brand {
      padding: 1.4rem 1.25rem 1.2rem;
      border-bottom: 1px solid #f0f0ee;
    }
    .brand-link {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.4px;
      color: #1a1a1a;
      text-decoration: none;
    }

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0.75rem;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      text-decoration: none;
      color: #666;
      font-size: 0.875rem;
      transition: background 0.12s, color 0.12s;
      width: 100%;
    }
    .nav-item:hover { background: #f5f5f3; color: #1a1a1a; }
    .nav-item.active { background: #f0f0ee; color: #1a1a1a; font-weight: 500; }

    .nav-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }

    .sidebar-footer {
      padding: 0.75rem;
      border-top: 1px solid #f0f0ee;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .logout-btn {
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      color: #999;
    }
    .logout-btn:hover { color: #c0392b; background: #fdf3f2; }
    .logout-icon { color: inherit; }

    /* ─── Content ─── */
    .content {
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
