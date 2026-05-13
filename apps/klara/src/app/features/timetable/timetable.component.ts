import {
  Component, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimetableEntryDto, ClassDto, SubjectDto } from '@app/domain';
import { RepeatType } from '@app/domain';
import { TimetableService } from './timetable.service';
import { TimetableEntryFormComponent } from './timetable-entry-form.component';
import { ClassService } from '../classes/class.service';
import { SubjectService } from '../classes/reference-data.service';
import {
  WeekInfo, buildWeekInfo, getMondayOfWeek, dateOfDay, isToday,
  filterEntriesForWeek, repeatLabel, hexToFaint,
  currentSchoolYear, PERIOD_TIMES, DAY_NAMES,
} from './week.utils';

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, RouterLink, TimetableEntryFormComponent],
  template: `
    <div class="tt-page">

      <!-- ══════════════════════════════════════════════════════════════
           ZUSTAND 1 – ONBOARDING
           Noch keine Klassen vorhanden → 3-Schritte-Führung
      ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && classes().length === 0) {
        <div class="onboarding-page">
          <div class="onboarding-greeting">
            <p class="welcome-label">Willkommen bei klara</p>
            <h1>Drei Schritte zum ersten Stundenplan</h1>
          </div>

          <p class="onboarding-intro">
            Bevor du deinen Stundenplan einrichten kannst, brauchst du Schülerinnen und Schüler,
            Unterrichtsfächer und mindestens eine Klasse.
          </p>

          <div class="onboarding-steps">

            <a routerLink="/app/students/new" class="step-card">
              <div class="step-num">1</div>
              <div class="step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="step-body">
                <div class="step-title">Schülerinnen und Schüler anlegen</div>
                <div class="step-desc">Name, Geburtsdatum, Elterninformationen</div>
              </div>
              <svg class="step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>

            <a routerLink="/app/settings" class="step-card">
              <div class="step-num">2</div>
              <div class="step-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
              </div>
              <div class="step-body">
                <div class="step-title">Unterrichtsfächer anlegen</div>
                <div class="step-desc">In den Einstellungen: Mathematik, Deutsch, …</div>
              </div>
              <svg class="step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>

            <a routerLink="/app/classes/new" class="step-card step-card--primary">
              <div class="step-num step-num--primary">3</div>
              <div class="step-icon step-icon--primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="step-body">
                <div class="step-title">Klasse anlegen und Stundenplan einrichten</div>
                <div class="step-desc">Klasse erstellen, Schüler zuweisen, erste Stunden eintragen</div>
              </div>
              <svg class="step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>

          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════
           ZUSTAND 2 + 3 – STUNDENPLAN (leer oder befüllt)
           Klassen vorhanden → Grid immer sichtbar
      ══════════════════════════════════════════════════════════════ -->
      @else if (!loading() && classes().length > 0) {

        <!-- ── Top Bar ── -->
        <div class="tt-topbar">
          <div class="tt-nav-group">
            <button class="week-nav-btn" (click)="prevWeek()" aria-label="Vorherige Woche">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="week-label">{{ weekInfo().label }}</span>
            <button class="week-nav-btn" (click)="nextWeek()" aria-label="Nächste Woche">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="today-btn" (click)="goToToday()">Heute</button>
          </div>

          @if (hasBiweekly()) {
            <div class="week-type-badge" [class.is-a]="weekInfo().isWeekA" [class.is-b]="!weekInfo().isWeekA">
              {{ weekInfo().isWeekA ? 'Woche A' : 'Woche B' }}
            </div>
          }

          <div class="tt-topbar-spacer"></div>

          <select class="year-select" [value]="selectedYear()" (change)="onYearChange($event)">
            @for (y of availableYears; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>

          <button class="btn btn-primary" (click)="openPanel()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Stunde eintragen
          </button>
        </div>

        <!-- ── Grid (immer sichtbar, leer oder befüllt) ── -->
        <div class="tt-wrap">
          <div class="tt-grid">

            <div class="tt-corner"></div>
            @for (day of days; track day) {
              <div class="tt-day-header" [class.tt-today-col]="isDayToday(day)">
                <div class="tt-day-name">{{ DAY_NAMES[day] }}</div>
                <div class="tt-day-date" [class.tt-today-date]="isDayToday(day)">
                  {{ getDayDate(day) | date:'d' }}
                </div>
              </div>
            }

            @for (period of periods(); track period) {
              <div class="tt-time">
                <span class="tt-period-nr">{{ period }}.</span>
                <span class="tt-period-time">{{ PERIOD_TIMES[period] }}</span>
              </div>

              @for (day of days; track day) {
                <div class="tt-cell" [class.tt-today-col]="isDayToday(day)">
                  @if (isDayToday(day)) {
                    <div class="tt-today-marker"></div>
                  }

                  @for (entry of entriesForSlot(day, period); track entry.id) {
                    <div
                      class="tt-lesson"
                      [style.border-left-color]="entry.color ?? '#7BAABA'"
                      [style.background]="hexToFaint(entry.color)"
                      (click)="openEdit(entry)"
                      role="button"
                      [attr.aria-label]="entry.subjectName + ', ' + entry.className">
                      <span class="tt-lesson-repeat">{{ getRepeatLabel(entry) }}</span>
                      <span class="tt-lesson-subject">{{ entry.subjectName }}</span>
                      <span class="tt-lesson-class">{{ entry.className }}</span>
                      @if (entry.room) {
                        <span class="tt-lesson-room">{{ entry.room }}</span>
                      }
                    </div>
                  }

                  @if (entriesForSlot(day, period).length === 0) {
                    <button
                      class="tt-add-btn"
                      (click)="openPanel(day, period)"
                      [attr.aria-label]="'Stunde eintragen ' + DAY_NAMES[day] + ' ' + period">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  }
                </div>
              }
            }

          </div><!-- /tt-grid -->

          @if (allEntries().length > 0) {
            <div class="tt-legend">
              <span class="legend-label">Wiederholung:</span>
              <span class="legend-chip chip-teal">wöchentl.</span>
              <span class="legend-chip chip-teal">2-wöchentl.</span>
              <span class="legend-chip chip-sand">1./2. Sem.</span>
              <span class="legend-chip chip-ghost">einmalig</span>
            </div>
          }

        </div><!-- /tt-wrap -->
      }

      <!-- ── Loading ── -->
      @else if (loading()) {
        <div class="tt-loading">
          <div class="skeleton-grid">
            @for (_ of [1,2,3,4,5,6]; track $index) {
              <div class="skeleton-card"></div>
            }
          </div>
        </div>
      }

    </div><!-- /tt-page -->

    <!-- ── Overlay ── -->
    @if (panelOpen()) {
      <div class="tt-overlay" (click)="closePanel()"></div>
    }

    <!-- ── Slide-in Panel ── -->
    <div class="tt-panel" [class.open]="panelOpen()">
      <app-timetable-entry-form
        [entry]="editEntry()"
        [prefillSlot]="prefillSlot()"
        [schoolYear]="selectedYear()"
        [classes]="classes()"
        [subjects]="subjects()"
        (saved)="onSaved($event)"
        (deleted)="onDeleted($event)"
        (cancelled)="closePanel()"
      />
    </div>
  `,
  styles: [`
    .tt-page {
      padding: var(--sp-5) var(--sp-6);
    }

    /* ══════════════════════════════════════
       ONBOARDING (Zustand 1)
    ══════════════════════════════════════ */
    .onboarding-page {
      max-width: 560px;
      padding-top: var(--sp-3);
    }

    .onboarding-greeting { margin-bottom: var(--sp-5); }
    .welcome-label { font-size: 13px; color: var(--ink-faint); margin-bottom: var(--sp-1); }
    h1 {
      font-family: var(--font-display);
      font-size: 28px; font-weight: 400; color: var(--navy); margin: 0; line-height: 1.2;
    }

    .onboarding-intro {
      font-size: 14px; color: var(--ink-faint); line-height: 1.7;
      margin-bottom: var(--sp-5);
    }

    .onboarding-steps { display: flex; flex-direction: column; gap: var(--sp-3); }

    .step-card {
      display: flex; align-items: center; gap: var(--sp-4);
      padding: var(--sp-4) var(--sp-5);
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      text-decoration: none; cursor: pointer;
      transition: box-shadow .15s, transform .15s, border-color .15s;
    }
    .step-card:hover {
      box-shadow: var(--sh-md); transform: translateY(-1px); border-color: var(--teal);
    }
    .step-card--primary {
      border-color: var(--navy); background: var(--navy);
    }
    .step-card--primary:hover { background: #243350; border-color: var(--teal); }

    .step-num {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--surface); border: 1.5px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: var(--ink-faint); flex-shrink: 0;
    }
    .step-num--primary {
      background: rgba(255,255,255,.15); border-color: rgba(255,255,255,.25); color: rgba(255,255,255,.8);
    }

    .step-icon {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--light-teal);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--navy);
    }
    .step-icon--primary { background: rgba(255,255,255,.15); color: var(--white); }

    .step-body { flex: 1; min-width: 0; }
    .step-title { font-size: 14px; font-weight: 500; color: var(--navy); margin-bottom: 2px; }
    .step-card--primary .step-title { color: var(--white); }
    .step-desc { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }
    .step-card--primary .step-desc { color: rgba(255,255,255,.6); }

    .step-arrow { color: var(--ink-faint); flex-shrink: 0; }
    .step-card--primary .step-arrow { color: rgba(255,255,255,.5); }

    /* ══════════════════════════════════════
       TOP BAR (Zustand 2 + 3)
    ══════════════════════════════════════ */
    .tt-topbar {
      display: flex; align-items: center; gap: var(--sp-3);
      margin-bottom: var(--sp-5); flex-wrap: wrap;
    }
    .tt-nav-group { display: flex; align-items: center; gap: var(--sp-2); }
    .week-nav-btn {
      width: 30px; height: 30px; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: var(--white);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: var(--ink-light); transition: all .12s;
    }
    .week-nav-btn:hover { border-color: var(--teal); color: var(--teal); }
    .week-label {
      font-size: 14px; font-weight: 500; color: var(--ink);
      padding: 0 var(--sp-3); min-width: 200px; text-align: center;
    }
    .today-btn {
      padding: 5px 12px; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: var(--white);
      font-family: var(--font-body); font-size: 12px; font-weight: 500;
      color: var(--ink-light); cursor: pointer; transition: all .12s;
    }
    .today-btn:hover { border-color: var(--navy); color: var(--navy); }

    .week-type-badge {
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .week-type-badge.is-a { background: var(--light-teal); color: var(--navy); }
    .week-type-badge.is-b { background: #EDD9C4; color: #7A5A3A; }

    .tt-topbar-spacer { flex: 1; }

    .year-select {
      width: auto; min-width: 100px;
      padding: 7px 12px; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: var(--white);
      font-family: var(--font-body); font-size: 13px; color: var(--ink); cursor: pointer;
    }

    .btn {
      display: inline-flex; align-items: center; gap: var(--sp-2);
      padding: 9px 16px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .12s;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:hover { background: #243350; box-shadow: var(--sh-md); }

    /* ══════════════════════════════════════
       GRID
    ══════════════════════════════════════ */
    .tt-wrap {
      background: var(--white);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-sm);
      overflow: hidden; 
    }

    .tt-grid {
      display: grid;
      grid-template-columns: 56px repeat(5, 1fr);
      overflow-x: auto; min-width: 600px;
    }

    .tt-corner {
      background: var(--surface);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    .tt-day-header {
      padding: var(--sp-3) var(--sp-2);
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
      text-align: center;
    }
    .tt-day-header:last-child { border-right: none; }
    .tt-day-header.tt-today-col { background: rgba(123,170,186,.07); }
    .tt-day-name {
      font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--ink-faint);
    }
    .tt-day-date {
      font-size: 20px; font-weight: 300; color: var(--navy); line-height: 1.3; margin-top: 2px;
    }
    .tt-day-date.tt-today-date { color: var(--teal); font-weight: 500; }

    .tt-time {
      border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
      padding: var(--sp-2); height: 86px;
      display: flex; flex-direction: column; align-items: flex-end;
      justify-content: flex-start; padding-top: var(--sp-2); background: var(--surface);
    }
    .tt-period-nr   { font-size: 11px; font-weight: 600; color: var(--ink-faint); }
    .tt-period-time { font-size: 10px; color: var(--ink-faint); opacity: .7; margin-top: 2px; }

    .tt-cell {
      border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
      height: 86px; padding: var(--sp-1); position: relative;
    }
    .tt-cell:last-child { border-right: none; }
    .tt-cell.tt-today-col { background: rgba(123,170,186,.04); }

    .tt-today-marker {
      position: absolute; top: 0; left: 0; right: 0;
      height: 2px; background: var(--teal);
    }

    .tt-lesson {
      border-radius: var(--r-sm); padding: var(--sp-2);
      height: calc(100% - 4px); margin: 2px;
      cursor: pointer; transition: box-shadow .12s, transform .12s;
      display: flex; flex-direction: column;
      border-left: 3px solid var(--teal);
      position: relative; overflow: hidden;
    }
    .tt-lesson:hover { box-shadow: var(--sh-md); transform: translateY(-1px); }
    .tt-lesson-repeat {
      font-size: 9px; font-weight: 600; color: inherit; opacity: .6;
      position: absolute; top: 3px; right: 4px; letter-spacing: .3px;
    }
    .tt-lesson-subject { font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--ink); }
    .tt-lesson-class   { font-size: 11px; color: var(--ink-light); margin-top: 1px; }
    .tt-lesson-room    { font-size: 10px; color: var(--ink-faint); margin-top: auto; }

    .tt-add-btn {
      width: 100%; height: 100%;
      border: 1.5px dashed transparent; border-radius: var(--r-sm);
      background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-faint); transition: all .12s; opacity: 0;
    }
    .tt-cell:hover .tt-add-btn {
      opacity: 1; border-color: var(--light-teal); color: var(--teal);
    }

    .tt-legend {
      display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2);
      padding: var(--sp-3) var(--sp-5);
      border-top: 1px solid var(--border); background: var(--surface);
    }
    .legend-label { font-size: 11px; color: var(--ink-faint); margin-right: var(--sp-1); }
    .legend-chip {
      display: inline-flex; align-items: center;
      padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500;
    }
    .chip-teal  { background: var(--light-teal); color: var(--navy); }
    .chip-sand  { background: #EDD9C4; color: #7A5A3A; }
    .chip-ghost { background: var(--surface); color: var(--ink-light); border: 1px solid var(--border); }

    /* ══════════════════════════════════════
       LOADING
    ══════════════════════════════════════ */
    .tt-loading { padding: var(--sp-5) 0; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-3); }
    .skeleton-card {
      height: 80px; border-radius: var(--r-md);
      background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ══════════════════════════════════════
       OVERLAY + PANEL
    ══════════════════════════════════════ */
    .tt-overlay {
      position: fixed; inset: 0; background: rgba(28,43,58,.35); z-index: 199;
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .tt-panel {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 420px; max-width: 100vw;
      background: var(--white); box-shadow: var(--sh-lg); z-index: 200;
      transform: translateX(100%); transition: transform .25s ease;
    }
    .tt-panel.open { transform: translateX(0); }

    /* ══════════════════════════════════════
       RESPONSIVE
    ══════════════════════════════════════ */
    @media (max-width: 768px) {
      .tt-page { padding: var(--sp-4) var(--sp-3); }
      .onboarding-page { padding-top: 0; }
      h1 { font-size: 22px; }
      .week-label { min-width: 0; font-size: 13px; }
      .tt-panel { width: 100vw; }
      .tt-grid { min-width: 500px; }
      .tt-day-date { font-size: 16px; }
    }
  `],
})
export class TimetableComponent implements OnInit {
  private readonly timetableSvc = inject(TimetableService);
  private readonly classSvc     = inject(ClassService);
  private readonly subjectSvc   = inject(SubjectService);

