import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetentionYearDto } from '@app/domain';
import { SchoolYearService } from './school-year.service';
import { ToastService } from '../../shared/toast/toast.service';

/**
 * Einstellungen › Aufbewahrung: Frist wählen, fällige Schuljahre sehen und
 * nach ausdrücklicher Bestätigung endgültig löschen.
 */
@Component({
  selector: 'app-retention-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card-row">
        <div class="card-info">
          <label class="card-title" for="retention-select">Daten abgeschlossener Schuljahre aufbewahren</label>
          <div class="card-desc">
            Nach Ablauf der Frist schlägt Klara das Schuljahr zur Löschung vor – gelöscht wird erst nach deiner Bestätigung.
            Die Frist zählt ab dem Schuljahresende (31.08.).
          </div>
        </div>
        <select id="retention-select" class="retention-select"
                [ngModel]="retentionYears()" (ngModelChange)="changeRetention($event)" [disabled]="saving()">
          <option [ngValue]="null">Keine Frist</option>
          @for (y of yearOptions; track y) {
            <option [ngValue]="y">{{ y }} {{ y === 1 ? 'Jahr' : 'Jahre' }}</option>
          }
        </select>
      </div>
    </div>

    @if (retentionYears() !== null) {
      @if (due().length === 0) {
        <p class="none">Kein Schuljahr ist zur Löschung fällig.</p>
      }
      @for (y of due(); track y.schoolYear) {
        <div class="due-card">
          <div class="due-head">
            <span class="due-year">Schuljahr {{ y.schoolYear }}</span>
            <span class="due-since">fällig seit {{ formatDate(y.deletableFrom) }}</span>
          </div>
          <ul class="due-facts">
            <li>{{ y.classes.length }} {{ y.classes.length === 1 ? 'Klasse' : 'Klassen' }}: {{ classNames(y) }}</li>
            <li>{{ y.studentsToDelete }} Schüler/innen werden gelöscht
              @if (y.studentsKept > 0) { – {{ y.studentsKept }} bleiben, weil sie noch in anderen Klassen sind }
            </li>
            <li>{{ y.noteCount }} Notizen, {{ y.assessmentCount }} Leistungen</li>
          </ul>

          @if (confirming() === y.schoolYear) {
            <div class="confirm">
              <p>Das kann nicht rückgängig gemacht werden. Gib zur Bestätigung <strong>{{ y.schoolYear }}</strong> ein:</p>
              <input class="confirm-input" type="text" autocomplete="off"
                     [ngModel]="confirmText()" (ngModelChange)="confirmText.set($event)"
                     [placeholder]="y.schoolYear" [attr.aria-label]="'Schuljahr ' + y.schoolYear + ' bestätigen'" />
              <div class="confirm-actions">
                <button class="btn btn-danger" [disabled]="confirmText().trim() !== y.schoolYear || purging()" (click)="purge(y)">
                  {{ purging() ? 'Wird gelöscht…' : 'Endgültig löschen' }}
                </button>
                <button class="btn btn-secondary" (click)="cancel()">Abbrechen</button>
              </div>
            </div>
          } @else {
            <button class="btn btn-danger-outline" (click)="startConfirm(y.schoolYear)">Schuljahr {{ y.schoolYear }} löschen</button>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .card, .due-card {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md);
      padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-3);
    }
    .card-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-5); }
    .card-info { flex: 1; }
    .card-title { display: block; font-size: 14px; font-weight: 500; color: var(--navy); margin-bottom: 4px; }
    .card-desc { font-size: 13px; color: var(--ink-faint); line-height: 1.5; }
    .retention-select { width: 140px; flex-shrink: 0; margin: 0; }
    .none { font-size: 13px; color: var(--ink-faint); margin: 0 0 var(--sp-3); }

    .due-card { border-color: #E8C9A0; background: #FFFBF5; }
    .due-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); }
    .due-year { font-size: 14px; font-weight: 600; color: var(--navy); }
    .due-since { font-size: 12px; color: #8A6A3A; }
    .due-facts { margin: var(--sp-2) 0 var(--sp-3); padding-left: var(--sp-5); font-size: 13px; color: var(--ink-light); line-height: 1.6; }

    .confirm p { font-size: 13px; color: var(--ink); margin: 0 0 var(--sp-2); }
    .confirm-input { width: 100%; max-width: 200px; margin: 0 0 var(--sp-3); }
    .confirm-actions { display: flex; gap: var(--sp-2); }

    .btn {
      display: inline-flex; align-items: center; gap: var(--sp-2); padding: 8px 16px;
      border-radius: var(--r-sm); font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: 1.5px solid transparent; transition: all .12s;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: var(--ink); border-color: var(--border); }
    .btn-secondary:hover { border-color: var(--navy); }
    .btn-danger-outline { background: transparent; color: #C62828; border-color: #C62828; }
    .btn-danger-outline:hover:not(:disabled) { background: #FEF5F5; }
    .btn-danger { background: #C62828; color: var(--white); border-color: #C62828; }
    .btn-danger:hover:not(:disabled) { background: #a93226; }

    @media (max-width: 600px) {
      .card-row { flex-direction: column; align-items: stretch; }
      .retention-select { width: 100%; }
    }
  `],
})
export class RetentionSettingsComponent implements OnInit {
  private readonly svc   = inject(SchoolYearService);
  private readonly toast = inject(ToastService);

  readonly yearOptions = [1, 2, 3, 5, 10];

  readonly retentionYears = signal<number | null>(null);
  readonly due            = signal<RetentionYearDto[]>([]);
  readonly saving         = signal(false);
  readonly purging        = signal(false);
  readonly confirming     = signal<string | null>(null);
  readonly confirmText    = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.svc.getRetention().subscribe({
      next: o => { this.retentionYears.set(o.retentionYears); this.due.set(o.due); },
    });
  }

  changeRetention(years: number | null): void {
    const previous = this.retentionYears();
    this.retentionYears.set(years);
    this.saving.set(true);
    this.svc.setRetention(years).subscribe({
      next: () => { this.saving.set(false); this.cancel(); this.load(); },
      error: () => {
        this.retentionYears.set(previous);
        this.saving.set(false);
        this.toast.show('error', 'Frist konnte nicht gespeichert werden');
      },
    });
  }

  startConfirm(schoolYear: string): void {
    this.confirming.set(schoolYear);
    this.confirmText.set('');
  }

  cancel(): void {
    this.confirming.set(null);
    this.confirmText.set('');
  }

  purge(year: RetentionYearDto): void {
    if (this.confirmText().trim() !== year.schoolYear || this.purging()) return;
    this.purging.set(true);
    this.svc.purge(year.schoolYear).subscribe({
      next: r => {
        this.purging.set(false);
        this.cancel();
        this.toast.show('success', `Schuljahr ${r.schoolYear} gelöscht`,
          `${r.deletedClasses} Klassen, ${r.deletedStudents} Schüler/innen, ${r.deletedNotes} Notizen, ${r.deletedAssessments} Leistungen`);
        this.load();
      },
      error: err => {
        this.purging.set(false);
        this.toast.show('error', 'Löschen fehlgeschlagen', err?.error?.message ?? 'Bitte versuche es erneut.');
      },
    });
  }

  classNames(y: RetentionYearDto): string {
    return y.classes.map(c => c.name).join(', ');
  }

  /** 'YYYY-MM-DD' → 'TT.MM.JJJJ' */
  formatDate(iso: string): string {
    return iso.split('-').reverse().join('.');
  }
}
