import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClassService } from '../class.service';
import { StudentService } from '../../students/student.service';
import { StudentDto, StudentRefDto } from '@app/domain';

@Component({
  selector: 'app-class-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" routerLink="/app/classes">← Klassen</a>
        <h1>{{ isEdit() ? 'Klasse bearbeiten' : 'Neue Klasse' }}</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <section class="form-section">
          <h2>Klasse</h2>
          <div class="field-row">
            <div class="field">
              <label>Bezeichnung *</label>
              <input type="text" formControlName="name" placeholder="z.B. 3A"
                     [class.invalid]="isInvalid('name')" />
              @if (isInvalid('name')) { <span class="field-error">Bezeichnung ist erforderlich</span> }
            </div>
            <div class="field field--sm">
              <label>Schulstufe</label>
              <input type="number" formControlName="schoolLevel" placeholder="z.B. 3" min="1" max="13" />
              <span class="field-hint">1–13</span>
            </div>
          </div>
          <div class="field">
            <label>Schuljahr</label>
            <input type="text" formControlName="schoolYear" placeholder="z.B. 2024/25" />
            <span class="field-hint">Format: 2024/25</span>
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
            <button type="button" class="btn btn-danger" (click)="deleteClass()" [disabled]="saving()">Löschen</button>
          }
          <a class="btn btn-secondary" routerLink="/app/classes">Abbrechen</a>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Wird gespeichert…' : (isEdit() ? 'Speichern' : 'Anlegen') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { margin-bottom: var(--sp-6); }
    .page-header h1 { font-family: var(--font-display); font-size: 26px; font-weight: 400; color: var(--navy); margin: var(--sp-2) 0 0; }
    .back-link { color: var(--ink-faint); font-size: 13px; }
    .back-link:hover { color: var(--ink); }

    .form-section { margin-bottom: var(--sp-6); }
    .form-section h2 {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1.2px; color: var(--ink-faint); margin: 0 0 var(--sp-4);
      display: flex; align-items: center; gap: var(--sp-3);
    }
    .count-badge {
      font-size: 10px; background: var(--navy); color: var(--white);
      padding: 2px 8px; border-radius: 20px; font-weight: 500;
      text-transform: none; letter-spacing: 0;
    }
    .field-row { display: grid; grid-template-columns: 1fr auto; gap: var(--sp-4); align-items: start; }
    .field--sm { min-width: 100px; }
    .field { margin-bottom: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); }
    label { font-size: 13px; font-weight: 500; color: var(--ink-light); }
    .field-hint { font-size: 11px; color: var(--ink-faint); }
    input.invalid { border-color: var(--error-fg); }
    .field-error { font-size: 12px; color: var(--error-fg); }

    .search-wrap { margin-bottom: var(--sp-3); }
    .student-grid { display: flex; flex-direction: column; gap: var(--sp-2); }
    .student-chip {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-3); border: 1.5px solid var(--border);
      border-radius: var(--r-sm); cursor: pointer;
      transition: border-color .12s, background .12s; user-select: none;
    }
    .student-chip:hover { border-color: var(--teal); background: var(--surface); }
    .student-chip.selected { border-color: var(--navy); background: var(--surface); }
    .chip-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: var(--light-teal); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 11px; font-weight: 600; overflow: hidden;
    }
    .chip-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .chip-name { flex: 1; font-size: 13px; color: var(--ink); }
    .chip-check { color: var(--navy); font-size: 12px; font-weight: 700; }
    .state-msg { color: var(--ink-faint); font-size: 13px; margin: 0; }
    .server-error { color: var(--error-fg); font-size: 13px; margin-bottom: var(--sp-4); }
    .form-actions {
      display: flex; justify-content: flex-end; gap: var(--sp-3);
      margin-top: var(--sp-6); padding-top: var(--sp-5);
      border-top: 1px solid var(--border);
    }
    .btn {
      display: inline-flex; align-items: center;
      padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-secondary { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-secondary:hover { border-color: var(--navy); }
    .btn-danger { background: transparent; color: var(--ink-faint); border: 1.5px solid var(--border); margin-right: auto; }
    .btn-danger:hover:not(:disabled) { border-color: var(--error-fg); color: var(--error-fg); }
  `],
})
export class ClassFormComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly classService   = inject(ClassService);
  private readonly studentService = inject(StudentService);

  isEdit             = signal(false);
  classId            = signal<string | null>(null);
  saving             = signal(false);
  serverError        = signal<string | null>(null);
  allStudents        = signal<StudentDto[]>([]);
  selectedStudentIds = signal<Set<string>>(new Set());
  searchQuery        = signal('');

  filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const selected = this.selectedStudentIds();
    const list = q
      ? this.allStudents().filter(s =>
          (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) ||
          (s.lastName + ' ' + s.firstName).toLowerCase().includes(q)
        )
      : this.allStudents();
    return [...list].sort((a, b) => {
      return (selected.has(a.id) ? 0 : 1) - (selected.has(b.id) ? 0 : 1);
    });
  });

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(1)]],
    schoolYear:  [''],
    schoolLevel: [null as number | null],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.isEdit.set(true); this.classId.set(id); }

    this.studentService.getAll().subscribe(students => this.allStudents.set(students));

    if (this.isEdit()) {
      this.classService.getOne(id!).subscribe(cls => {
        this.form.patchValue({
          name:        cls.name,
          schoolYear:  cls.schoolYear ?? '',
          schoolLevel: cls.schoolLevel ?? null,
        });
        const ids: string[] = (cls.students ?? []).map((s: StudentRefDto) => s.id);
        this.selectedStudentIds.set(new Set(ids));
      });
    }
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
      name:        value.name!,
      schoolYear:  value.schoolYear || undefined,
      schoolLevel: value.schoolLevel ?? undefined,
      studentIds:  [...this.selectedStudentIds()],
    };
    const req$ = this.isEdit()
      ? this.classService.update(this.classId()!, dto)
      : this.classService.create(dto);
    req$.subscribe({
      next:  () => this.router.navigate(['/app/classes']),
      error: () => { this.serverError.set('Speichern fehlgeschlagen.'); this.saving.set(false); },
    });
  }

  deleteClass(): void {
    if (!confirm('Klasse wirklich löschen?')) return;
    this.classService.delete(this.classId()!).subscribe({
      next: () => this.router.navigate(['/app/classes']),
    });
  }
}