  // ── State ──────────────────────────────────────────────────────────────
  readonly loading       = signal(true);
  readonly allEntries    = signal<TimetableEntryDto[]>([]);
  readonly classes       = signal<ClassDto[]>([]);
  readonly subjects      = signal<SubjectDto[]>([]);
  readonly currentMonday = signal(getMondayOfWeek());
  readonly selectedYear  = signal(currentSchoolYear());
  readonly panelOpen     = signal(false);
  readonly editEntry     = signal<TimetableEntryDto | null>(null);
  readonly prefillSlot   = signal<{ day: number; period: number } | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────
  readonly weekInfo = computed<WeekInfo>(() => buildWeekInfo(this.currentMonday()));

  readonly visibleEntries = computed(() =>
    filterEntriesForWeek(this.allEntries(), this.weekInfo())
  );

  readonly periods = computed<number[]>(() => {
    const max = Math.max(6, ...this.allEntries().map(e => e.period));
    return Array.from({ length: max }, (_, i) => i + 1);
  });

  readonly hasBiweekly = computed(() =>
    this.allEntries().some(e => e.repeatType === RepeatType.BIWEEKLY)
  );

  // ── Constants ──────────────────────────────────────────────────────────
  readonly DAY_NAMES    = DAY_NAMES;
  readonly PERIOD_TIMES = PERIOD_TIMES;
  readonly days         = [1, 2, 3, 4, 5] as const;
  readonly availableYears = this.buildYearOptions();

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Klassen und Fächer parallel laden – bestimmen welcher Zustand gezeigt wird
    this.classSvc.getAll().subscribe(c => {
      this.classes.set(c);
      // Stundenplan erst laden wenn Klassen bekannt (vermeidet Flicker)
      this.load();
    });
    this.subjectSvc.getAll().subscribe(s => this.subjects.set(s));
  }

  private load(): void {
    this.loading.set(true);
    this.timetableSvc.getAll(this.selectedYear()).subscribe({
      next:  e  => { this.allEntries.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Week navigation ────────────────────────────────────────────────────
  prevWeek(): void { this.currentMonday.update(d => addDays(d, -7)); }
  nextWeek(): void { this.currentMonday.update(d => addDays(d,  7)); }
  goToToday(): void { this.currentMonday.set(getMondayOfWeek()); }

  onYearChange(event: Event): void {
    this.selectedYear.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  // ── Grid helpers ───────────────────────────────────────────────────────
  getDayDate(day: number): Date {
    return dateOfDay(this.currentMonday(), day);
  }

  isDayToday(day: number): boolean {
    return isToday(this.getDayDate(day));
  }

  entriesForSlot(day: number, period: number): TimetableEntryDto[] {
    return this.visibleEntries().filter(e => e.dayOfWeek === day && e.period === period);
  }

  getRepeatLabel(entry: TimetableEntryDto): string {
    return repeatLabel(entry.repeatType, entry.weekVariant, entry.semester);
  }

  hexToFaint = hexToFaint;

  // ── Panel ──────────────────────────────────────────────────────────────
  openPanel(day?: number, period?: number): void {
    this.editEntry.set(null);
    this.prefillSlot.set(day && period ? { day, period } : null);
    this.panelOpen.set(true);
  }

  openEdit(entry: TimetableEntryDto): void {
    this.editEntry.set(entry);
    this.prefillSlot.set(null);
    this.panelOpen.set(true);
  }

  closePanel(): void { this.panelOpen.set(false); }

  onSaved(entry: TimetableEntryDto): void {
    const list = this.allEntries();
    const idx  = list.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      this.allEntries.set([...list.slice(0, idx), entry, ...list.slice(idx + 1)]);
    } else {
      this.allEntries.set([...list, entry]);
    }
    this.closePanel();
  }

  onDeleted(id: string): void {
    this.allEntries.update(list => list.filter(e => e.id !== id));
    this.closePanel();
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private buildYearOptions(): string[] {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const curr  = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    const years: string[] = [];
    for (let offset = 1; offset >= -3; offset--) {
      const s = curr + offset;
      years.push(`${s}/${String(s + 1).slice(-2)}`);
    }
    return years;
  }
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
