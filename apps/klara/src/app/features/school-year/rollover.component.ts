import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ClassDto,
  isValidSchoolYear,
  nextSchoolYear,
  schoolYearOf,
  suggestPromotedClassName,
} from '@app/domain';
import { ClassService } from '../classes/class.service';
import { SchoolYearService } from './school-year.service';
import { ToastService } from '../../shared/toast/toast.service';

export interface RolloverRow {
  source: ClassDto;
  include: boolean;
  name: string;
  schoolLevel: number | null;
  /** Im Zielschuljahr gibt es schon eine Klasse mit diesem Namen */
  exists: boolean;
}

/**
 * Schuljahreswechsel: Klassen eines Schuljahres mit allen Schüler/innen
 * ins Folgejahr übernehmen. Die alten Klassen bleiben unverändert erhalten.
 */
@Component({
  selector: 'app-rollover',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/app" class="back">← Zurück</a>
        <h1>Schuljahreswechsel</h1>
        <p class="lead">
          Klassen aus <strong>{{ fromYear() }}</strong> mit allen Schülerinnen und Schülern nach
          <strong>{{ toYear() }}</strong> übernehmen. Die bisherigen Klassen mit Notizen und Leistungen bleiben unverändert.
        </p>
      </header>

      @if (loading()) {
        <p class="state">Klassen werden geladen…</p>
      } @else if (rows().length === 0) {
        <p class="state">Im Schuljahr {{ fromYear() }} gibt es keine Klassen.</p>
      } @else {
        <div class="table" role="table" aria-label="Klassen übernehmen">
          <div class="row head" role="row">
            <span role="columnheader">Übernehmen</span>
            <span role="columnheader">{{ fromYear() }}</span>
            <span role="columnheader">Name {{ toYear() }}</span>
            <span role="columnheader">Schulstufe</span>
          </div>
          @for (row of rows(); track row.source.id; let i = $index) {
            <div class="row" role="row" [class.off]="!row.include">
              <span role="cell">
                <input type="checkbox" [checked]="row.include" (change)="update(i, { include: $any($event.target).checked })"
                       [attr.aria-label]="row.source.name + ' übernehmen'" />
              </span>
              <span role="cell" class="source">
                {{ row.source.name }}
                <span class="muted">{{ row.source.studentCount }} Schüler/innen</span>
              </span>
              <span role="cell">
                <input type="text" [value]="row.name" [disabled]="!row.include" maxlength="50"
                       (input)="update(i, { name: $any($event.target).value })"
                       [attr.aria-label]="'Neuer Name für ' + row.source.name" />
                @if (row.include && isTaken(row)) {
                  <span class="warn">Gibt es in {{ toYear() }} schon</span>
                }
              </span>
              <span role="cell">
                <input type="number" min="1" max="13" [value]="row.schoolLevel ?? ''" [disabled]="!row.include"
                       (input)="update(i, { schoolLevel: toLevel($any($event.target).value) })"
                       [attr.aria-label]="'Schulstufe für ' + row.source.name" />
              </span>
            </div>
          }
        </div>

        <p class="hint">
          Abschlussklassen einfach abwählen. Schülerinnen und Schüler, die nicht mitkommen, kannst du danach in der neuen Klasse entfernen.
        </p>

        <div class="actions">
          <a routerLink="/app" class="btn btn-secondary">Abbrechen</a>
          <button class="btn btn-primary" [disabled]="!canSubmit()" (click)="submit()">
            {{ saving() ? 'Wird übernommen…' : submitLabel() }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 760px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { margin-bottom: var(--sp-5); }
    .back { font-size: 13px; color: var(--ink-faint); text-decoration: none; }
    .back:hover { color: var(--navy); }
    h1 { font-family: var(--font-display); font-size: 26px; font-weight: 400; color: var(--navy); margin: var(--sp-2) 0; }
    .lead { font-size: 14px; color: var(--ink-light); line-height: 1.6; margin: 0; }
    .state { font-size: 14px; color: var(--ink-faint); }

    .table { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md); overflow-x: auto; }
    .row {
      display: grid; grid-template-columns: 100px minmax(140px, 1fr) minmax(160px, 1.2fr) 110px;
      gap: var(--sp-3); align-items: center; padding: var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border); min-width: 560px;
    }
    .row:last-child { border-bottom: none; }
    .row.head { font-size: 11px; font-weight: 600; letter-spacing: .6px; text-transform: uppercase; color: var(--ink-faint); }
    .row.off .source { opacity: .55; }
    .row input[type=text], .row input[type=number] { width: 100%; margin: 0; }
    .source { font-weight: 500; color: var(--navy); display: flex; flex-direction: column; }
    .muted { font-size: 12px; font-weight: 400; color: var(--ink-faint); }
    .warn { display: block; font-size: 12px; color: var(--error-fg); margin-top: 4px; }
    .hint { font-size: 13px; color: var(--ink-faint); margin: var(--sp-3) 0 var(--sp-5); line-height: 1.5; }

    .actions { display: flex; justify-content: flex-end; gap: var(--sp-2); }
    .btn {
      display: inline-flex; align-items: center; padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer;
      border: 1.5px solid transparent; text-decoration: none;
    }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-secondary { background: transparent; color: var(--ink); border-color: var(--border); }
  `],
})
export class RolloverComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly classSvc = inject(ClassService);
  private readonly svc      = inject(SchoolYearService);
  private readonly toast    = inject(ToastService);

  readonly loading  = signal(true);
  readonly saving   = signal(false);
  readonly fromYear = signal(schoolYearOf(new Date()));
  readonly toYear   = computed(() => nextSchoolYear(this.fromYear()));
  readonly rows     = signal<RolloverRow[]>([]);
  /** Klassennamen, die es im Zielschuljahr schon gibt (klein geschrieben) */
  private readonly takenNames = signal<ReadonlySet<string>>(new Set());

  readonly selected = computed(() => this.rows().filter(r => r.include));
  readonly canSubmit = computed(() => {
    const sel = this.selected();
    if (this.saving() || sel.length === 0) return false;
    const names = sel.map(r => r.name.trim().toLowerCase());
    return names.every(n => n.length > 0)
      && new Set(names).size === names.length
      && sel.every(r => !this.isTaken(r));
  });
  readonly submitLabel = computed(() => {
    const n = this.selected().length;
    return n === 1 ? '1 Klasse übernehmen' : `${n} Klassen übernehmen`;
  });

  ngOnInit(): void {
    const from = this.route.snapshot.queryParamMap.get('von');
    if (from && isValidSchoolYear(from)) this.fromYear.set(from);

    this.classSvc.getAll().subscribe({
      next: classes => {
        const to = this.toYear();
        this.takenNames.set(new Set(classes.filter(c => c.schoolYear === to).map(c => c.name.trim().toLowerCase())));
        this.rows.set(buildRolloverRows(classes, this.fromYear(), this.takenNames()));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  update(index: number, patch: Partial<RolloverRow>): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  isTaken(row: RolloverRow): boolean {
    return this.takenNames().has(row.name.trim().toLowerCase());
  }

  toLevel(value: string): number | null {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 1 && n <= 13 ? n : null;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.svc.rollover({
      fromSchoolYear: this.fromYear(),
      toSchoolYear: this.toYear(),
      classes: this.selected().map(r => ({
        sourceClassId: r.source.id,
        name: r.name.trim(),
        ...(r.schoolLevel ? { schoolLevel: r.schoolLevel } : {}),
      })),
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.toast.show('success', `${res.created.length} ${res.created.length === 1 ? 'Klasse' : 'Klassen'} nach ${this.toYear()} übernommen`);
        this.router.navigate(['/app']);
      },
      error: err => {
        this.saving.set(false);
        this.toast.show('error', 'Übernahme fehlgeschlagen', err?.error?.message ?? 'Bitte versuche es erneut.');
      },
    });
  }
}

/** Zeilen für alle Klassen des Ausgangsjahres, mit Namens- und Stufenvorschlag */
export function buildRolloverRows(classes: ClassDto[], fromYear: string, takenNames: ReadonlySet<string>): RolloverRow[] {
  return classes
    .filter(c => c.schoolYear === fromYear)
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }))
    .map(source => {
      const name = suggestPromotedClassName(source.name);
      const exists = takenNames.has(name.trim().toLowerCase());
      return {
        source,
        name,
        schoolLevel: source.schoolLevel ? Math.min(source.schoolLevel + 1, 13) : null,
        exists,
        // Schon vorhandene Klassen nicht doppelt anlegen
        include: !exists,
      };
    });
}
