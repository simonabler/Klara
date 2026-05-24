import {
  Component, Input, Output, EventEmitter, OnChanges,
  inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TimetableEntryDto, CreateTimetableEntryDto, UpdateTimetableEntryDto, ClassDto, SubjectDto } from '@app/domain';
import { RepeatType, WeekVariant } from '@app/domain';
import { TimetableService } from './timetable.service';
import { ToastService } from '../../shared/toast/toast.service';
import {
  PERIOD_TIMES, DAY_NAMES_LONG, currentSchoolYear,
} from './week.utils';

const PRESET_COLORS = [
  '#5B8AC0', // Blau
  '#5B9E5B', // Grün
  '#C09040', // Gold
  '#8070C0', // Lila
  '#C07070', // Rot
  '#50A870', // Smaragd
  '#7BAABA', // Teal
  '#C0A040', // Ocker
];

@Component({
  selector: 'app-timetable-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="panel-inner">

      <!-- Header -->
      <div class="panel-header">
        <div class="panel-header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h2 class="panel-title">{{ entry ? 'Stunde bearbeiten' : 'Stunde eintragen' }}</h2>
        <button class="panel-close" (click)="cancelled.emit()" aria-label="Schließen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="panel-body">
        <form [formGroup]="form" (ngSubmit)="save()">

          <!-- Fach -->
          <div class="field">
            <label>Fach *</label>
            <select formControlName="subjectId" [class.invalid]="isInvalid('subjectId')">
              <option value="">— Fach wählen —</option>
              @for (s of subjects; track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
            @if (subjects.length === 0) {
              <span class="field-hint">Noch keine Fächer. In den Einstellungen anlegen.</span>
            }
            @if (isInvalid('subjectId')) {
              <span class="field-error">Pflichtfeld</span>
            }
          </div>

          <!-- Klasse -->
          <div class="field">
            <label>Klasse *</label>
            <select formControlName="classId" [class.invalid]="isInvalid('classId')">
              <option value="">— Klasse wählen —</option>
              @for (cls of classes; track cls.id) {
                <option [value]="cls.id">
                  {{ cls.name }}{{ cls.schoolYear ? ' · ' + cls.schoolYear : '' }}
                </option>
              }
            </select>
            @if (isInvalid('classId')) {
              <span class="field-error">Pflichtfeld</span>
            }
          </div>

          <!-- Tag + Stunde -->
          <div class="field-row">
            <div class="field">
              <label>Tag *</label>
              <select formControlName="dayOfWeek">
                @for (day of dayOptions; track day.value) {
                  <option [value]="day.value">{{ day.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label>Stunde *</label>
              <select formControlName="period">
                @for (p of periodOptions; track p.value) {
                  <option [value]="p.value">{{ p.label }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Raum -->
          <div class="field">
            <label>Raum</label>
            <input type="text" formControlName="room" placeholder="z.B. Zimmer 12">
          </div>

          <!-- Wiederholung -->
          <div class="section-divider">Wiederholung</div>

          <div class="repeat-grid">
            @for (opt of repeatOptions; track opt.value) {
              <button
                type="button"
                class="repeat-card"
                [class.active]="form.get('repeatType')!.value === opt.value"
                (click)="setRepeat(opt.value)">
                <span class="repeat-icon">{{ opt.icon }}</span>
                <span class="repeat-label">{{ opt.label }}</span>
                <span class="repeat-desc">{{ opt.desc }}</span>
              </button>
            }
          </div>

          <!-- A/B-Woche (nur bei BIWEEKLY) -->
          @if (form.get('repeatType')!.value === RepeatType.BIWEEKLY) {
            <div class="field" style="margin-top: var(--sp-3)">
              <label>In welcher Woche?</label>
              <div class="toggle-row">
                @for (opt of weekVariantOptions; track opt.value) {
                  <button
                    type="button"
                    class="toggle-btn"
                    [class.active]="form.get('weekVariant')!.value === opt.value"
                    (click)="form.get('weekVariant')!.setValue(opt.value)">
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Semester (nur bei SEMESTER) -->
          @if (form.get('repeatType')!.value === RepeatType.SEMESTER) {
            <div class="field" style="margin-top: var(--sp-3)">
              <label>Welches Semester?</label>
              <div class="toggle-row">
                <button type="button" class="toggle-btn"
                  [class.active]="form.get('semester')!.value === 1"
                  (click)="form.get('semester')!.setValue(1)">1. Semester</button>
                <button type="button" class="toggle-btn"
                  [class.active]="form.get('semester')!.value === 2"
                  (click)="form.get('semester')!.setValue(2)">2. Semester</button>
              </div>
            </div>
          }

          <!-- Einmaliges Datum (nur bei ONCE) -->
          @if (form.get('repeatType')!.value === RepeatType.ONCE) {
            <div class="field" style="margin-top: var(--sp-3)">
              <label>Datum *</label>
              <input type="date" formControlName="onceDate" [class.invalid]="isInvalid('onceDate')">
              @if (isInvalid('onceDate')) {
                <span class="field-error">Datum ist Pflicht für einmalige Einträge</span>
              }
            </div>
          }

          <!-- Gültigkeitszeitraum -->
          <div class="section-divider">
            <button type="button" class="expand-btn" (click)="showValidity.set(!showValidity())">
              Gültigkeitszeitraum
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round"
                   [style.transform]="showValidity() ? 'rotate(180deg)' : 'rotate(0deg)'"
                   style="transition: transform .15s">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

          @if (showValidity()) {
            <div class="field-row" style="margin-top: var(--sp-3)">
              <div class="field">
                <label>Von</label>
                <input type="date" formControlName="validFrom">
              </div>
              <div class="field">
                <label>Bis</label>
                <input type="date" formControlName="validTo">
              </div>
            </div>
            <p class="field-hint" style="margin-top: var(--sp-1)">
              Leer lassen für das gesamte Schuljahr.
            </p>
          }

          <!-- Farbe -->
          <div class="section-divider">Farbe</div>
          <div class="color-row">
            @for (c of presetColors; track c) {
              <button
                type="button"
                class="color-dot"
                [style.background]="c"
                [class.selected]="form.get('color')!.value === c"
                (click)="form.get('color')!.setValue(c)"
                [title]="c">
              </button>
            }
          </div>

          <!-- Schuljahr (hidden, wird aus parent gesetzt) -->
          <input type="hidden" formControlName="schoolYear">

        </form>
      </div>

      <!-- Footer -->
      <div class="panel-footer">
        @if (entry) {
          <button class="btn btn-danger-ghost" (click)="delete()" [disabled]="deleting()">
            {{ deleting() ? 'Löschen …' : 'Löschen' }}
          </button>
        }
        <div class="footer-actions">
          <button class="btn btn-ghost" (click)="cancelled.emit()">Abbrechen</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Speichern …' : 'Speichern' }}
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .panel-inner { display: flex; flex-direction: column; height: 100%; }

    /* ── Header ── */
    .panel-header {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: var(--sp-5);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .panel-header-icon {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      background: var(--info-bg);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .panel-title { font-size: 15px; font-weight: 600; color: var(--navy); flex: 1; margin: 0; }
    .panel-close {
      width: 30px; height: 30px; border: none; background: var(--surface);
      border-radius: var(--r-sm); cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: var(--ink-light); transition: background .12s;
    }
    .panel-close:hover { background: var(--border); }

    /* ── Body ── */
    .panel-body { flex: 1; overflow-y: auto; padding: var(--sp-5); }

    /* ── Fields ── */
    .field { margin-bottom: var(--sp-4); }
    .field label {
      display: block; font-size: 13px; font-weight: 500;
      color: var(--ink); margin-bottom: var(--sp-2);
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
    .field-hint { font-size: 12px; color: var(--ink-faint); margin-top: 4px; display: block; }
    .field-error { font-size: 12px; color: var(--error-fg); margin-top: 4px; display: block; }
    input.invalid, select.invalid { border-color: var(--error-fg) !important; }

    /* ── Section divider ── */
    .section-divider {
      font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--ink-faint);
      display: flex; align-items: center; gap: var(--sp-3);
      margin: var(--sp-5) 0 var(--sp-3);
    }
    .section-divider::before { content: ''; flex: 1; height: 1px; background: var(--border); }
    .expand-btn {
      display: flex; align-items: center; gap: var(--sp-2);
      background: none; border: none; cursor: pointer;
      font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--ink-faint);
    }
    .expand-btn:hover { color: var(--ink); }

    /* ── Repeat cards ── */
    .repeat-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--sp-2);
    }
    .repeat-card {
      border: 1.5px solid var(--border); border-radius: var(--r-sm);
      padding: var(--sp-3); cursor: pointer;
      background: var(--white); text-align: center;
      transition: all .12s; display: flex; flex-direction: column;
      align-items: center; gap: 3px; font-family: var(--font-body);
    }
    .repeat-card:hover { border-color: var(--light-teal); background: var(--surface); }
    .repeat-card.active { border-color: var(--teal); background: #EEF6F9; }
    .repeat-icon { font-size: 18px; line-height: 1; }
    .repeat-label { font-size: 12px; font-weight: 600; color: var(--ink); }
    .repeat-desc { font-size: 11px; color: var(--ink-faint); }

    /* ── Toggle row (A/B, Semester) ── */
    .toggle-row { display: flex; gap: var(--sp-2); }
    .toggle-btn {
      flex: 1; padding: var(--sp-2);
      border: 1.5px solid var(--border); border-radius: var(--r-sm);
      background: var(--white); cursor: pointer; font-family: var(--font-body);
      font-size: 13px; font-weight: 500; color: var(--ink-light);
      transition: all .12s;
    }
    .toggle-btn:hover { border-color: var(--light-teal); }
    .toggle-btn.active { border-color: var(--teal); background: #EEF6F9; color: var(--navy); }

    /* ── Color dots ── */
    .color-row { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
    .color-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2.5px solid transparent; cursor: pointer;
      transition: all .12s; outline: none;
    }
    .color-dot:hover { transform: scale(1.15); }
    .color-dot.selected { border-color: var(--ink); transform: scale(1.15); }

    /* ── Footer ── */
    .panel-footer {
      padding: var(--sp-4) var(--sp-5);
      border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; gap: var(--sp-3);
    }
    .footer-actions { display: flex; gap: var(--sp-2); margin-left: auto; }

    .btn {
      display: inline-flex; align-items: center; gap: var(--sp-2);
      padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .12s;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:hover:not(:disabled) { background: #243350; box-shadow: var(--sh-md); }
    .btn-ghost { background: transparent; color: var(--navy); border: 1.5px solid var(--border); }
    .btn-ghost:hover:not(:disabled) { border-color: var(--navy); background: var(--surface); }
    .btn-danger-ghost { background: transparent; color: var(--error-fg); border: 1.5px solid transparent; padding-left: var(--sp-2); }
    .btn-danger-ghost:hover:not(:disabled) { border-color: var(--error-fg); background: var(--error-bg); }
  `],
})
export class TimetableEntryFormComponent implements OnChanges {
  @Input() entry:       TimetableEntryDto | null = null;
  @Input() prefillSlot: { day: number; period: number } | null = null;
  @Input() schoolYear:  string = currentSchoolYear();
  @Input() classes:     ClassDto[]   = [];
  @Input() subjects:    SubjectDto[] = [];

  @Output() saved     = new EventEmitter<TimetableEntryDto>();
  @Output() deleted   = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly svc   = inject(TimetableService);
  private readonly toast = inject(ToastService);
  private readonly fb    = inject(FormBuilder);

  readonly saving    = signal(false);
  readonly deleting  = signal(false);
  readonly showValidity = signal(false);

  readonly RepeatType   = RepeatType;
  readonly presetColors = PRESET_COLORS;

  readonly dayOptions = Object.entries(DAY_NAMES_LONG).map(([v, l]) => ({
    value: Number(v), label: l,
  }));

  readonly periodOptions = Object.entries(PERIOD_TIMES).map(([v, t]) => ({
    value: Number(v), label: `${v}. Stunde (${t})`,
  }));

  readonly repeatOptions = [
    { value: RepeatType.WEEKLY,   icon: '🔁', label: 'Wöchentlich',   desc: 'Jede Woche' },
    { value: RepeatType.BIWEEKLY, icon: '🔄', label: '2-wöchentlich', desc: 'A/B-Rhythmus' },
    { value: RepeatType.SEMESTER, icon: '📅', label: 'Halbjährlich',  desc: '1. oder 2. Sem.' },
    { value: RepeatType.ONCE,     icon: '📌', label: 'Einmalig',      desc: 'Nur dieser Termin' },
  ];

  readonly weekVariantOptions = [
    { value: WeekVariant.A,    label: 'Woche A' },
    { value: WeekVariant.B,    label: 'Woche B' },
    { value: WeekVariant.BOTH, label: 'Beide' },
  ];

  readonly form = this.fb.group({
    subjectId:   ['', Validators.required],
    classId:     ['', Validators.required],
    dayOfWeek:   [1],
    period:      [1],
    room:        [''],
    repeatType:  [RepeatType.WEEKLY],
    weekVariant: [WeekVariant.BOTH],
    semester:    [1],
    onceDate:    [''],
    validFrom:   [''],
    validTo:     [''],
    color:       [PRESET_COLORS[0]],
    schoolYear:  [this.schoolYear],
  });

  ngOnChanges(): void {
    if (this.entry) {
      this.form.patchValue({
        subjectId:   this.entry.subjectId,
        classId:     this.entry.classId,
        dayOfWeek:   this.entry.dayOfWeek,
        period:      this.entry.period,
        room:        this.entry.room ?? '',
        repeatType:  this.entry.repeatType,
        weekVariant: this.entry.weekVariant ?? WeekVariant.BOTH,
        semester:    this.entry.semester ?? 1,
        onceDate:    this.entry.onceDate ?? '',
        validFrom:   this.entry.validFrom ?? '',
        validTo:     this.entry.validTo ?? '',
        color:       this.entry.color ?? PRESET_COLORS[0],
        schoolYear:  this.schoolYear,
      });
      this.showValidity.set(!!(this.entry.validFrom || this.entry.validTo));
    } else {
      this.form.reset({
        dayOfWeek:   this.prefillSlot?.day    ?? 1,
        period:      this.prefillSlot?.period ?? 1,
        repeatType:  RepeatType.WEEKLY,
        weekVariant: WeekVariant.BOTH,
        semester:    1,
        color:       PRESET_COLORS[0],
        schoolYear:  this.schoolYear,
      });
      this.showValidity.set(false);
    }
  }

  setRepeat(value: RepeatType): void {
    this.form.get('repeatType')!.setValue(value);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  save(): void {
    this.form.markAllAsTouched();

    // Extra-Validierung für ONCE
    if (this.form.get('repeatType')!.value === RepeatType.ONCE
        && !this.form.get('onceDate')!.value) {
      return;
    }

    if (this.form.invalid) return;

    this.saving.set(true);
    const raw = this.form.value;
    const dto: CreateTimetableEntryDto = {
      subjectId:   raw.subjectId!,
      classId:     raw.classId!,
      dayOfWeek:   Number(raw.dayOfWeek),
      period:      Number(raw.period),
      room:        raw.room || undefined,
      repeatType:  raw.repeatType as RepeatType,
      weekVariant: raw.repeatType === RepeatType.BIWEEKLY
                     ? (raw.weekVariant as WeekVariant)
                     : undefined,
      semester:    raw.repeatType === RepeatType.SEMESTER
                     ? Number(raw.semester)
                     : undefined,
      onceDate:    raw.repeatType === RepeatType.ONCE
                     ? (raw.onceDate || undefined)
                     : undefined,
      validFrom:   raw.validFrom || undefined,
      validTo:     raw.validTo   || undefined,
      color:       raw.color     || undefined,
      schoolYear:  this.schoolYear,
    };

    const req$ = this.entry
      ? this.svc.update(this.entry.id, dto)
      : this.svc.create(dto);

    req$.subscribe({
      next:  e  => { this.saving.set(false); this.saved.emit(e); },
      error: () => { this.saving.set(false); this.toast.show('error', 'Fehler beim Speichern', 'Bitte versuche es erneut.'); },
    });
  }

  delete(): void {
    if (!this.entry) return;
    this.deleting.set(true);
    this.svc.remove(this.entry.id).subscribe({
      next:  () => { this.deleting.set(false); this.deleted.emit(this.entry!.id); },
      error: () => { this.deleting.set(false); this.toast.show('error', 'Fehler beim Löschen'); },
    });
  }
}
