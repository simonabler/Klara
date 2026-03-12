import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ClassService } from '../classes/class.service';
import { SubjectService } from '../classes/reference-data.service';
import { NoteService } from '../notes/note.service';
import { AssessmentService } from '../assessments/assessment.service';

import {
  ClassDto, SubjectDto, StudentRefDto,
  NoteDto, StudentResultDto,
} from '@app/domain';
import { NoteType, AssessmentEventType } from '@app/domain';

// ── Datenstruktur pro Schüler ────────────────────────────────────────────────

interface StudentBeurteilung {
  student: StudentRefDto;
  generalNotes: NoteDto[];   // Notizen ohne Fachbezug (classId, kein subjectId)
  subjectNotes: NoteDto[];   // Notizen mit diesem Fach
  results: StudentResultDto[];
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<AssessmentEventType, string> = {
  [AssessmentEventType.ORAL_CHECK]:    'Mündlich',
  [AssessmentEventType.WRITTEN_CHECK]: 'Schriftlich',
  [AssessmentEventType.EXAM]:          'Schularbeit',
};

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  [NoteType.PARTICIPATION]: 'Mitarbeit',
  [NoteType.BEHAVIOUR]:     'Verhalten',
  [NoteType.GENERAL]:       'Allgemein',
};

@Component({
  selector: 'app-beurteilung',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">

      <header class="page-header">
        <h1>Beurteilung</h1>
        <p class="page-subtitle">Übersicht aller Notizen und Leistungen nach Klasse und Fach</p>
      </header>

      <!-- ── Filter ── -->
      <div class="filter-bar">
        <div class="filter-field">
          <label>Klasse</label>
          <select [ngModel]="selectedClassId()" (ngModelChange)="onClassChange($event)">
            <option value="">— Klasse wählen —</option>
            @for (cls of classes(); track cls.id) {
              <option [value]="cls.id">
                {{ cls.name }}{{ cls.schoolYear ? ' · ' + cls.schoolYear : '' }}
              </option>
            }
          </select>
        </div>

        <div class="filter-field">
          <label>Fach</label>
          <select [ngModel]="selectedSubjectId()" (ngModelChange)="onSubjectChange($event)"
                  [disabled]="!selectedClassId()">
            <option value="">— Fach wählen —</option>
            @for (s of subjects(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>
      </div>

      <!-- ── Zustände ── -->
      @if (!selectedClassId()) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p>Wähle eine Klasse und ein Fach um die Beurteilungsübersicht zu öffnen.</p>
        </div>

      } @else if (!selectedSubjectId()) {
        <div class="empty-state">
          <p>Klasse ausgewählt – bitte auch ein Fach wählen.</p>
        </div>

      } @else if (loading()) {
        <div class="loading-row">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-label">Wird geladen…</span>
        </div>

      } @else if (entries().length === 0) {
        <div class="empty-state">
          <p>Diese Klasse hat noch keine Schüler.</p>
          @if (selectedClassId()) {
            <a [routerLink]="['/app/classes', selectedClassId(), 'edit']" class="link">
              Schüler zuweisen →
            </a>
          }
        </div>

      } @else {
        <!-- ── Kontext-Info ── -->
        <div class="context-info">
          <span class="context-badge">{{ selectedClassName() }}</span>
          <span class="context-sep">·</span>
          <span class="context-badge">{{ selectedSubjectName() }}</span>
          <span class="context-count">{{ entries().length }} Schüler</span>
        </div>

        <!-- ── Schülerliste ── -->
        <div class="student-list">
          @for (entry of entries(); track entry.student.id) {
            <div class="student-card">

              <!-- Schüler-Header -->
              <div class="student-header">
                <div class="avatar">
                  @if (entry.student.avatarUrl) {
                    <img [src]="entry.student.avatarUrl" [alt]="entry.student.firstName" />
                  } @else {
                    <span>{{ entry.student.firstName[0] }}{{ entry.student.lastName[0] }}</span>
                  }
                </div>
                <div class="student-name-block">
                  <span class="student-name">
                    {{ entry.student.lastName }} {{ entry.student.firstName }}
                  </span>
                  <span class="student-summary">
                    {{ entry.generalNotes.length + entry.subjectNotes.length }} Notiz{{
                      entry.generalNotes.length + entry.subjectNotes.length !== 1 ? 'en' : ''
                    }} · {{ entry.results.length }} Leistung{{
                      entry.results.length !== 1 ? 'en' : ''
                    }}
                  </span>
                </div>
                <a [routerLink]="['/app/students', entry.student.id]" class="profile-link">
                  Profil →
                </a>
              </div>

              <!-- Inhalt -->
              <div class="student-body">

                <!-- Allgemeine Notizen (ohne Fach) -->
                @if (entry.generalNotes.length > 0) {
                  <div class="notes-block">
                    <div class="block-label">Allgemeine Notizen</div>
                    <div class="notes-inline">
                      @for (note of entry.generalNotes; track note.id) {
                        <div class="note-chip" [attr.data-type]="note.type">
                          <span class="note-type-dot"></span>
                          <span class="note-text">{{ note.content }}</span>
                          <span class="note-date">{{ note.createdAt | date:'dd.MM.yy' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Fach-Notizen -->
                @if (entry.subjectNotes.length > 0) {
                  <div class="notes-block">
                    <div class="block-label">{{ selectedSubjectName() }}-Notizen</div>
                    <div class="notes-inline">
                      @for (note of entry.subjectNotes; track note.id) {
                        <div class="note-chip" [attr.data-type]="note.type">
                          <span class="note-type-dot"></span>
                          <span class="note-text">{{ note.content }}</span>
                          <span class="note-date">{{ note.createdAt | date:'dd.MM.yy' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (entry.generalNotes.length === 0 && entry.subjectNotes.length === 0) {
                  <div class="notes-block">
                    <span class="empty-hint">Keine Notizen vorhanden.</span>
                  </div>
                }

                <!-- Leistungen -->
                <div class="results-block">
                  <div class="block-label">Leistungen</div>
                  @if (entry.results.length === 0) {
                    <span class="empty-hint">Noch keine Leistungen erfasst.</span>
                  } @else {
                    <div class="results-row">
                      @for (result of entry.results; track result.id) {
                        <div class="result-chip">
                          <span class="result-event-label">
                            {{ result.assessmentEvent?.title ?? '—' }}
                          </span>
                          <span class="result-event-type">
                            {{ eventTypeLabel(result.assessmentEvent?.type) }}
                          </span>
                          <div class="result-scores">
                            @if (result.grade != null) {
                              <span class="grade-badge" [attr.data-grade]="result.grade">
                                {{ result.grade }}
                              </span>
                            }
                            @if (result.points != null) {
                              <span class="points-badge">{{ result.points }} Pkt.</span>
                            }
                            @if (!result.grade && result.points == null && result.comment) {
                              <span class="comment-badge">Kommentar</span>
                            }
                          </div>
                          @if (result.comment) {
                            <span class="result-comment" [title]="result.comment">💬</span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>

              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 860px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }

    /* ── Header ── */
    .page-header { margin-bottom: var(--sp-5); }
    h1 { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--navy); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--ink-faint); margin: 0; }

    /* ── Filter ── */
    .filter-bar {
      display: flex; gap: var(--sp-4); flex-wrap: wrap;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: var(--sp-4) var(--sp-5);
      margin-bottom: var(--sp-5);
    }
    .filter-field { display: flex; flex-direction: column; gap: var(--sp-1); flex: 1; min-width: 180px; }
    .filter-field label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; color: var(--ink-faint);
    }
    select:disabled { opacity: .45; }

    /* ── Empty / Loading ── */
    .empty-state {
      padding: var(--sp-7) var(--sp-5); text-align: center;
      color: var(--ink-faint); font-size: 14px;
    }
    .empty-icon { margin-bottom: var(--sp-3); color: var(--border); }
    .empty-state p { margin: 0 0 var(--sp-3); }
    .link { color: var(--teal); font-weight: 500; }
    .link:hover { color: var(--navy); }

    .loading-row {
      display: flex; align-items: center; gap: var(--sp-2);
      padding: var(--sp-5); color: var(--ink-faint); font-size: 13px;
    }
    .loading-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--teal);
      animation: pulse 1.2s infinite ease-in-out;
    }
    .loading-dot:nth-child(2) { animation-delay: .2s; }
    .loading-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
    .loading-label { margin-left: var(--sp-2); }

    /* ── Kontext-Info ── */
    .context-info {
      display: flex; align-items: center; gap: var(--sp-2);
      margin-bottom: var(--sp-4);
    }
    .context-badge {
      font-size: 12px; font-weight: 600; background: var(--navy); color: var(--white);
      padding: 3px 10px; border-radius: 20px;
    }
    .context-sep { color: var(--border); }
    .context-count { font-size: 12px; color: var(--ink-faint); margin-left: var(--sp-1); }

    /* ── Schülerkarte ── */
    .student-list { display: flex; flex-direction: column; gap: var(--sp-3); }
    .student-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden;
      box-shadow: var(--sh-sm);
    }

    /* Schüler-Header */
    .student-header {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-5); background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: var(--navy); color: var(--white);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .student-name-block { display: flex; flex-direction: column; flex: 1; }
    .student-name { font-size: 15px; font-weight: 500; color: var(--navy); }
    .student-summary { font-size: 12px; color: var(--ink-faint); }
    .profile-link {
      font-size: 12px; font-weight: 500; color: var(--teal);
      white-space: nowrap; transition: color .12s;
    }
    .profile-link:hover { color: var(--navy); }

    /* Body */
    .student-body { padding: var(--sp-4) var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-4); }

    .block-label {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; color: var(--ink-faint); margin-bottom: var(--sp-2);
    }
    .empty-hint { font-size: 12px; color: var(--ink-faint); font-style: italic; }

    /* Notiz-Chips */
    .notes-inline { display: flex; flex-direction: column; gap: var(--sp-2); }
    .note-chip {
      display: flex; align-items: flex-start; gap: var(--sp-2);
      padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm);
      background: var(--surface); border-left: 3px solid var(--teal);
      font-size: 13px;
    }
    .note-chip[data-type="BEHAVIOUR"] { border-left-color: var(--sand); }
    .note-type-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--teal);
      flex-shrink: 0; margin-top: 5px;
    }
    .note-chip[data-type="BEHAVIOUR"] .note-type-dot { background: var(--sand); }
    .note-text { flex: 1; color: var(--ink-light); line-height: 1.5; }
    .note-date { font-size: 11px; color: var(--ink-faint); white-space: nowrap; flex-shrink: 0; padding-top: 2px; }

    /* Leistungs-Chips */
    .results-row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
    .result-chip {
      display: flex; align-items: center; gap: var(--sp-2);
      padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm);
      background: var(--surface); border: 1px solid var(--border);
      font-size: 12px;
    }
    .result-event-label { font-weight: 500; color: var(--ink); }
    .result-event-type { color: var(--ink-faint); font-size: 11px; }
    .result-scores { display: flex; gap: 4px; align-items: center; }
    .result-comment { cursor: default; }

    .grade-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      font-size: 12px; font-weight: 700; background: var(--navy); color: var(--white);
    }
    .grade-badge[data-grade="1"] { background: #2E7D32; }
    .grade-badge[data-grade="2"] { background: #558B2F; }
    .grade-badge[data-grade="3"] { background: #F57F17; }
    .grade-badge[data-grade="4"] { background: #E65100; }
    .grade-badge[data-grade="5"] { background: #C62828; }

    .points-badge {
      font-size: 11px; font-weight: 600; color: var(--teal);
      background: var(--info-bg); padding: 2px 7px; border-radius: 4px;
    }
    .comment-badge {
      font-size: 11px; color: var(--ink-faint);
      background: var(--surface); padding: 2px 7px; border-radius: 4px;
      border: 1px solid var(--border);
    }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      h1 { font-size: 22px; }
      .filter-bar { flex-direction: column; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); }
      .filter-field { min-width: 0; }
      .student-header { padding: var(--sp-3); }
      .student-body { padding: var(--sp-3); }
      .results-row { flex-direction: column; }
      .result-chip { flex-wrap: wrap; }
    }
  `],
})
export class BeurteilungComponent implements OnInit {
  private readonly classService   = inject(ClassService);
  private readonly subjectService = inject(SubjectService);
  private readonly noteService    = inject(NoteService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly router         = inject(Router);

  classes  = signal<ClassDto[]>([]);
  subjects = signal<SubjectDto[]>([]);
  loading  = signal(false);
  entries  = signal<StudentBeurteilung[]>([]);

  selectedClassId   = signal('');
  selectedSubjectId = signal('');

  selectedClassName  = computed(() =>
    this.classes().find(c => c.id === this.selectedClassId())?.name ?? ''
  );
  selectedSubjectName = computed(() =>
    this.subjects().find(s => s.id === this.selectedSubjectId())?.name ?? ''
  );

  ngOnInit(): void {
    // Navigation-State vom Klassen-Dashboard auslesen
    const navState = this.router.getCurrentNavigation()?.extras?.state as { classId?: string } | undefined;
    const preselectedClassId = navState?.['classId'] ?? (history.state as any)?.['classId'];

    this.classService.getAll().subscribe(c => {
      this.classes.set(c);
      if (preselectedClassId && c.some(cls => cls.id === preselectedClassId)) {
        this.selectedClassId.set(preselectedClassId);
      }
    });
    this.subjectService.getAll().subscribe(s => this.subjects.set(s));
  }

  onClassChange(classId: string): void {
    this.selectedClassId.set(classId);
    this.selectedSubjectId.set('');
    this.entries.set([]);
  }

  onSubjectChange(subjectId: string): void {
    this.selectedSubjectId.set(subjectId);
    if (subjectId) this.loadData();
    else this.entries.set([]);
  }

  private loadData(): void {
    const classId   = this.selectedClassId();
    const subjectId = this.selectedSubjectId();
    if (!classId || !subjectId) return;

    this.loading.set(true);

    // Klassen-Detail holen um Schülerliste zu bekommen
    this.classService.getOne(classId).pipe(
      switchMap(cls => {
        const students = cls.students ?? [];
        if (students.length === 0) return of({ students: [], notesMap: new Map(), resultsMap: new Map() });

        // Alle Notizen der Klasse laden (allgemein + fachbezogen)
        const notes$ = this.noteService.getAll({ classId });

        // Leistungsergebnisse pro Schüler parallel laden
        const resultRequests = students.map(s =>
          this.assessmentService.getResultsForStudent(s.id)
        );

        return forkJoin([notes$, forkJoin(resultRequests)]).pipe(
          switchMap(([notes, allResults]) => {
            const notesMap = new Map<string, { general: NoteDto[]; subject: NoteDto[] }>();
            const resultsMap = new Map<string, StudentResultDto[]>();

            // Notizen nach Schüler gruppieren
            for (const student of students) {
              const studentNotes = notes.filter(n => n.studentId === student.id);
              notesMap.set(student.id, {
                general: studentNotes.filter(n => !n.subjectId),
                subject: studentNotes.filter(n => n.subjectId === subjectId),
              });
            }

            // Ergebnisse nach Schüler + Fach filtern
            students.forEach((student, i) => {
              const filtered = (allResults[i] ?? []).filter(
                r => r.assessmentEvent?.subjectId === subjectId
              );
              // Chronologisch sortiert
              filtered.sort((a, b) =>
                new Date(a.assessmentEvent?.date ?? 0).getTime() -
                new Date(b.assessmentEvent?.date ?? 0).getTime()
              );
              resultsMap.set(student.id, filtered);
            });

            return of({ students, notesMap, resultsMap });
          })
        );
      })
    ).subscribe({
      next: ({ students, notesMap, resultsMap }) => {
        const entries: StudentBeurteilung[] = students
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
          .map(student => ({
            student,
            generalNotes: notesMap.get(student.id)?.general ?? [],
            subjectNotes: notesMap.get(student.id)?.subject ?? [],
            results:      resultsMap.get(student.id) ?? [],
          }));
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  eventTypeLabel(type?: AssessmentEventType): string {
    return type ? (TYPE_LABEL[type] ?? type) : '';
  }
}
