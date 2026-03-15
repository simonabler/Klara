import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { ClassService } from '../classes/class.service';
import { ClassDto } from '@app/domain';

function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear}/${endYear}`;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">

      <!-- ── Begrüßung + Schuljahr-Selektor ── -->
      <div class="dashboard-header">
        <div class="welcome">
          @if (user()?.displayName) {
            <p class="welcome-label">Willkommen zurück,</p>
            <h1>{{ user()!.displayName }}</h1>
          } @else {
            <h1>Willkommen bei klara</h1>
          }
        </div>

        <div class="year-selector">
          <button
            class="year-btn"
            [disabled]="yearIndex() <= 0"
            (click)="prevYear()"
            aria-label="Vorheriges Schuljahr">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="year-label">{{ selectedYear() }}</span>
          <button
            class="year-btn"
            [disabled]="yearIndex() >= availableYears().length - 1"
            (click)="nextYear()"
            aria-label="Nächstes Schuljahr">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Lade-Zustand ── -->
      @if (loading()) {
        <div class="state-placeholder">
          <div class="skeleton-grid">
            @for (_ of [1,2,3]; track $index) {
              <div class="skeleton-card"></div>
            }
          </div>
        </div>
      }

      <!-- ── Klassen-Kacheln ── -->
      @else if (filteredClasses().length > 0) {
        <div class="class-grid">
          @for (cls of filteredClasses(); track cls.id) {
            <button class="class-card" (click)="openBeurteilung(cls)">
              <div class="card-top">
                <span class="class-name">{{ cls.name }}</span>
                @if (cls.openAssessmentCount > 0) {
                  <span class="badge-open">{{ cls.openAssessmentCount }} offen</span>
                }
              </div>
              <div class="card-meta">
                @if (cls.schoolLevel) {
                  <span class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    {{ cls.schoolLevel }}. Schulstufe
                  </span>
                }
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {{ cls.studentCount }}
                  {{ cls.studentCount === 1 ? 'Schüler' : 'Schülerinnen und Schüler' }}
                </span>
              </div>
              <div class="card-footer">
                <span class="card-cta">Zur Beurteilung</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>
          }
        </div>

        <div class="grid-actions">
          <a routerLink="/app/classes/new" class="btn-new-class">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neue Klasse anlegen
          </a>
        </div>
      }

      <!-- ── Empty State ── -->
      @else {
        <div class="empty-state">
          @if (hasAnyClass()) {
            <p class="empty-text">Keine Klassen für {{ selectedYear() }}.</p>
            <div class="grid-actions">
              <a routerLink="/app/classes/new" class="btn-new-class">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Neue Klasse für {{ selectedYear() }} anlegen
              </a>
            </div>
          } @else {
            <!-- Onboarding guide – shown only on first use -->
            <div class="onboarding">
              <p class="onboarding-intro">Willkommen bei klara. Folge diesen drei Schritten um loszulegen:</p>
              <div class="onboarding-steps">

                <a routerLink="/app/students/new" class="onboarding-step">
                  <div class="step-number">1</div>
                  <div class="step-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div class="step-body">
                    <div class="step-title">Schülerinnen und Schüler anlegen</div>
                    <div class="step-desc">Lege zuerst die Profile deiner Schülerinnen und Schüler mit Name, Geburtsdatum und Elterninformationen an.</div>
                  </div>
                  <div class="step-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </a>

                <a routerLink="/app/settings" class="onboarding-step">
                  <div class="step-number">2</div>
                  <div class="step-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                    </svg>
                  </div>
                  <div class="step-body">
                    <div class="step-title">Unterrichtsfächer anlegen</div>
                    <div class="step-desc">Lege in den Einstellungen deine Fächer an (z.B. Mathematik, Deutsch). Diese stehen dann überall zur Auswahl.</div>
                  </div>
                  <div class="step-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </a>

                <a routerLink="/app/classes/new" class="onboarding-step onboarding-step--primary">
                  <div class="step-number step-number--primary">3</div>
                  <div class="step-icon step-icon--primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <div class="step-body">
                    <div class="step-title">Klasse anlegen und Schüler zuweisen</div>
                    <div class="step-desc">Erstelle eine Klasse für {{ selectedYear() }} und weise ihr die angelegten Schülerinnen und Schüler zu.</div>
                  </div>
                  <div class="step-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </a>

              </div>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .dashboard {
      padding: var(--sp-7) var(--sp-6);
      max-width: 960px;
    }

    /* ── Header ── */
    .dashboard-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: var(--sp-6);
      gap: var(--sp-4);
      flex-wrap: wrap;
    }

    .welcome { flex: 1; min-width: 0; }
    .welcome-label { font-size: 13px; color: var(--ink-faint); margin: 0 0 var(--sp-1); }
    h1 {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 400;
      color: var(--navy);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Schuljahr-Selektor ── */
    .year-selector {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: var(--r-md);
      padding: var(--sp-2) var(--sp-3);
      flex-shrink: 0;
    }

    .year-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ink-faint);
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 4px;
      transition: color .15s, background .15s;
    }
    .year-btn:hover:not(:disabled) { color: var(--navy); background: var(--surface); }
    .year-btn:disabled { opacity: 0.3; cursor: default; }

    .year-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--navy);
      min-width: 72px;
      text-align: center;
    }

    /* ── Klassen-Grid ── */
    .class-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--sp-4);
      margin-bottom: var(--sp-5);
    }

    .class-card {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      padding: var(--sp-5);
      box-shadow: var(--sh-sm);
      cursor: pointer;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      transition: box-shadow .15s, transform .15s, border-color .15s;
      font-family: var(--font-body);
    }
    .class-card:hover {
      box-shadow: var(--sh-md);
      transform: translateY(-2px);
      border-color: var(--teal);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-2);
    }

    .class-name {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 400;
      color: var(--navy);
      line-height: 1.1;
    }

    .badge-open {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: var(--warn-bg, #FFF8E1);
      color: var(--warn-fg, #F57F17);
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 6px;
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      font-size: 13px;
      color: var(--ink-faint);
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border);
      margin-top: auto;
    }

    .card-cta {
      font-size: 12px;
      font-weight: 500;
      color: var(--teal);
    }

    /* ── Neue Klasse Button ── */
    .grid-actions { display: flex; }

    .btn-new-class {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      padding: 8px 16px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-light);
      text-decoration: none;
      background: var(--white);
      transition: border-color .15s, color .15s;
    }
    .btn-new-class:hover { border-color: var(--navy); color: var(--navy); }

    /* ── Skeleton ── */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--sp-4);
    }

    .skeleton-card {
      height: 156px;
      border-radius: var(--r-lg);
      background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Empty State ── */
    .empty-state { }

    .empty-text {
      font-size: 14px;
      color: var(--ink-faint);
      margin: 0 0 var(--sp-4);
    }

    /* ── Onboarding Steps ── */
    .onboarding { max-width: 600px; }

    .onboarding-intro {
      font-size: 14px;
      color: var(--ink-faint);
      margin: 0 0 var(--sp-5);
    }

    .onboarding-steps {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .onboarding-step {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      padding: var(--sp-4) var(--sp-5);
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      text-decoration: none;
      transition: box-shadow .15s, transform .15s, border-color .15s;
      cursor: pointer;
    }
    .onboarding-step:hover {
      box-shadow: var(--sh-md);
      transform: translateY(-1px);
      border-color: var(--teal);
    }
    .onboarding-step--primary {
      border-color: var(--navy);
      background: var(--navy);
    }
    .onboarding-step--primary:hover {
      border-color: var(--teal);
      background: #253450;
    }

    .step-number {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--surface);
      border: 1.5px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-faint);
      flex-shrink: 0;
    }
    .step-number--primary {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.25);
      color: rgba(255,255,255,0.8);
    }

    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--r-sm);
      background: var(--light-teal);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--navy);
    }
    .step-icon--primary {
      background: rgba(255,255,255,0.15);
      color: var(--white);
    }

    .step-body { flex: 1; min-width: 0; }
    .step-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 3px;
    }
    .onboarding-step--primary .step-title { color: var(--white); }

    .step-desc {
      font-size: 12px;
      color: var(--ink-faint);
      line-height: 1.5;
    }
    .onboarding-step--primary .step-desc { color: rgba(255,255,255,0.6); }

    .step-arrow {
      color: var(--ink-faint);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    .onboarding-step--primary .step-arrow { color: rgba(255,255,255,0.5); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .dashboard { padding: var(--sp-5) var(--sp-4); }
      .dashboard-header { align-items: flex-start; flex-direction: column; gap: var(--sp-3); }
      h1 { font-size: 26px; white-space: normal; }
      .class-grid, .quick-grid { grid-template-columns: 1fr; }
      .skeleton-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly classService = inject(ClassService);
  private readonly router = inject(Router);

  readonly user = this.authService.currentUser;

  readonly loading = signal(true);
  readonly allClasses = signal<ClassDto[]>([]);

  // Alle vorhandenen Schuljahre + aktuelles, sortiert
  readonly availableYears = computed<string[]>(() => {
    const years = new Set<string>();
    years.add(currentSchoolYear());
    this.allClasses().forEach((c) => { if (c.schoolYear) years.add(c.schoolYear); });
    return [...years].sort().reverse(); // neuestes zuerst
  });

  readonly yearIndex = signal(0);

  readonly selectedYear = computed(() => this.availableYears()[this.yearIndex()] ?? currentSchoolYear());

  readonly filteredClasses = computed(() =>
    this.allClasses().filter((c) => c.schoolYear === this.selectedYear())
  );

  readonly hasAnyClass = computed(() => this.allClasses().length > 0);

  ngOnInit(): void {
    this.classService.getAll().subscribe({
      next: (classes) => {
        this.allClasses.set(classes);
        // Index auf aktuelles Schuljahr setzen
        const idx = this.availableYears().indexOf(currentSchoolYear());
        this.yearIndex.set(idx >= 0 ? idx : 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prevYear(): void {
    if (this.yearIndex() > 0) this.yearIndex.update((i) => i - 1);
  }

  nextYear(): void {
    if (this.yearIndex() < this.availableYears().length - 1) this.yearIndex.update((i) => i + 1);
  }

  openBeurteilung(cls: ClassDto): void {
    this.router.navigate(['/app/beurteilung'], {
      state: { classId: cls.id },
    });
  }
}
