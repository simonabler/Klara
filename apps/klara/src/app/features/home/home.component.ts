import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- Sidebar Navigation -->
      <nav class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-name">Klara</span>
        </div>

        <ul class="nav-list">
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                class="nav-item"
              >
                <span class="nav-icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>

        <div class="sidebar-footer">
          <a routerLink="/settings" routerLinkActive="active" class="nav-item settings-link">
            <span class="nav-icon">⚙</span>
            <span class="nav-label">Einstellungen</span>
          </a>
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">→</span>
            <span class="nav-label">Abmelden</span>
          </button>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <div class="welcome">
          <h1>Guten Tag{{ userName() ? ', ' + userName() : '' }}</h1>
          <p class="subtitle">Was möchten Sie heute dokumentieren?</p>
        </div>

        <div class="card-grid">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" class="feature-card">
              <span class="card-icon">{{ item.icon }}</span>
              <div>
                <div class="card-label">{{ item.label }}</div>
                <div class="card-desc">{{ item.description }}</div>
              </div>
            </a>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background: #f8f8f6;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background: white;
      border-right: 1px solid #eee;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 0;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .sidebar-brand {
      padding: 0 1.25rem 1.5rem;
      border-bottom: 1px solid #f0f0ee;
      margin-bottom: 0.75rem;
    }
    .brand-name {
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #1a1a1a;
    }
    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0 0.75rem;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      text-decoration: none;
      color: #555;
      font-size: 0.9rem;
      transition: background 0.12s, color 0.12s;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .nav-item:hover { background: #f5f5f3; color: #1a1a1a; }
    .nav-item.active { background: #f0f0ee; color: #1a1a1a; font-weight: 500; }
    .nav-icon { font-size: 1rem; width: 20px; text-align: center; }
    .nav-label { flex: 1; }

    .sidebar-footer {
      padding: 0.75rem;
      border-top: 1px solid #f0f0ee;
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      background: none;
      border: none;
      color: #aaa;
      font-size: 0.9rem;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: color 0.12s, background 0.12s;
    }
    .logout-btn:hover { color: #c0392b; background: #fdf3f2; }

    /* ── Main ── */
    .main-content {
      flex: 1;
      padding: 3rem 2.5rem;
      max-width: 860px;
    }
    .welcome { margin-bottom: 2.5rem; }
    .welcome h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 0.4rem; }
    .subtitle { color: #999; margin: 0; font-size: 0.95rem; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .feature-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: white;
      border: 1px solid #eee;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .feature-card:hover {
      border-color: #ccc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .card-icon { font-size: 1.5rem; }
    .card-label { font-weight: 500; font-size: 0.95rem; margin-bottom: 0.2rem; }
    .card-desc { font-size: 0.8rem; color: #aaa; }
  `],
})
export class HomeComponent {
  private readonly authService = inject(AuthService);

  readonly navItems: NavItem[] = [
    { path: '/students', label: 'Schüler', icon: '👤', description: 'Profile, Stammdaten, Eltern' },
    { path: '/classes', label: 'Klassen', icon: '🏫', description: 'Klassen anlegen und zuordnen' },
  ];

  userName(): string {
    const name = this.authService.currentUser()?.displayName ?? '';
    return name.split(' ')[0];
  }

  logout(): void {
    this.authService.logout();
  }
}
