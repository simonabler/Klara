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
          <h2>Profilbild</h2>
          <div class="avatar-upload">
            <div class="avatar-preview">
              @if (avatarPreview()) {
                <img [src]="avatarPreview()" alt="Vorschau" />
              } @else {
                <span class="avatar-placeholder">Kein Bild</span>
              }
            </div>
            <label class="btn-secondary file-label">
              Bild auswählen
              <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onFileSelected($event)" hidden />
            </label>
          </div>
        </section>

        <!-- Stammdaten -->
        <section class="form-section">
          <h2>Stammdaten</h2>
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
          <h2>Erziehungsberechtigte</h2>
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
          <a class="btn-secondary" [routerLink]="isEdit() ? ['/students', studentId()] : '/students'">Abbrechen</a>
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
    .back-link { color: #888; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { color: #333; }
    .form-section { margin-bottom: 2rem; }
    .form-section h2 { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin: 0 0 1rem; }
    .field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
    label { font-size: 0.85rem; color: #555; }
    input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
    input:focus { border-color: #1a1a1a; }
    input.invalid { border-color: #c0392b; }
    .field-error { font-size: 0.8rem; color: #c0392b; }
    .avatar-upload { display: flex; align-items: center; gap: 1rem; }
    .avatar-preview { width: 64px; height: 64px; border-radius: 50%; background: #f0f0ee; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder { font-size: 0.7rem; color: #aaa; text-align: center; }
    .file-label { cursor: pointer; }
    .parent-row { border: 1px solid #eee; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
    .parent-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    .btn-remove { margin-top: 0.5rem; background: none; border: none; color: #c0392b; font-size: 0.82rem; cursor: pointer; padding: 0; }
    .btn-add { background: none; border: 1px dashed #ccc; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.875rem; color: #666; cursor: pointer; width: 100%; }
    .btn-add:hover { background: #f9f9f9; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
    .btn-primary { background: #1a1a1a; color: white; padding: 0.6rem 1.25rem; border-radius: 8px; border: none; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #333; }
    .btn-secondary { border: 1px solid #ddd; background: white; padding: 0.6rem 1.25rem; border-radius: 8px; text-decoration: none; font-size: 0.875rem; color: #333; display: inline-block; }
    .btn-secondary:hover { background: #f5f5f5; }
    .server-error { color: #c0392b; font-size: 0.875rem; margin-bottom: 1rem; }
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
