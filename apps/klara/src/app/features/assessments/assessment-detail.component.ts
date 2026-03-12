import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from './assessment.service';
import { ClassService } from '../classes/class.service';
import { StudentService } from '../students/student.service';
import { AssessmentEventDto, StudentResultDto, StudentDto } from '@app/domain';
import { AssessmentEventType } from '@app/domain';

interface ResultRow {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  grade: number | null;
  points: number | null;
  comment: string;
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
          <!-- Kopfzeile -->
          <div class="results-header">
            <span class="col-student">Schüler</span>
            <span class="col-grade">Note</span>
            <span class="col-points">Punkte</span>
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
              <div class="col-grade">
                <select [(ngModel)]="row.grade" (ngModelChange)="markDirty(row)" class="grade-select">
                  <option [ngValue]="null">—</option>
                  <option [ngValue]="1">1 – Sehr gut</option>
                  <option [ngValue]="2">2 – Gut</option>
                  <option [ngValue]="3">3 – Befriedigend</option>
                  <option [ngValue]="4">4 – Genügend</option>
                  <option [ngValue]="5">5 – Nicht genügend</option>
                </select>
              </div>
              <div class="col-points">
                <input type="number" [(ngModel)]="row.points" (ngModelChange)="markDirty(row)"
                       placeholder="—" min="0" class="points-input" />
              </div>
              <div class="col-comment">
                <input type="text" [(ngModel)]="row.comment" (ngModelChange)="markDirty(row)"
                       placeholder="Kommentar…" class="comment-input" />
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
    .page { max-width: 900px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
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
    .picker-footer { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-5); border-top: 1px solid var(--border); background: var(--surface); }
    .picker-count { font-size: 12px; color: var(--ink-faint); }

    /* ── Results ── */
    .results-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; margin-bottom: var(--sp-4); }
    .results-header {
      display: grid; grid-template-columns: 1fr 130px 100px 1fr 90px;
      gap: var(--sp-3); padding: 10px var(--sp-5);
      background: var(--surface); border-bottom: 1px solid var(--border);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .8px; color: var(--ink-faint);
    }
    .result-row {
      display: grid; grid-template-columns: 1fr 130px 100px 1fr 90px;
      gap: var(--sp-3); padding: 10px var(--sp-5);
      border-bottom: 1px solid var(--border); align-items: center;
      transition: background .1s;
    }
    .result-row:last-of-type { border-bottom: none; }
    .result-row.dirty { background: #FFFDF5; }
    .result-row:hover { background: var(--surface); }

    .col-student { display: flex; align-items: center; gap: var(--sp-3); }
    .mini-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--light-teal); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; overflow: hidden;
    }
    .mini-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .student-link { font-size: 13px; color: var(--navy); text-decoration: none; font-weight: 500; }
    .student-link:hover { text-decoration: underline; }

    .grade-select { width: 100%; font-size: 13px; }
    .points-input { width: 100%; font-size: 13px; }
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
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-ghost:hover { border-color: var(--navy); }
    .btn-danger-ghost { background: transparent; color: var(--ink-faint); border: 1.5px solid var(--border); }
    .btn-danger-ghost:hover { border-color: var(--error-fg); color: var(--error-fg); }
  `],
})
export class AssessmentDetailComponent implements OnInit {
  private readonly route             = inject(ActivatedRoute);
  private readonly router            = inject(Router);
  private readonly assessmentService = inject(AssessmentService);
  private readonly studentService    = inject(StudentService);
  private readonly classService      = inject(ClassService);

  event          = signal<AssessmentEventDto | null>(null);
  loading        = signal(true);
  loadError      = signal(false);
  showStudentPicker = signal(false);
  allStudents    = signal<StudentDto[]>([]);
  classStudents  = signal<StudentDto[]>([]);   // Schüler der gesetzten Klasse
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.studentService.getAll().subscribe(s => this.allStudents.set(s));
    this.loadEvent(id);
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
      return {
        studentId:   result.studentId,
        studentName: student ? `${student.lastName} ${student.firstName}` : result.studentId,
        avatarUrl:   student?.avatarUrl,
        grade:       result.grade ?? null,
        points:      result.points ?? null,
        comment:     result.comment ?? '',
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
    this.assessmentService.upsertResult(this.event()!.id, {
      studentId: row.studentId,
      grade:     row.grade   ?? undefined,
      points:    row.points  ?? undefined,
      comment:   row.comment || undefined,
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
    const results = dirty.map(r => ({
      studentId: r.studentId,
      grade:     r.grade   ?? undefined,
      points:    r.points  ?? undefined,
      comment:   r.comment || undefined,
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

  typeLabel(type: AssessmentEventType): string {
    return this.eventTypes.find(t => t.value === type)?.label ?? type;
  }

  deleteEvent(): void {
    if (!confirm('Leistungsereignis wirklich löschen? Alle Ergebnisse werden entfernt.')) return;
    this.assessmentService.delete(this.event()!.id).subscribe({
      next: () => this.router.navigate(['/app/assessments']),
    });
  }
}
