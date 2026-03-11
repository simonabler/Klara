import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClassService } from '../class.service';
import { SchoolLevelService } from '../reference-data.service';
import { StudentService } from '../../students/student.service';
import { StudentDto, SchoolLevelDto } from '@app/domain';

@Component({
  selector: 'app-class-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" routerLink="/classes">← Klassen</a>
        <h1>{{ isEdit() ? 'Klasse bearbeiten' : 'Neue Klasse' }}</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <section class="form-section">
          <h2>Klasse</h2>
          <div class="field">
            <label>Bezeichnung *</label>
            <input type="text" formControlName="name" placeholder="z.B. 3A" [class.invalid]="isInvalid('name')" />
            @if (isInvalid('name')) { <span class="field-error">Bezeichnung ist erforderlich</span> }
          </div>
          <div class="field">
            <label>Schulstufe / Schuljahr</label>
            <select formControlName="schoolLevelId">
              <option value="">— keine —</option>
              @for (level of schoolLevels(); track level.id) {
                <option [value]="level.id">{{ level.name }}{{ level.year ? ' · ' + level.year : '' }}</option>
              }
            </select>
            <a class="field-link" routerLink="/settings">Schulstufen verwalten →</a>
          </div>
        </section>

        <section class="form-section">
          <h2>Schüler <span class="count-badge">{{ selectedStudentIds().size }} ausgewählt</span></h2>

          @if (allStudents().length === 0) {
            <p class="state-msg">Noch keine Schüler angelegt.</p>
          } @else {
            <div class="search-wrap">
              <input class="search-input" type="search" placeholder="Schüler suchen…"
                     [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" />
            </div>

            @if (filteredStudents().length === 0) {
              <p class="state-msg">Keine Treffer für „{{ searchQuery() }}"</p>
            } @else {
              <div class="student-grid">
                @for (student of filteredStudents(); track student.id) {
                  <div class="student-chip" [class.selected]="isSelected(student.id)" (click)="toggleStudent(student.id)">
                    <div class="chip-avatar">
                      @if (student.avatarUrl) {
                        <img [src]="student.avatarUrl" [alt]="student.firstName" />
                      } @else {
                        <span>{{ student.firstName[0] }}{{ student.lastName[0] }}</span>
                      }
                    </div>
                    <span class="chip-name">{{ student.lastName }} {{ student.firstName }}</span>
                    @if (isSelected(student.id)) { <span class="chip-check">✓</span> }
                  </div>
                }
              </div>
            }
          }
        </section>

        @if (serverError()) { <p class="server-error">{{ serverError() }}</p> }

        <div class="form-actions">
          @if (isEdit()) {
            <button type="button" class="btn-danger" (click)="deleteClass()" [disabled]="saving()">Löschen</button>
          }
          <a class="btn-secondary" routerLink="/classes">Abbrechen</a>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ saving() ? 'Wird gespeichert…' : (isEdit() ? 'Speichern' : 'Anlegen') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: 2rem 1.5rem; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.4rem; font-weight: 600; margin: 0.5rem 0 0; }
    .back-link { color: #aaa; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { color: #333; }
    .form-section { margin-bottom: 2rem; }
    .form-section h2 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .count-badge { font-size: 0.7rem; background: #1a1a1a; color: white; padding: 0.1rem 0.5rem; border-radius: 20px; font-weight: 500; text-transform: none; letter-spacing: 0; }
    .field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
    label { font-size: 0.85rem; color: #555; }
    input[type=text], select { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; background: white; }
    input[type=text]:focus, select:focus { border-color: #1a1a1a; }
    input.invalid { border-color: #c0392b; }
    .field-error { font-size: 0.8rem; color: #c0392b; }
    .field-link { font-size: 0.78rem; color: #aaa; text-decoration: none; margin-top: 0.15rem; }
    .field-link:hover { color: #555; }
    .search-wrap { margin-bottom: 0.75rem; }
    .search-input { width: 100%; box-sizing: border-box; padding: 0.45rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.875rem; outline: none; background: white; }
    .search-input:focus { border-color: #1a1a1a; }
    .student-grid { display: flex; flex-direction: column; gap: 0.35rem; }
    .student-chip { display: flex; align-items: center; gap: 0.65rem; padding: 0.5rem 0.75rem; border: 1.5px solid #eee; border-radius: 8px; cursor: pointer; transition: border-color 0.12s, background 0.12s; user-select: none; }
    .student-chip:hover { border-color: #ccc; background: #fafafa; }
    .student-chip.selected { border-color: #1a1a1a; background: #f8f8f6; }
    .chip-avatar { width: 30px; height: 30px; border-radius: 50%; background: #eee; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.72rem; font-weight: 600; color: #777; }
    .chip-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .chip-name { flex: 1; font-size: 0.875rem; }
    .chip-check { color: #1a1a1a; font-size: 0.8rem; font-weight: 700; }
    .state-msg { color: #aaa; font-size: 0.875rem; margin: 0; }
    .server-error { color: #c0392b; font-size: 0.875rem; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
    .btn-primary { background: #1a1a1a; color: white; padding: 0.6rem 1.25rem; border-radius: 8px; border: none; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #333; }
    .btn-secondary { border: 1px solid #ddd; background: white; padding: 0.6rem 1.25rem; border-radius: 8px; text-decoration: none; font-size: 0.875rem; color: #333; display: inline-flex; align-items: center; }
    .btn-secondary:hover { background: #f5f5f5; }
    .btn-danger { background: none; border: 1px solid #e0e0e0; color: #aaa; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.875rem; cursor: pointer; margin-right: auto; }
    .btn-danger:hover:not(:disabled) { border-color: #e74c3c; color: #e74c3c; background: #fdf3f2; }
  `],
})
export class ClassFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly classService = inject(ClassService);
  private readonly studentService = inject(StudentService);
  private readonly schoolLevelService = inject(SchoolLevelService);

  isEdit = signal(false);
  classId = signal<string | null>(null);
  saving = signal(false);
  serverError = signal<string | null>(null);
  allStudents = signal<StudentDto[]>([]);
  schoolLevels = signal<SchoolLevelDto[]>([]);
  selectedStudentIds = signal<Set<string>>(new Set());
  searchQuery = signal('');

  filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allStudents();
    return this.allStudents().filter(s =>
      (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) ||
      (s.lastName + ' ' + s.firstName).toLowerCase().includes(q)
    );
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    schoolLevelId: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.isEdit.set(true); this.classId.set(id); }

    forkJoin({
      students: this.studentService.getAll(),
      levels: this.schoolLevelService.getAll(),
      ...(this.isEdit() ? { cls: this.classService.getOne(id!) } : {}),
    }).subscribe({
      next: (res: any) => {
        this.allStudents.set(res.students);
        this.schoolLevels.set(res.levels);
        if (res.cls) {
          this.form.patchValue({ name: res.cls.name, schoolLevelId: res.cls.schoolLevelId ?? '' });
          // FIX: Backend liefert students[] (Objekte mit .id), nicht studentIds[]
          const ids: string[] = (res.cls.students ?? []).map((s: StudentDto) => s.id);
          this.selectedStudentIds.set(new Set(ids));
        }
      },
    });
  }

  isSelected(id: string): boolean { return this.selectedStudentIds().has(id); }

  toggleStudent(id: string): void {
    const set = new Set(this.selectedStudentIds());
    set.has(id) ? set.delete(id) : set.add(id);
    this.selectedStudentIds.set(set);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.serverError.set(null);
    const value = this.form.getRawValue();
    const dto = {
      name: value.name!,
      schoolLevelId: value.schoolLevelId || undefined,
      studentIds: [...this.selectedStudentIds()],
    };
    const req$ = this.isEdit()
      ? this.classService.update(this.classId()!, dto)
      : this.classService.create(dto);
    req$.subscribe({
      next: () => this.router.navigate(['/classes']),
      error: () => { this.serverError.set('Speichern fehlgeschlagen.'); this.saving.set(false); },
    });
  }

  deleteClass(): void {
    if (!confirm('Klasse wirklich löschen?')) return;
    this.classService.delete(this.classId()!).subscribe({
      next: () => this.router.navigate(['/classes']),
    });
  }
}
