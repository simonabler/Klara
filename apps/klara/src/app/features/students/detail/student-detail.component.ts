import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../student.service';
import { NoteService } from '../../notes/note.service';
import { SubjectService } from '../../classes/reference-data.service';
import { StudentDto, NoteDto, CreateNoteDto, UpdateNoteDto, SubjectDto } from '@app/domain';
import { NoteType } from '@app/domain';

interface SubjectGroup {
  subjectId: string | null;
  subjectName: string;
  notes: NoteDto[];
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
  private readonly studentService = inject(StudentService);
  private readonly noteService    = inject(NoteService);
  private readonly subjectService = inject(SubjectService);

  student      = signal<StudentDto | null>(null);
  loading      = signal(true);
  error        = signal<string | null>(null);

  notes        = signal<NoteDto[]>([]);
  notesLoading = signal(false);
  saving       = signal(false);

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
    // Schüler und Fächer parallel laden
    this.subjectService.getAll().subscribe({
      next: (data) => this.subjects.set(data),
    });
    this.studentService.getOne(id).subscribe({
      next:  (data) => { this.student.set(data); this.loading.set(false); this.loadNotes(); },
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
}
