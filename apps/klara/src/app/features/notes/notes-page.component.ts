import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClassService } from '../classes/class.service';
import { SubjectService } from '../classes/reference-data.service';
import { NoteService } from './note.service';
import { ClassDto, SubjectDto, StudentDto, StudentRefDto, NoteDto, CreateNoteDto } from '@app/domain';
import { NoteType } from '@app/domain';

interface StudentNoteEntry {
  student: StudentRefDto;
  notes: NoteDto[];
  newContent: string;
  saving: boolean;
}

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Notizen</h1>
      </header>

      <!-- Kontext-Auswahl -->
      <div class="context-bar">
        <div class="context-field">
          <label>Klasse</label>
          <select [(ngModel)]="selectedClassId" (ngModelChange)="onClassChange($event)">
            <option value="">— Klasse wählen —</option>
            @for (cls of classes(); track cls.id) {
              <option [value]="cls.id">
                {{ cls.name }}{{ cls.schoolYear ? ' · ' + cls.schoolYear : '' }}{{ cls.schoolLevel ? ' · ' + cls.schoolLevel + '. Schulstufe' : '' }}
              </option>
            }
          </select>
        </div>

        <div class="context-field">
          <label>Fach</label>
          <select [(ngModel)]="selectedSubjectId" [disabled]="!selectedClassId">
            <option value="">— Fach wählen —</option>
            @for (s of subjects(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>

        <div class="context-field context-field--type">
          <label>Typ</label>
          <div class="type-tabs">
            @for (t of noteTypes; track t.value) {
              <button class="type-tab" [class.active]="selectedType === t.value"
                (click)="selectedType = t.value">{{ t.label }}</button>
            }
          </div>
        </div>
      </div>

      @if (!selectedClassId) {
        <div class="empty-state">
          <p>Wähle eine Klasse um Notizen einzutragen.</p>
          @if (classes().length === 0) {
            <p class="empty-hint">
              Noch keine Klassen angelegt.
              <a routerLink="/app/classes" class="link">Klasse anlegen →</a>
            </p>
          }
        </div>
      } @else if (loadingStudents()) {
        <p class="state-msg">Lade Schüler…</p>
      } @else if (entries().length === 0) {
        <div class="empty-state">
          <p>Diese Klasse hat noch keine Schüler.</p>
          <a [routerLink]="['/app/classes', selectedClassId, 'edit']" class="link">Schüler zuweisen →</a>
        </div>
      } @else {
        <!-- Schülerliste mit Schnelleingabe -->
        <div class="student-list">
          @for (entry of entries(); track entry.student.id) {
            <div class="student-entry">
              <div class="student-row">
                <div class="avatar">
                  @if (entry.student.avatarUrl) {
                    <img [src]="entry.student.avatarUrl" [alt]="entry.student.firstName" />
                  } @else {
                    <span>{{ entry.student.firstName[0] }}{{ entry.student.lastName[0] }}</span>
                  }
                </div>
                <div class="student-info">
                  <span class="student-name">{{ entry.student.lastName }} {{ entry.student.firstName }}</span>
                  @if (entry.notes.length > 0) {
                    <span class="note-count">{{ entry.notes.length }} Notiz{{ entry.notes.length !== 1 ? 'en' : '' }}</span>
                  }
                </div>
                <a [routerLink]="['/app/students', entry.student.id]" class="profile-link">Profil</a>
              </div>

              <!-- Letzte Notiz als Vorschau -->
              @if (entry.notes[0]) {
                <div class="last-note" [attr.data-type]="entry.notes[0].type">
                  <span class="note-preview">{{ entry.notes[0].content }}</span>
                  <span class="note-date">{{ entry.notes[0].createdAt | date:'dd.MM.yy' }}</span>
                </div>
              }

              <!-- Schnelleingabe -->
              <div class="quick-input">
                <textarea
                  [(ngModel)]="entry.newContent"
                  [placeholder]="quickPlaceholder()"
                  rows="2"
                  class="quick-textarea">
                </textarea>
                <button class="save-btn"
                  [disabled]="!entry.newContent.trim() || entry.saving"
                  (click)="saveNote(entry)">
                  {{ entry.saving ? '…' : 'Speichern' }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 760px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { margin-bottom: var(--sp-5); }
    h1 { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--navy); margin: 0; }

    /* ── Kontext-Bar ── */
    .context-bar {
      display: flex; gap: var(--sp-4); align-items: flex-end;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: var(--sp-4) var(--sp-5);
      margin-bottom: var(--sp-5); flex-wrap: wrap;
    }
    .context-field { display: flex; flex-direction: column; gap: var(--sp-1); flex: 1; min-width: 140px; }
    .context-field--type { flex: 2; }
    .context-field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--ink-faint); }
    select { width: 100%; }
    select:disabled { opacity: .5; }

    .type-tabs { display: flex; gap: 4px; }
    .type-tab {
      flex: 1; padding: 7px 10px; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: transparent;
      font-size: 13px; font-weight: 500; color: var(--ink-light);
      cursor: pointer; transition: all .12s; font-family: var(--font-body);
    }
    .type-tab:hover { border-color: var(--teal); color: var(--teal); }
    .type-tab.active { border-color: var(--navy); background: var(--navy); color: var(--white); }

    /* ── States ── */
    .empty-state {
      padding: var(--sp-7) var(--sp-5); text-align: center;
      background: var(--white); border: 1px dashed var(--border); border-radius: var(--r-lg);
    }
    .empty-state p { font-size: 14px; color: var(--ink-faint); margin: 0 0 var(--sp-2); }
    .empty-hint { font-size: 13px !important; }
    .link { color: var(--teal); text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
    .state-msg { color: var(--ink-faint); font-size: 14px; }

    /* ── Schülerliste ── */
    .student-list { display: flex; flex-direction: column; gap: var(--sp-3); }
    .student-entry {
      background: var(--white); border-radius: var(--r-md);
      border: 1px solid var(--border); overflow: hidden;
      transition: border-color .15s;
    }
    .student-entry:focus-within { border-color: var(--teal); }

    .student-row {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
    }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--light-teal); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 12px; font-weight: 600; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .student-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .student-name { font-size: 14px; font-weight: 500; color: var(--navy); }
    .note-count { font-size: 11px; color: var(--ink-faint); }
    .profile-link {
      font-size: 12px; color: var(--ink-faint); text-decoration: none;
      padding: 4px 10px; border: 1px solid var(--border); border-radius: var(--r-sm);
    }
    .profile-link:hover { color: var(--teal); border-color: var(--teal); }

    /* ── Letzte Notiz ── */
    .last-note {
      display: flex; align-items: baseline; gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-4);
      background: var(--surface);
      border-top: 1px solid var(--border);
      border-left: 3px solid var(--teal);
    }
    .last-note[data-type="BEHAVIOUR"] { border-left-color: var(--sand); }
    .last-note[data-type="GENERAL"] { border-left-color: var(--border); }
    .note-preview { font-size: 12px; color: var(--ink-light); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .note-date { font-size: 11px; color: var(--ink-faint); flex-shrink: 0; }

    /* ── Schnelleingabe ── */
    .quick-input {
      display: flex; gap: var(--sp-2); align-items: flex-end;
      padding: var(--sp-3) var(--sp-4);
      border-top: 1px solid var(--border);
    }
    .quick-textarea {
      flex: 1; border: 1.5px solid var(--border); border-radius: var(--r-sm);
      padding: 8px 10px; font-family: var(--font-body); font-size: 13px;
      color: var(--ink); resize: none; outline: none; transition: border-color .15s;
    }
    .quick-textarea:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(123,170,186,0.15); }
    .save-btn {
      padding: 7px 16px; background: var(--navy); color: var(--white);
      border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 500;
      cursor: pointer; font-family: var(--font-body); white-space: nowrap;
      transition: background .12s; flex-shrink: 0; align-self: flex-end;
    }
    .save-btn:hover:not(:disabled) { background: #243350; }
    .save-btn:disabled { opacity: .4; cursor: not-allowed; }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      h1 { font-size: 22px; }
      .context-bar { flex-direction: column; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); }
      .context-field, .context-field--type { min-width: 0; flex: unset; width: 100%; }
      .type-tabs .type-tab { padding: 6px 8px; font-size: 12px; }
      .student-entry { border-radius: var(--r-md); }
      .student-row { padding: var(--sp-2) var(--sp-3); }
    }
  `],
})
export class NotesPageComponent implements OnInit {
  private readonly classService   = inject(ClassService);
  private readonly subjectService = inject(SubjectService);
  private readonly noteService    = inject(NoteService);

  classes         = signal<ClassDto[]>([]);
  subjects        = signal<SubjectDto[]>([]);
  loadingStudents = signal(false);

  selectedClassId  = '';
  selectedSubjectId = '';
  selectedType     = NoteType.PARTICIPATION;

  private _entries = signal<StudentNoteEntry[]>([]);
  entries = computed(() => this._entries());

  readonly noteTypes = [
    { value: NoteType.PARTICIPATION, label: 'Mitarbeit' },
    { value: NoteType.BEHAVIOUR,     label: 'Verhalten' },
    { value: NoteType.GENERAL,       label: 'Allgemein' },
  ];

  ngOnInit(): void {
    this.classService.getAll().subscribe(cls => this.classes.set(cls));
    this.subjectService.getAll().subscribe(s => this.subjects.set(s));
  }

  onClassChange(classId: string): void {
    this.selectedClassId = classId;
    this._entries.set([]);
    if (!classId) return;

    this.loadingStudents.set(true);
    this.classService.getOne(classId).subscribe({
      next: (cls) => {
        const students: StudentRefDto[] = cls.students ?? [];
        // Notizen für alle Schüler dieser Klasse laden
        this.noteService.getAll({ classId }).subscribe({
          next: (allNotes) => {
            const notesByStudent = new Map<string, NoteDto[]>();
            for (const n of allNotes) {
              if (!notesByStudent.has(n.studentId)) notesByStudent.set(n.studentId, []);
              notesByStudent.get(n.studentId)!.push(n);
            }
            const entries: StudentNoteEntry[] = students
              .sort((a, b) => a.lastName.localeCompare(b.lastName))
              .map(s => ({
                student:    s,
                notes:      notesByStudent.get(s.id) ?? [],
                newContent: '',
                saving:     false,
              }));
            this._entries.set(entries);
            this.loadingStudents.set(false);
          },
          error: () => this.loadingStudents.set(false),
        });
      },
      error: () => this.loadingStudents.set(false),
    });
  }

  quickPlaceholder(): string {
    const type = this.noteTypes.find(t => t.value === this.selectedType);
    const subject = this.subjects().find(s => s.id === this.selectedSubjectId);
    const parts = [type?.label ?? 'Notiz'];
    if (subject) parts.push(subject.name);
    return parts.join(' · ') + ' …';
  }

  saveNote(entry: StudentNoteEntry): void {
    if (!entry.newContent.trim()) return;
    entry.saving = true;

    const dto: CreateNoteDto = {
      content:   entry.newContent.trim(),
      type:      this.selectedType,
      studentId: entry.student.id,
      subjectId: this.selectedSubjectId || undefined,
      classId:   this.selectedClassId   || undefined,
    };

    this.noteService.create(dto).subscribe({
      next: (created) => {
        // Subject + Class Namen lokal befüllen
        const subject = this.subjects().find(s => s.id === created.subjectId);
        if (subject && !created.subject) (created as any).subject = subject;

        this._entries.update(list =>
          list.map(e => e.student.id === entry.student.id
            ? { ...e, notes: [created, ...e.notes], newContent: '', saving: false }
            : e
          )
        );
      },
      error: () => { entry.saving = false; },
    });
  }
}
