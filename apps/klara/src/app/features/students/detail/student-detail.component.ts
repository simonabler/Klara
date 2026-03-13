import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../student.service';
import { NoteService } from '../../notes/note.service';
import { AssessmentService } from '../../assessments/assessment.service';
import { SubjectService } from '../../classes/reference-data.service';
import { ClassService } from '../../classes/class.service';
import { StudentDto, NoteDto, CreateNoteDto, UpdateNoteDto, SubjectDto, StudentResultDto, ClassDto } from '@app/domain';
import { NoteType } from '@app/domain';

interface SubjectGroup {
  subjectId: string | null;
  subjectName: string;
  notes: NoteDto[];
}

interface ResultGroup {
  subjectId: string | null;
  subjectName: string;
  results: StudentResultDto[];
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.scss',
})
export class StudentDetailComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly studentService = inject(StudentService);
  private readonly noteService    = inject(NoteService);
  private readonly subjectService    = inject(SubjectService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly classService      = inject(ClassService);

  student      = signal<StudentDto | null>(null);
  loading      = signal(true);
  error        = signal<string | null>(null);

  notes        = signal<NoteDto[]>([]);
  notesLoading = signal(false);
  saving       = signal(false);

  /** Leistungsergebnisse dieses Schülers */
  results        = signal<StudentResultDto[]>([]);
  resultsLoading = signal(false);

  /** Löschen-Bestätigung */
  confirmDelete = signal(false);
  deleting      = signal(false);

  /** Export */
  showExportMenu = signal(false);
  exporting      = signal(false);

  /** Klassen-Verwaltung im Profil */
  allClasses       = signal<ClassDto[]>([]);
  showClassPicker  = signal(false);
  savingClasses    = signal(false);

  /** Leistungen nach Fach gruppiert */
  resultGroups = computed<ResultGroup[]>(() => {
    const groups = new Map<string, ResultGroup>();
    for (const result of this.results()) {
      const key = result.assessmentEvent?.subjectId ?? '__none__';
      if (!groups.has(key)) {
        groups.set(key, {
          subjectId:   result.assessmentEvent?.subjectId ?? null,
          subjectName: result.assessmentEvent?.subjectName ?? 'Allgemein',
          results: [],
        });
      }
      groups.get(key)!.results.push(result);
    }
    // Sortierung: Fächer alphabetisch, Allgemein ans Ende
    return Array.from(groups.values()).sort((a, b) => {
      if (a.subjectId === null) return 1;
      if (b.subjectId === null) return -1;
      return a.subjectName.localeCompare(b.subjectName);
    });
  });

  /** Alle Fächer der Lehrkraft – aus der API geladen */
  subjects     = signal<SubjectDto[]>([]);

  showNewNoteForm = signal(false);
  editingNoteId   = signal<string | null>(null);

  filterType           = signal<NoteType | null>(null);
  filterSubjectId      = signal<string | null>(null);
  filterSubjectIdValue = '';

  newNote = { content: '', type: NoteType.PARTICIPATION, subjectId: '' };
  editNote = { content: '', type: NoteType.PARTICIPATION, subjectId: '', classId: '' };

  readonly noteTypes = [
    { value: NoteType.PARTICIPATION, label: 'Mitarbeit' },
    { value: NoteType.BEHAVIOUR,     label: 'Verhalten' },
    { value: NoteType.GENERAL,       label: 'Allgemein' },
  ];

  /** Fächer für das Dropdown – direkt aus der API */
  availableSubjects = computed<SubjectDto[]>(() => this.subjects());

  filteredGroups = computed<SubjectGroup[]>(() => {
    let list = this.notes();
    if (this.filterType())      list = list.filter(n => n.type === this.filterType());
    if (this.filterSubjectId()) list = list.filter(n => n.subjectId === this.filterSubjectId());

    const groups = new Map<string, SubjectGroup>();
    for (const note of list) {
      const key = note.subjectId ?? '__none__';
      if (!groups.has(key)) {
        groups.set(key, {
          subjectId:   note.subjectId ?? null,
          subjectName: note.subject?.name ?? 'Allgemein',
          notes:       [],
        });
      }
      groups.get(key)!.notes.push(note);
    }
    return Array.from(groups.values());
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    // Schüler, Fächer und Klassen parallel laden
    this.subjectService.getAll().subscribe({
      next: (data) => this.subjects.set(data),
    });
    this.classService.getAll().subscribe({
      next: (data) => this.allClasses.set(data),
    });
    this.studentService.getOne(id).subscribe({
      next:  (data) => { this.student.set(data); this.loading.set(false); this.loadNotes(); this.loadResults(); },
      error: ()     => { this.error.set('Schüler konnte nicht geladen werden.'); this.loading.set(false); },
    });
  }

  initials(): string {
    const s = this.student();
    if (!s) return '';
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  typeLabel(type: NoteType): string {
    return this.noteTypes.find(t => t.value === type)?.label ?? type;
  }

  loadNotes(): void {
    const studentId = this.student()?.id;
    if (!studentId) return;
    this.notesLoading.set(true);
    this.noteService.getAll({ studentId }).subscribe({
      next:  (data) => { this.notes.set(data); this.notesLoading.set(false); },
      error: ()     => { this.notesLoading.set(false); },
    });
  }

  loadResults(): void {
    const studentId = this.student()?.id;
    if (!studentId) return;
    this.resultsLoading.set(true);
    this.assessmentService.getResultsForStudent(studentId).subscribe({
      next:  (data) => { this.results.set(data); this.resultsLoading.set(false); },
      error: ()     => { this.resultsLoading.set(false); },
    });
  }

  gradeLabel(grade: number | undefined): string {
    const labels: Record<number, string> = { 1: 'Sehr gut', 2: 'Gut', 3: 'Befriedigend', 4: 'Genügend', 5: 'Nicht genügend' };
    return grade != null ? labels[grade] ?? String(grade) : '—';
  }

  toggleNewNoteForm(): void {
    this.showNewNoteForm.update(v => !v);
    if (!this.showNewNoteForm()) this.resetNewNote();
  }

  cancelNewNote(): void {
    this.showNewNoteForm.set(false);
    this.resetNewNote();
  }

  resetNewNote(): void {
    this.newNote = { content: '', type: NoteType.PARTICIPATION, subjectId: '' };
  }

  saveNote(): void {
    if (!this.newNote.content.trim() || !this.student()) return;
    this.saving.set(true);
    const dto: CreateNoteDto = {
      content:   this.newNote.content.trim(),
      type:      this.newNote.type,
      studentId: this.student()!.id,
      subjectId: this.newNote.subjectId || undefined,
    };
    this.noteService.create(dto).subscribe({
      next: (created) => {
        // Subject-Name aus lokaler Liste befüllen für sofortige Anzeige
        const subject = this.subjects().find(s => s.id === created.subjectId);
        if (subject && !created.subject) {
          (created as any).subject = { id: subject.id, name: subject.name };
        }
        this.notes.update(list => [created, ...list]);
        this.saving.set(false);
        this.showNewNoteForm.set(false);
        this.resetNewNote();
      },
      error: () => { this.saving.set(false); },
    });
  }

  startEdit(note: NoteDto): void {
    this.editingNoteId.set(note.id);
    this.editNote = { content: note.content, type: note.type, subjectId: note.subjectId ?? '', classId: note.classId ?? '' };
  }

  cancelEdit(): void {
    this.editingNoteId.set(null);
  }

  updateNote(id: string): void {
    if (!this.editNote.content.trim()) return;
    const dto: UpdateNoteDto = {
      content:   this.editNote.content.trim(),
      type:      this.editNote.type,
      subjectId: this.editNote.subjectId || undefined,
      classId:   this.editNote.classId || undefined,
    };
    this.noteService.update(id, dto).subscribe({
      next: (updated) => {
        // Subject-Name aus lokaler Liste befüllen
        const subject = this.subjects().find(s => s.id === updated.subjectId);
        if (subject && !updated.subject) {
          (updated as any).subject = { id: subject.id, name: subject.name };
        }
        this.notes.update(list => list.map(n => n.id === id ? updated : n));
        this.editingNoteId.set(null);
      },
    });
  }

  deleteNote(id: string): void {
    if (!confirm('Notiz wirklich löschen?')) return;
    this.noteService.delete(id).subscribe({
      next: () => { this.notes.update(list => list.filter(n => n.id !== id)); },
    });
  }

  setFilterType(type: NoteType | null): void {
    this.filterType.set(type);
  }

  deleteStudent(): void {
    const s = this.student();
    if (!s) return;
    this.deleting.set(true);
    this.studentService.delete(s.id).subscribe({
      next: () => this.router.navigate(['/app/students']),
      error: () => { this.deleting.set(false); this.confirmDelete.set(false); },
    });
  }

  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
  }

  exportJson(): void {
    const s = this.student();
    if (!s || this.exporting()) return;
    this.exporting.set(true);
    this.studentService.exportData(s.id).subscribe({
      next: (data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${s.lastName}_${s.firstName}_export.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.showExportMenu.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  exportPrint(): void {
    const s = this.student();
    if (!s) return;
    this.showExportMenu.set(false);

    const notes   = this.notes();
    const results = this.results();

    const formatDate = (d: string | Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString('de-AT') : '–';

    const notesHtml = notes.length
      ? notes.map(n => `
          <tr>
            <td>${n.type}</td>
            <td>${(n as any).subjectName ?? '–'}</td>
            <td>${n.content}</td>
            <td>${formatDate(n.createdAt)}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="color:#888">Keine Notizen vorhanden</td></tr>';

    const resultsHtml = results.length
      ? results.map(r => `
          <tr>
            <td>${r.assessmentEvent?.title ?? '–'}</td>
            <td>${r.assessmentEvent?.subjectName ?? '–'}</td>
            <td>${formatDate((r.assessmentEvent as any)?.date)}</td>
            <td>${r.grade ?? '–'}</td>
            <td>${r.points ?? '–'}</td>
            <td>${r.comment ?? '–'}</td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="color:#888">Keine Leistungen vorhanden</td></tr>';

    const parentsHtml = s.parents?.length
      ? s.parents.map(p => `${p.firstName} ${p.lastName}`).join(', ')
      : '–';

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${s.lastName} ${s.firstName} – Klara Export</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; color: #1C2B3A; padding: 32px; font-size: 13px; }
    h1   { font-size: 22px; font-weight: 400; color: #2E3F5C; margin: 0 0 4px; }
    .meta { color: #8A9AA8; font-size: 12px; margin-bottom: 24px; }
    h2   { font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
           color: #8A9AA8; margin: 24px 0 8px; border-bottom: 1px solid #DDE3E8; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 8px; }
    .info-row  { display: flex; gap: 8px; }
    .info-label { color: #8A9AA8; min-width: 110px; }
    table  { width: 100%; border-collapse: collapse; }
    th     { text-align: left; font-size: 11px; color: #8A9AA8; font-weight: 600;
             padding: 6px 8px; border-bottom: 1px solid #DDE3E8; }
    td     { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    .footer { margin-top: 32px; color: #8A9AA8; font-size: 11px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${s.firstName} ${s.lastName}</h1>
  <div class="meta">Exportiert am ${new Date().toLocaleDateString('de-AT')} · Klara</div>

  <h2>Stammdaten</h2>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Geburtsdatum</span> ${formatDate(s.dateOfBirth)}</div>
    <div class="info-row"><span class="info-label">Eltern</span> ${parentsHtml}</div>
    <div class="info-row"><span class="info-label">Klassen</span> ${s.classes?.map(c => c.name).join(', ') || '–'}</div>
  </div>

  <h2>Notizen (${notes.length})</h2>
  <table>
    <thead><tr><th>Typ</th><th>Fach</th><th>Inhalt</th><th>Datum</th></tr></thead>
    <tbody>${notesHtml}</tbody>
  </table>

  <h2>Leistungsergebnisse (${results.length})</h2>
  <table>
    <thead><tr><th>Ereignis</th><th>Fach</th><th>Datum</th><th>Note</th><th>Punkte</th><th>Kommentar</th></tr></thead>
    <tbody>${resultsHtml}</tbody>
  </table>

  <div class="footer">Erstellt mit Klara · Datenexport gemäß DSGVO Art. 20</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  /** Ist der Schüler bereits in dieser Klasse? */
  isInClass(classId: string): boolean {
    return this.student()?.classes?.some(c => c.id === classId) ?? false;
  }

  /** Klasse hinzufügen oder entfernen */
  toggleClass(cls: ClassDto): void {
    const s = this.student();
    if (!s || this.savingClasses()) return;

    const currentIds = s.classes?.map(c => c.id) ?? [];
    const isIn = currentIds.includes(cls.id);
    const newIds = isIn
      ? currentIds.filter(id => id !== cls.id)
      : [...currentIds, cls.id];

    this.savingClasses.set(true);
    this.classService.update(cls.id, { studentIds: newIds.includes(cls.id)
      // Wir patchen die Klasse mit allen ihren aktuellen Schülern ± diesem Schüler
      ? [...(cls.studentIds ?? []), s.id]
      : (cls.studentIds ?? []).filter((id: string) => id !== s.id)
    }).subscribe({
      next: () => {
        // Schüler-Profil neu laden um aktuelle Klassen zu zeigen
        this.studentService.getOne(s.id).subscribe({
          next: (updated) => {
            this.student.set(updated);
            this.savingClasses.set(false);
          },
          error: () => this.savingClasses.set(false),
        });
        // allClasses neu laden
        this.classService.getAll().subscribe({
          next: (data) => this.allClasses.set(data),
        });
      },
      error: () => this.savingClasses.set(false),
    });
  }
}
