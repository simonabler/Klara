import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, AbstractControl } from '@angular/forms';
import { StudentService } from '../student.service';
import { StudentDto } from '@app/domain';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" [routerLink]="isEdit() ? ['/students', studentId()] : '/students'">← Zurück</a>
        <h1>{{ isEdit() ? 'Schüler bearbeiten' : 'Neuer Schüler' }}</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Avatar Upload -->
        <section class="form-section">
          <div class="section-label">Profilbild</div>
          <div class="avatar-upload">
            <div class="avatar-preview">
              @if (avatarPreview()) {
                <img [src]="avatarPreview()" alt="Vorschau" />
              } @else {
                <span class="avatar-placeholder">Kein Bild</span>
              }
            </div>
            <label class="file-label">
              Bild auswählen
              <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onFileSelected($event)" hidden />
            </label>
          </div>
        </section>

        <!-- Stammdaten -->
        <section class="form-section">
          <div class="section-label">Stammdaten</div>
          <div class="field">
            <label>Vorname *</label>
            <input type="text" formControlName="firstName" [class.invalid]="isInvalid('firstName')" />
            @if (isInvalid('firstName')) { <span class="field-error">Vorname ist erforderlich</span> }
          </div>
          <div class="field">
            <label>Nachname *</label>
            <input type="text" formControlName="lastName" [class.invalid]="isInvalid('lastName')" />
            @if (isInvalid('lastName')) { <span class="field-error">Nachname ist erforderlich</span> }
          </div>
          <div class="field">
            <label>Geburtsdatum</label>
            <input type="date" formControlName="dateOfBirth" />
          </div>
        </section>

        <!-- Eltern -->
        <section class="form-section">
          <div class="section-label">Erziehungsberechtigte</div>
          <div formArrayName="parents">
            @for (parent of parentsArray.controls; track $index) {
              <div class="parent-row" [formGroupName]="$index">
                <div class="parent-fields">
                  <div class="field">
                    <label>Vorname *</label>
                    <input type="text" formControlName="firstName" [class.invalid]="isParentInvalid($index, 'firstName')" />
                  </div>
                  <div class="field">
                    <label>Nachname *</label>
                    <input type="text" formControlName="lastName" [class.invalid]="isParentInvalid($index, 'lastName')" />
                  </div>
                  <div class="field">
                    <label>E-Mail</label>
                    <input type="email" formControlName="email" />
                  </div>
                  <div class="field">
                    <label>Telefon</label>
                    <input type="tel" formControlName="phone" />
                  </div>
                </div>
                <button type="button" class="btn-remove" (click)="removeParent($index)">Entfernen</button>
              </div>
            }
          </div>
          <button type="button" class="btn-add" (click)="addParent()">+ Erziehungsberechtigten hinzufügen</button>
        </section>

        @if (serverError()) {
          <p class="server-error">{{ serverError() }}</p>
        }

        <div class="form-actions">
          <a class="btn btn-secondary" [routerLink]="isEdit() ? ['/students', studentId()] : '/students'">Abbrechen</a>
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
    .page-header h1 {
      font-family: var(--font-display);
      font-size: 26px; font-weight: 400; color: var(--navy);
      margin: var(--sp-2) 0 0;
    }
    .back-link { color: var(--ink-faint); font-size: 13px; transition: color .15s; }
    .back-link:hover { color: var(--ink); }

    .form-section { margin-bottom: var(--sp-6); }
    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--ink-faint);
      margin-bottom: var(--sp-4);
      display: flex; align-items: center; gap: var(--sp-3);
    }
    .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .field { margin-bottom: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); }
    label { font-size: 13px; font-weight: 500; color: var(--ink-light); }
    input.invalid { border-color: var(--error-fg) !important; }
    .field-error { font-size: 12px; color: var(--error-fg); }

    /* Avatar */
    .avatar-upload { display: flex; align-items: center; gap: var(--sp-4); }
    .avatar-preview {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--light-teal); overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder { font-size: 11px; color: var(--ink-faint); text-align: center; }
    .file-label {
      display: inline-flex; align-items: center;
      padding: 8px 14px; border: 1.5px solid var(--border);
      border-radius: var(--r-sm); background: var(--white);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      color: var(--ink-light); cursor: pointer; transition: all .15s;
    }
    .file-label:hover { border-color: var(--teal); color: var(--ink); }

    /* Parents */
    .parent-row {
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: var(--sp-4); margin-bottom: var(--sp-3);
      background: var(--surface);
    }
    .parent-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--sp-4); }
    .btn-remove {
      background: none; border: none; color: var(--ink-faint);
      font-size: 12px; cursor: pointer; padding: var(--sp-2) 0 0;
      font-family: var(--font-body); transition: color .15s;
    }
    .btn-remove:hover { color: var(--error-fg); }
    .btn-add {
      background: none; border: 1.5px dashed var(--border);
      border-radius: var(--r-sm); padding: var(--sp-3) var(--sp-4);
      font-family: var(--font-body); font-size: 13px; color: var(--ink-faint);
      cursor: pointer; width: 100%; transition: all .15s;
    }
    .btn-add:hover { border-color: var(--teal); color: var(--ink-light); background: var(--surface); }

    .server-error {
      color: var(--error-fg); font-size: 13px;
      background: var(--error-bg); border: 1px solid #f5c0b8;
      border-radius: var(--r-sm); padding: var(--sp-3) var(--sp-4);
      margin-bottom: var(--sp-4);
    }

    .form-actions {
      display: flex; justify-content: flex-end; gap: var(--sp-3);
      margin-top: var(--sp-6); padding-top: var(--sp-5);
      border-top: 1px solid var(--border);
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; box-shadow: var(--sh-md); }
    .btn-secondary {
      background: transparent; color: var(--ink-light);
      border: 1.5px solid var(--border);
    }
    .btn-secondary:hover { border-color: var(--navy); color: var(--ink); }
  `],
})
export class StudentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentService = inject(StudentService);

  isEdit = signal(false);
  studentId = signal<string | null>(null);
  saving = signal(false);
  serverError = signal<string | null>(null);
  avatarPreview = signal<string | null>(null);
  private selectedFile: File | null = null;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    dateOfBirth: [''],
    parents: this.fb.array([]),
  });

  get parentsArray(): FormArray {
    return this.form.get('parents') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.studentId.set(id);
      this.loadStudent(id);
    }
  }

  private loadStudent(id: string): void {
    this.studentService.getOne(id).subscribe({
      next: (student: StudentDto) => {
        this.form.patchValue({
          firstName: student.firstName,
          lastName: student.lastName,
          dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        });
        if (student.avatarUrl) this.avatarPreview.set(student.avatarUrl);
        student.parents?.forEach((p) => this.parentsArray.push(this.createParentGroup(p)));
      },
    });
  }

  private createParentGroup(data?: any) {
    return this.fb.group({
      firstName: [data?.firstName ?? '', Validators.required],
      lastName: [data?.lastName ?? '', Validators.required],
      email: [data?.email ?? ''],
      phone: [data?.phone ?? ''],
    });
  }

  addParent(): void {
    this.parentsArray.push(this.createParentGroup());
  }

  removeParent(index: number): void {
    this.parentsArray.removeAt(index);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isParentInvalid(index: number, field: string): boolean {
    const ctrl = this.parentsArray.at(index)?.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.serverError.set(null);

    const value = this.form.getRawValue();
    const dto = {
      firstName: value.firstName!,
      lastName: value.lastName!,
      dateOfBirth: value.dateOfBirth || undefined,
      parents: (value.parents as any[]).map((p: any) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email?.trim() || undefined,
        phone: p.phone?.trim() || undefined,
      })),
    };

    const request$ = this.isEdit()
      ? this.studentService.update(this.studentId()!, dto)
      : this.studentService.create(dto);

    request$.subscribe({
      next: (student) => {
        if (this.selectedFile) {
          this.studentService.uploadAvatar(student.id, this.selectedFile).subscribe({
            next: () => this.router.navigate(['/students', student.id]),
            error: () => this.router.navigate(['/students', student.id]),
          });
        } else {
          this.router.navigate(['/students', student.id]);
        }
      },
      error: () => {
        this.serverError.set('Speichern fehlgeschlagen. Bitte erneut versuchen.');
        this.saving.set(false);
      },
    });
  }
}
