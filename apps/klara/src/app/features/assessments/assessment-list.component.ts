import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssessmentService } from './assessment.service';
import { ClassService } from '../classes/class.service';
import { SubjectService } from '../classes/reference-data.service';
import { AssessmentEventDto, ClassDto, SubjectDto } from '@app/domain';
import { AssessmentEventType } from '@app/domain';

@Component({
  selector: 'app-assessment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Leistungen</h1>
          <p class="subtitle">Überprüfungen, Schularbeiten und mündliche Mitarbeit</p>
        </div>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neu anlegen
        </button>
      </header>

      <!-- Anlegen-Formular (inline) -->
      @if (showForm()) {
        <div class="create-panel">
          <h2 class="panel-title">Neues Leistungsereignis</h2>
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="field-row">
              <div class="field field--grow">
                <label>Bezeichnung *</label>
                <input type="text" formControlName="title" placeholder="z.B. Schularbeit Mathematik 1"
                       [class.invalid]="isInvalid('title')" />
                @if (isInvalid('title')) { <span class="field-error">Bezeichnung ist erforderlich</span> }
              </div>
              <div class="field">
                <label>Typ *</label>
                <select formControlName="type">
                  @for (t of eventTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Datum *</label>
                <input type="date" formControlName="date" [class.invalid]="isInvalid('date')" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Klasse</label>
                <select formControlName="classId">
                  <option value="">— keine —</option>
                  @for (cls of classes(); track cls.id) {
                    <option [value]="cls.id">{{ cls.name }}{{ cls.schoolYear ? ' · ' + cls.schoolYear : '' }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Fach</label>
                <select formControlName="subjectId">
                  <option value="">— keines —</option>
                  @for (s of subjects(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>
            </div>
            @if (serverError()) { <p class="server-error">{{ serverError() }}</p> }
            <div class="panel-actions">
              <button type="button" class="btn btn-ghost" (click)="showForm.set(false)">Abbrechen</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ saving() ? 'Wird angelegt…' : 'Anlegen' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Filter -->
      <div class="filter-bar">
        <select [ngModel]="filterClassId()" (ngModelChange)="filterClassId.set($event)">
          <option value="">Alle Klassen</option>
          @for (cls of classes(); track cls.id) {
            <option [value]="cls.id">{{ cls.name }}{{ cls.schoolYear ? ' · ' + cls.schoolYear : '' }}</option>
          }
        </select>
        <select [ngModel]="filterSubjectId()" (ngModelChange)="filterSubjectId.set($event)">
          <option value="">Alle Fächer</option>
          @for (s of subjects(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      </div>

      <!-- Liste -->
      @if (loading()) {
        <p class="state-msg">Lade Leistungen…</p>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <p>Noch keine Leistungsereignisse angelegt.</p>
          <p class="empty-hint">Klicke auf „Neu anlegen" um die erste Überprüfung zu erfassen.</p>
        </div>
      } @else {
        <div class="event-list">
          @for (event of filtered(); track event.id) {
            <a class="event-card" [routerLink]="['/app/assessments', event.id]">
              <div class="event-main">
                <div class="event-type-badge" [attr.data-type]="event.type">{{ typeLabel(event.type) }}</div>
                <div class="event-info">
                  <span class="event-title">{{ event.title }}</span>
                  <div class="event-meta">
                    @if (event.className) { <span>{{ event.className }}</span> }
                    @if (event.subjectName) { <span>{{ event.subjectName }}</span> }
                    <span>{{ event.date | date:'dd.MM.yyyy' }}</span>
                  </div>
                </div>
              </div>
              <div class="event-stats">
                <span class="stat">{{ event.results.length }}</span>
                <span class="stat-label">Schüler</span>
                @if (gradedCount(event) > 0) {
                  <span class="stat graded">{{ gradedCount(event) }} bewertet</span>
                }
              </div>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--sp-5); gap: var(--sp-4); }
    h1 { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--navy); margin: 0 0 2px; }
    .subtitle { font-size: 13px; color: var(--ink-faint); margin: 0; }

    /* ── Create Panel ── */
    .create-panel {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: var(--sp-5);
      margin-bottom: var(--sp-5);
      box-shadow: var(--sh-sm);
    }
    .panel-title { font-size: 14px; font-weight: 600; color: var(--navy); margin: 0 0 var(--sp-4); }
    .field-row { display: flex; gap: var(--sp-4); flex-wrap: wrap; margin-bottom: var(--sp-4); }
    .field { display: flex; flex-direction: column; gap: var(--sp-2); min-width: 140px; }
    .field--grow { flex: 1; }
    label { font-size: 12px; font-weight: 500; color: var(--ink-light); }
    input.invalid, select.invalid { border-color: var(--error-fg); }
    .field-error { font-size: 11px; color: var(--error-fg); }
    .server-error { font-size: 13px; color: var(--error-fg); margin-bottom: var(--sp-3); }
    .panel-actions { display: flex; justify-content: flex-end; gap: var(--sp-3); padding-top: var(--sp-4); border-top: 1px solid var(--border); }

    /* ── Filter ── */
    .filter-bar {
      display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap;
    }
    .filter-bar select { min-width: 160px; }

    /* ── States ── */
    .state-msg { color: var(--ink-faint); font-size: 14px; }
    .empty-state {
      padding: var(--sp-7) var(--sp-5); text-align: center;
      background: var(--white); border: 1px dashed var(--border); border-radius: var(--r-lg);
    }
    .empty-state p { font-size: 14px; color: var(--ink-faint); margin: 0 0 var(--sp-2); }
    .empty-hint { font-size: 13px !important; }

    /* ── Event List ── */
    .event-list { display: flex; flex-direction: column; gap: var(--sp-2); }
    .event-card {
      display: flex; align-items: center; gap: var(--sp-4);
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: var(--sp-4) var(--sp-5);
      text-decoration: none; transition: box-shadow .15s, border-color .15s;
      cursor: pointer;
    }
    .event-card:hover { box-shadow: var(--sh-md); border-color: var(--teal); }
    .event-main { display: flex; align-items: center; gap: var(--sp-3); flex: 1; }
    .event-type-badge {
      font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase;
      padding: 3px 8px; border-radius: 4px; flex-shrink: 0;
      background: var(--light-teal); color: var(--navy);
    }
    .event-type-badge[data-type="EXAM"] { background: #EDD9C4; color: #7A5A3A; }
    .event-type-badge[data-type="ORAL_CHECK"] { background: var(--light-teal); color: var(--navy); }
    .event-type-badge[data-type="WRITTEN_CHECK"] { background: #E8F4F8; color: #2E7D9A; }
    .event-info { display: flex; flex-direction: column; gap: 2px; }
    .event-title { font-size: 14px; font-weight: 500; color: var(--navy); }
    .event-meta { display: flex; gap: var(--sp-3); font-size: 12px; color: var(--ink-faint); }
    .event-meta span::before { content: '·'; margin-right: var(--sp-3); }
    .event-meta span:first-child::before { content: ''; margin: 0; }
    .event-stats { display: flex; align-items: center; gap: var(--sp-2); flex-shrink: 0; }
    .stat { font-size: 16px; font-weight: 600; color: var(--navy); }
    .stat-label { font-size: 11px; color: var(--ink-faint); margin-right: var(--sp-2); }
    .stat.graded { font-size: 12px; font-weight: 500; color: var(--teal); background: var(--light-teal); padding: 2px 8px; border-radius: 10px; }
    .chevron { color: var(--ink-faint); flex-shrink: 0; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-ghost:hover { border-color: var(--navy); }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      .page-header { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
      h1 { font-size: 22px; }
      .filter-bar { gap: var(--sp-3); }
      .filter-bar select { min-width: 0; width: 100%; }
      .form-panel { padding: var(--sp-4); }
      .form-row { flex-direction: column; }
      .panel-actions { flex-direction: column-reverse; }
      .event-row { flex-wrap: wrap; gap: var(--sp-2); padding: var(--sp-3); }
      .event-meta { flex-wrap: wrap; }
    }
  `],
})
export class AssessmentListComponent implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly classService      = inject(ClassService);
  private readonly subjectService    = inject(SubjectService);
  private readonly fb                = inject(FormBuilder);

  events   = signal<AssessmentEventDto[]>([]);
  classes  = signal<ClassDto[]>([]);
  subjects = signal<SubjectDto[]>([]);
  loading  = signal(true);
  showForm = signal(false);
  saving   = signal(false);
  serverError = signal<string | null>(null);

  filterClassId   = signal('');
  filterSubjectId = signal('');

  filtered = computed(() => {
    let list = this.events();
    if (this.filterClassId())   list = list.filter(e => e.classId   === this.filterClassId());
    if (this.filterSubjectId()) list = list.filter(e => e.subjectId === this.filterSubjectId());
    return list;
  });

  readonly eventTypes = [
    { value: AssessmentEventType.ORAL_CHECK,    label: 'Mündliche MÜ' },
    { value: AssessmentEventType.WRITTEN_CHECK, label: 'Schriftliche MÜ' },
    { value: AssessmentEventType.EXAM,          label: 'Schularbeit' },
  ];

  form = this.fb.group({
    title:     ['', [Validators.required, Validators.minLength(1)]],
    type:      [AssessmentEventType.ORAL_CHECK, Validators.required],
    date:      [new Date().toISOString().split('T')[0], Validators.required],
    classId:   [''],
    subjectId: [''],
  });

  ngOnInit(): void {
    this.classService.getAll().subscribe(c => this.classes.set(c));
    this.subjectService.getAll().subscribe(s => this.subjects.set(s));
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.assessmentService.getAll().subscribe({
      next: (events) => {
        // className und subjectName lokal befüllen
        const cls = this.classes();
        const subs = this.subjects();
        events.forEach(e => {
          if (!e.className && e.classId)   e.className   = cls.find(c => c.id === e.classId)?.name;
          if (!e.subjectName && e.subjectId) e.subjectName = subs.find(s => s.id === e.subjectId)?.name;
        });
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.serverError.set(null);
    const v = this.form.getRawValue();
    this.assessmentService.create({
      title:     v.title!,
      type:      v.type as AssessmentEventType,
      date:      v.date!,
      classId:   v.classId  || undefined,
      subjectId: v.subjectId || undefined,
    }).subscribe({
      next: (event) => {
        this.events.update(list => [event, ...list]);
        this.showForm.set(false);
        this.form.reset({ type: AssessmentEventType.ORAL_CHECK, date: new Date().toISOString().split('T')[0] });
        this.saving.set(false);
      },
      error: () => { this.serverError.set('Anlegen fehlgeschlagen.'); this.saving.set(false); },
    });
  }

  typeLabel(type: AssessmentEventType): string {
    return this.eventTypes.find(t => t.value === type)?.label ?? type;
  }

  gradedCount(event: AssessmentEventDto): number {
    return event.results.filter(r => r.grade != null || r.points != null).length;
  }
}
