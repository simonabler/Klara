import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AssessmentService } from './assessment.service';
import { AssessmentTypeService } from './assessment-type.service';
import { ClassService } from '../classes/class.service';
import { StudentService } from '../students/student.service';
import { AssessmentEventDto, AssessmentSchema, AssessmentTypeDto, StudentResultDto, StudentDto } from '@app/domain';
import { AssessmentEventType } from '@app/domain';

interface ResultRow {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  grade: number | null;
  points: number | null;
  comment: string;
  /** Für PLUS_TILDE_MINUS / PASS_FAIL: der Wert (+/~/- / bestanden/nicht bestanden) */
  ptmValue: string;
  dirty: boolean;
  saving: boolean;
}

@Component({
  selector: 'app-assessment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" routerLink="/app/assessments">← Leistungen</a>
        @if (event()) {
          <div class="header-row">
            <div>
              <div class="event-type-badge" [attr.data-type]="event()!.type">{{ typeLabel(event()!.type) }}</div>
              <h1>{{ event()!.title }}</h1>
              <div class="event-meta">
                @if (event()!.className) { <span>{{ event()!.className }}</span> }
                @if (event()!.subjectName) { <span>{{ event()!.subjectName }}</span> }
                <span>{{ event()!.date | date:'dd.MM.yyyy' }}</span>
              </div>
            </div>
            <div class="header-actions">
              <button class="btn btn-ghost btn-sm" (click)="toggleStudentPicker()">
                Schüler zuweisen
              </button>
              <button class="btn btn-danger-ghost btn-sm" (click)="deleteEvent()">Löschen</button>
            </div>
          </div>
        }
      </header>

      <!-- Schüler-Picker -->
      @if (showStudentPicker() && event()) {
        <div class="picker-panel">
          <div class="picker-header">
            <span class="picker-title">
              @if (classStudents().length) {
                Schüler der Klasse {{ event()?.className ?? '' }}
              } @else {
                Alle Schüler
              }
            </span>
            <button class="btn-icon-sm" (click)="showStudentPicker.set(false)">✕</button>
          </div>
          <div class="picker-search">
            <input type="search" placeholder="Schüler suchen…"
                   [(ngModel)]="pickerSearch" />
          </div>
          <div class="picker-list">
            @for (s of filteredPickerStudents(); track s.id) {
              <div class="picker-row" [class.selected]="isAssigned(s.id)" (click)="toggleAssignment(s.id)">
                <div class="mini-avatar">{{ s.firstName[0] }}{{ s.lastName[0] }}</div>
                <span class="picker-name">{{ s.lastName }} {{ s.firstName }}</span>
                @if (isAssigned(s.id)) { <span class="check">✓</span> }
              </div>
            }
          </div>
          <div class="picker-footer">
            <div class="picker-footer-actions">
              <button class="btn btn-ghost btn-xs" (click)="selectAll()">Alle</button>
              <button class="btn btn-ghost btn-xs" (click)="selectNone()">Keine</button>
            </div>
            <span class="picker-count">{{ assignedIds().size }} ausgewählt</span>
            <button class="btn btn-primary btn-sm" [disabled]="savingAssignment()" (click)="saveAssignment()">
              {{ savingAssignment() ? 'Wird gespeichert…' : 'Speichern' }}
            </button>
          </div>
        </div>
      }

      <!-- Ergebnistabelle -->
      @if (loading()) {
        <p class="state-msg">Lade Leistungsereignis…</p>
      } @else if (loadError()) {
        <p class="state-msg state-error">Leistungsereignis konnte nicht geladen werden.</p>
      } @else if (!event()) {
        <p class="state-msg">Nicht gefunden.</p>
      } @else if (rows().length === 0) {
        <div class="empty-state">
          <p>Noch keine Schüler zugewiesen.</p>
          <p class="empty-hint">Klicke auf „Schüler zuweisen" um Schüler hinzuzufügen.</p>
        </div>
      } @else {
        <div class="results-wrap">
          <div class="results-inner">
          <!-- Kopfzeile -->
          <div class="results-header">
            <span class="col-student">Schüler</span>
            <span class="col-value">{{ valueColLabel() }}</span>
            <span class="col-comment">Kommentar</span>
            <span class="col-action"></span>
          </div>

          <!-- Zeilen -->
          @for (row of rows(); track row.studentId) {
            <div class="result-row" [class.dirty]="row.dirty">
              <div class="col-student">
                <div class="mini-avatar">
                  @if (row.avatarUrl) { <img [src]="row.avatarUrl" [alt]="row.studentName" /> }
                  @else { {{ row.studentName[0] }} }
                </div>
                <a class="student-link" [routerLink]="['/app/students', row.studentId]">
                  {{ row.studentName }}
                </a>
              </div>

              <!-- Schema-adaptive Eingabe -->
              <div class="col-value">
                @switch (activeSchema()) {
                  @case ('GRADES_1_5') {
                    <select [(ngModel)]="row.grade" (ngModelChange)="markDirty(row)" class="grade-select">
                      <option [ngValue]="null">—</option>
                      <option [ngValue]="1">1 – Sehr gut</option>
                      <option [ngValue]="2">2 – Gut</option>
                      <option [ngValue]="3">3 – Befriedigend</option>
                      <option [ngValue]="4">4 – Genügend</option>
                      <option [ngValue]="5">5 – Nicht genügend</option>
                    </select>
                  }
                  @case ('GRADES_1_10') {
                    <select [(ngModel)]="row.grade" (ngModelChange)="markDirty(row)" class="grade-select">
                      <option [ngValue]="null">—</option>
                      @for (n of [1,2,3,4,5,6,7,8,9,10]; track n) {
                        <option [ngValue]="n">{{ n }}</option>
                      }
                    </select>
                  }
                  @case ('PLUS_TILDE_MINUS') {
                    <div class="ptm-group">
                      @for (opt of ptmOptions; track opt.value) {
                        <button class="ptm-btn"
                          [class.active]="row.ptmValue === opt.value"
                          (click)="setPTM(row, opt.value)">{{ opt.label }}</button>
                      }
                    </div>
                  }
                  @case ('POINTS') {
                    <input type="number" [(ngModel)]="row.points" (ngModelChange)="markDirty(row)"
                           placeholder="—" min="0"
                           [max]="activeType()?.maxPoints ?? null"
                           class="points-input" />
                  }
                  @case ('PASS_FAIL') {
                    <div class="ptm-group">
                      <button class="ptm-btn" [class.active]="row.ptmValue === 'bestanden'"
                        (click)="setPTM(row, 'bestanden')">✓</button>
                      <button class="ptm-btn ptm-fail" [class.active]="row.ptmValue === 'nicht bestanden'"
                        (click)="setPTM(row, 'nicht bestanden')">✗</button>
                    </div>
                  }
                  @default {
                    <!-- Fallback: Note 1–5 für alte Events -->
                    <select [(ngModel)]="row.grade" (ngModelChange)="markDirty(row)" class="grade-select">
                      <option [ngValue]="null">—</option>
                      <option [ngValue]="1">1 – Sehr gut</option>
                      <option [ngValue]="2">2 – Gut</option>
                      <option [ngValue]="3">3 – Befriedigend</option>
                      <option [ngValue]="4">4 – Genügend</option>
                      <option [ngValue]="5">5 – Nicht genügend</option>
                    </select>
                  }
                }
              </div>

              <div class="col-comment">
                <input type="text" [(ngModel)]="row.comment"
                       (ngModelChange)="markDirty(row)"
                       [placeholder]="activeSchema() === 'PLUS_TILDE_MINUS' || activeSchema() === 'PASS_FAIL' ? 'Zusatzkommentar…' : 'Kommentar…'"
                       class="comment-input" />
              </div>
              <div class="col-action">
                @if (row.dirty) {
                  <button class="save-row-btn" [disabled]="row.saving" (click)="saveRow(row)">
                    {{ row.saving ? '…' : 'Speichern' }}
                  </button>
                } @else {
                  <span class="saved-indicator">✓</span>
                }
              </div>
            </div>
          }

          <!-- Alle auf einmal speichern -->
          @if (hasDirty()) {
            <div class="bulk-save-bar">
              <span class="dirty-count">{{ dirtyCount() }} ungespeicherte Änderungen</span>
              <button class="btn btn-primary" [disabled]="bulkSaving()" (click)="saveAll()">
                {{ bulkSaving() ? 'Wird gespeichert…' : 'Alle speichern' }}
              </button>
            </div>
          }
          </div><!-- /results-inner -->
        </div>

        <!-- Zusammenfassung -->
        <div class="summary">
          <div class="summary-stat">
            <span class="s-val">{{ rows().length }}</span>
            <span class="s-label">Schüler</span>
          </div>
          @if (avgGrade() !== null) {
            <div class="summary-stat">
              <span class="s-val">{{ avgGrade()!.toFixed(1) }}</span>
              <span class="s-label">Ø Note</span>
            </div>
          }
          @if (avgPoints() !== null) {
            <div class="summary-stat">
              <span class="s-val">{{ avgPoints()!.toFixed(1) }}</span>
              <span class="s-label">Ø Punkte</span>
            </div>
          }
          <div class="summary-stat">
            <span class="s-val">{{ gradedCount() }}</span>
            <span class="s-label">bewertet</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); overflow-x: hidden; }
    .results-inner { min-width: 420px; }
    .back-link { font-size: 13px; color: var(--ink-faint); text-decoration: none; }
    .back-link:hover { color: var(--ink); }
    .page-header { margin-bottom: var(--sp-5); }
    .header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); margin-top: var(--sp-3); }
    .event-type-badge {
      display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .8px;
      text-transform: uppercase; padding: 3px 8px; border-radius: 4px; margin-bottom: var(--sp-2);
      background: var(--light-teal); color: var(--navy);
    }
    .event-type-badge[data-type="EXAM"] { background: #EDD9C4; color: #7A5A3A; }
    .event-type-badge[data-type="WRITTEN_CHECK"] { background: #E8F4F8; color: #2E7D9A; }
    h1 { font-family: var(--font-display); font-size: 26px; font-weight: 400; color: var(--navy); margin: 0 0 4px; }
    .event-meta { display: flex; gap: var(--sp-3); font-size: 13px; color: var(--ink-faint); }
    .event-meta span::before { content: '·'; margin-right: var(--sp-3); }
    .event-meta span:first-child::before { content: ''; margin: 0; }
    .header-actions { display: flex; gap: var(--sp-2); flex-shrink: 0; }

    /* ── Picker ── */
    .picker-panel {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); margin-bottom: var(--sp-5);
      box-shadow: var(--sh-md); overflow: hidden;
    }
    .picker-header { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--border); }
    .picker-title { font-size: 13px; font-weight: 600; color: var(--navy); }
    .btn-icon-sm { background: none; border: none; font-size: 14px; color: var(--ink-faint); cursor: pointer; padding: 4px; }
    .picker-search { padding: var(--sp-3) var(--sp-5); border-bottom: 1px solid var(--border); }
    .picker-search input { width: 100%; }
    .picker-list { max-height: 280px; overflow-y: auto; }
    .picker-row {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: 10px var(--sp-5); cursor: pointer; transition: background .1s;
    }
    .picker-row:hover { background: var(--surface); }
    .picker-row.selected { background: var(--surface); }
    .picker-name { flex: 1; font-size: 13px; color: var(--ink); }
    .check { color: var(--navy); font-weight: 700; }
    .picker-footer { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-5); border-top: 1px solid var(--border); background: var(--surface); gap: var(--sp-3); }
    .picker-footer-actions { display: flex; gap: var(--sp-2); }
    .picker-count { font-size: 12px; color: var(--ink-faint); flex: 1; text-align: center; }

    /* ── Results ── */
    .results-wrap {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); margin-bottom: var(--sp-4);
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      /* Verhindert dass die Seite mitwächst */
      max-width: 100%;
    }
    .results-inner {
      min-width: 480px;
    }
    .results-header {
      display: grid; grid-template-columns: minmax(120px,1.5fr) 150px minmax(100px,1fr) 80px;
      gap: var(--sp-3); padding: 10px var(--sp-5);
      background: var(--surface); border-bottom: 1px solid var(--border);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .8px; color: var(--ink-faint);
    }
    .result-row {
      display: grid; grid-template-columns: minmax(120px,1.5fr) 150px minmax(100px,1fr) 80px;
      gap: var(--sp-3); padding: 10px var(--sp-5);
      border-bottom: 1px solid var(--border); align-items: center;
      transition: background .1s;
    }
    .result-row:last-of-type { border-bottom: none; }
    .result-row.dirty { background: #FFFDF5; }
    .result-row:hover { background: var(--surface); }

    .col-student {
      display: flex; align-items: center; gap: var(--sp-3);
      position: sticky; left: 0; z-index: 1;
      background: inherit;
      min-width: 0;
    }
    .student-link {
      font-size: 13px; color: var(--navy); text-decoration: none;
      font-weight: 500; word-break: break-word;
    }
    .student-link:hover { text-decoration: underline; }

    .grade-select { width: 100%; font-size: 13px; }
    .points-input { width: 100%; font-size: 13px; }
    .mini-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--light-teal); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; overflow: hidden;
    }
    .mini-avatar img { width: 100%; height: 100%; object-fit: cover; }

    .ptm-group { display: flex; gap: 4px; }
    .ptm-btn {
      width: 44px; flex-shrink: 0; padding: 5px 0; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: var(--white);
      font-size: 14px; font-weight: 600; color: var(--ink-light);
      cursor: pointer; transition: all .12s; font-family: var(--font-body);
    }
    .ptm-btn:hover { border-color: var(--teal); color: var(--teal); }
    .ptm-btn.active { border-color: var(--navy); background: var(--navy); color: var(--white); }
    .ptm-btn.ptm-fail.active { border-color: var(--error-fg, #C62828); background: var(--error-fg, #C62828); }
    .comment-input { width: 100%; font-size: 13px; }

    .save-row-btn {
      padding: 5px 12px; background: var(--navy); color: var(--white);
      border: none; border-radius: var(--r-sm); font-size: 12px; font-weight: 500;
      cursor: pointer; font-family: var(--font-body); white-space: nowrap;
    }
    .save-row-btn:disabled { opacity: .4; cursor: not-allowed; }
    .saved-indicator { font-size: 13px; color: var(--success-fg, #2E7D32); }

    .bulk-save-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--sp-3) var(--sp-5); background: var(--warn-bg, #FFF8E1);
      border-top: 1px solid var(--border);
    }
    .dirty-count { font-size: 13px; color: var(--warn-fg, #F57F17); font-weight: 500; }

    /* ── Summary ── */
    .summary {
      display: flex; gap: var(--sp-5);
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: var(--sp-4) var(--sp-5);
    }
    .summary-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .s-val { font-size: 22px; font-weight: 600; color: var(--navy); }
    .s-label { font-size: 11px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .6px; }

    /* ── States ── */
    .state-msg { color: var(--ink-faint); font-size: 14px; }
    .state-error { color: var(--error-fg); }
    .empty-state { padding: var(--sp-7) var(--sp-5); text-align: center; background: var(--white); border: 1px dashed var(--border); border-radius: var(--r-lg); }
    .empty-state p { font-size: 14px; color: var(--ink-faint); margin: 0 0 var(--sp-2); }
    .empty-hint { font-size: 13px !important; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-sm { padding: 6px 14px; font-size: 12px; }
    .btn-xs { padding: 4px 10px; font-size: 11px; }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-ghost:hover { border-color: var(--navy); }
    .btn-danger-ghost { background: transparent; color: var(--ink-faint); border: 1.5px solid var(--border); }
    .btn-danger-ghost:hover { border-color: var(--error-fg); color: var(--error-fg); }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      .event-header { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
      h1 { font-size: 20px; }
      .header-actions { width: 100%; display: flex; gap: var(--sp-2); }
      .two-col { grid-template-columns: 1fr; }
      .results-table th:nth-child(4),
      .results-table td:nth-child(4) { display: none; }
      .result-inputs { flex-wrap: wrap; gap: var(--sp-2); }
      .picker-header { flex-wrap: wrap; gap: var(--sp-2); }
    }
  `],
})
export class AssessmentDetailComponent implements OnInit {
  private readonly route                 = inject(ActivatedRoute);
  private readonly router                = inject(Router);
  private readonly assessmentService     = inject(AssessmentService);
  private readonly assessmentTypeService = inject(AssessmentTypeService);
  private readonly studentService        = inject(StudentService);
  private readonly classService          = inject(ClassService);

  event          = signal<AssessmentEventDto | null>(null);
  loading        = signal(true);
  loadError      = signal(false);
  showStudentPicker = signal(false);
  allStudents    = signal<StudentDto[]>([]);
  classStudents  = signal<StudentDto[]>([]);
  assessmentTypes = signal<AssessmentTypeDto[]>([]);
  pickerSearch   = '';
  assignedIds    = signal<Set<string>>(new Set());
  savingAssignment = signal(false);
  bulkSaving     = signal(false);

  private _rows = signal<ResultRow[]>([]);
  rows = computed(() => this._rows());

  hasDirty    = computed(() => this._rows().some(r => r.dirty));
  dirtyCount  = computed(() => this._rows().filter(r => r.dirty).length);
  gradedCount = computed(() => this._rows().filter(r => r.grade != null || r.points != null).length);

  avgGrade = computed(() => {
    const grades = this._rows().filter(r => r.grade != null).map(r => r.grade!);
    return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
  });
  avgPoints = computed(() => {
    const pts = this._rows().filter(r => r.points != null).map(r => r.points!);
    return pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : null;
  });

  filteredPickerStudents = computed(() => {
    // Wenn Klasse gesetzt → nur Klassenschüler; sonst alle
    const base = this.classStudents().length ? this.classStudents() : this.allStudents();
    const q = this.pickerSearch.toLowerCase().trim();
    return q
      ? base.filter(s =>
          (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) ||
          (s.lastName + ' ' + s.firstName).toLowerCase().includes(q)
        )
      : base;
  });

  readonly eventTypes = [
    { value: AssessmentEventType.ORAL_CHECK,    label: 'Mündliche MÜ' },
    { value: AssessmentEventType.WRITTEN_CHECK, label: 'Schriftliche MÜ' },
    { value: AssessmentEventType.EXAM,          label: 'Schularbeit' },
  ];

  readonly ptmOptions = [
    { value: '+', label: '+' },
    { value: '~', label: '~' },
    { value: '-', label: '−' },
  ];

  // Aktiver AssessmentType basierend auf dem Event-Typ-Feld
  // Sucht zuerst per UUID, dann per defaultForEventType (für alte Enum-Events)
  activeType = computed<AssessmentTypeDto | undefined>(() => {
    const typeId = this.event()?.type;
    if (!typeId) return undefined;
    const types = this.assessmentTypes();
    return types.find(t => t.id === typeId)
        ?? types.find(t => t.defaultForEventType === typeId);
  });

  // Schema des aktiven Typs — fällt auf Enum-Defaults zurück nur wenn kein Type gefunden
  activeSchema = computed<string>(() => {
    const t = this.activeType();
    if (t) return t.schema;
    // Letzter Fallback für Events ohne konfigurierten Typ
    const type = this.event()?.type;
    if (type === 'ORAL_CHECK' || type === 'WRITTEN_CHECK') return AssessmentSchema.PLUS_TILDE_MINUS;
    if (type === 'EXAM') return AssessmentSchema.GRADES_1_5;
    return AssessmentSchema.GRADES_1_5;
  });

  valueColLabel = computed<string>(() => {
    switch (this.activeSchema()) {
      case AssessmentSchema.PLUS_TILDE_MINUS:  return '+/~/−';
      case AssessmentSchema.PASS_FAIL:         return 'Bestanden?';
      case AssessmentSchema.POINTS:            return 'Punkte';
      case AssessmentSchema.GRADES_1_10:       return 'Note (1–10)';
      default:                                 return 'Note';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);

    forkJoin({
      students: this.studentService.getAll(),
      types:    this.assessmentTypeService.getAll(),
      event:    this.assessmentService.getOne(id),
    }).subscribe({
      next: ({ students, types, event }) => {
        this.allStudents.set(students);
        this.assessmentTypes.set(types);
        this.event.set(event);
        this.assignedIds.set(new Set(event.results.map(r => r.studentId)));
        this.buildRows(event);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  loadEvent(id: string): void {
    this.loading.set(true);
    this.assessmentService.getOne(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.assignedIds.set(new Set(event.results.map(r => r.studentId)));
        this.buildRows(event);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  buildRows(event: AssessmentEventDto): void {
    const students = this.allStudents();
    const rows: ResultRow[] = event.results.map(result => {
      const student = students.find(s => s.id === result.studentId);
      const isPTM = ['PLUS_TILDE_MINUS', 'PASS_FAIL'].includes(this.activeSchema());
      return {
        studentId:   result.studentId,
        studentName: student ? `${student.lastName} ${student.firstName}` : result.studentId,
        avatarUrl:   student?.avatarUrl,
        grade:       result.grade ?? null,
        points:      result.points ?? null,
        ptmValue:    isPTM ? (result.comment ?? '') : '',
        comment:     isPTM ? (result.additionalComment ?? '') : (result.comment ?? ''),
        dirty:       false,
        saving:      false,
      };
    });
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
    this._rows.set(rows);
  }

  markDirty(row: ResultRow): void {
    this._rows.update(list => list.map(r => r.studentId === row.studentId ? { ...r, dirty: true } : r));
  }

  saveRow(row: ResultRow): void {
    this._rows.update(list => list.map(r => r.studentId === row.studentId ? { ...r, saving: true } : r));
    const isPTM = ['PLUS_TILDE_MINUS', 'PASS_FAIL'].includes(this.activeSchema());
    this.assessmentService.upsertResult(this.event()!.id, {
      studentId: row.studentId,
      grade:     row.grade   ?? undefined,
      points:    row.points  ?? undefined,
      comment:            isPTM ? (row.ptmValue || undefined) : (row.comment || undefined),
      additionalComment:  isPTM ? (row.comment  || undefined) : undefined,
    }).subscribe({
      next: () => {
        this._rows.update(list => list.map(r =>
          r.studentId === row.studentId ? { ...r, dirty: false, saving: false } : r
        ));
      },
      error: () => {
        this._rows.update(list => list.map(r =>
          r.studentId === row.studentId ? { ...r, saving: false } : r
        ));
      },
    });
  }

  saveAll(): void {
    this.bulkSaving.set(true);
    const dirty = this._rows().filter(r => r.dirty);
    const isPTM = ['PLUS_TILDE_MINUS', 'PASS_FAIL'].includes(this.activeSchema());
    const results = dirty.map(r => ({
      studentId: r.studentId,
      grade:     r.grade   ?? undefined,
      points:    r.points  ?? undefined,
      comment:            isPTM ? (r.ptmValue || undefined) : (r.comment || undefined),
      additionalComment:  isPTM ? (r.comment  || undefined) : undefined,
    }));
    this.assessmentService.bulkUpsertResults(this.event()!.id, results).subscribe({
      next: (updated) => {
        this._rows.update(list => list.map(r => ({ ...r, dirty: false, saving: false })));
        this.bulkSaving.set(false);
      },
      error: () => this.bulkSaving.set(false),
    });
  }

  // ── Schüler-Picker ────────────────────────────────────────────────────────

  toggleStudentPicker(): void {
    this.showStudentPicker.update(v => !v);
    if (this.showStudentPicker()) {
      const classId = this.event()?.classId;
      if (classId) {
        // Nur die Schüler dieser Klasse im Picker zeigen
        this.classService.getOne(classId).subscribe(cls => {
          this.classStudents.set((cls.students ?? []) as StudentDto[]);
        });
      } else {
        // Kein Klassenkontext → alle Schüler zeigen
        this.classStudents.set([]);
      }
    }
  }

  isAssigned(studentId: string): boolean {
    return this.assignedIds().has(studentId);
  }

  toggleAssignment(studentId: string): void {
    const set = new Set(this.assignedIds());
    set.has(studentId) ? set.delete(studentId) : set.add(studentId);
    this.assignedIds.set(set);
  }

  selectAll(): void {
    const all = this.filteredPickerStudents().map(s => s.id);
    this.assignedIds.set(new Set(all));
  }

  selectNone(): void {
    this.assignedIds.set(new Set());
  }

  saveAssignment(): void {
    this.savingAssignment.set(true);
    this.assessmentService.assignStudents(this.event()!.id, [...this.assignedIds()]).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.buildRows(updated);
        this.showStudentPicker.set(false);
        this.savingAssignment.set(false);
      },
      error: () => this.savingAssignment.set(false),
    });
  }

  typeLabel(typeId: string): string {
    const types = this.assessmentTypes();
    const found = types.find(t => t.id === typeId)
               ?? types.find(t => t.defaultForEventType === typeId);
    if (found) return found.name;
    const legacy: Record<string, string> = {
      ORAL_CHECK: 'Mündliche MÜ', WRITTEN_CHECK: 'Schriftliche MÜ', EXAM: 'Schularbeit',
    };
    return legacy[typeId] ?? typeId;
  }

  setPTM(row: ResultRow, value: string): void {
    row.ptmValue = row.ptmValue === value ? '' : value;
    this.markDirty(row);
  }

  deleteEvent(): void {
    if (!confirm('Leistungsereignis wirklich löschen? Alle Ergebnisse werden entfernt.')) return;
    this.assessmentService.delete(this.event()!.id).subscribe({
      next: () => this.router.navigate(['/app/assessments']),
    });
  }
}
