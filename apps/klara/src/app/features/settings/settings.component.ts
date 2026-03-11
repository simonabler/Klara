import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SubjectService, SchoolLevelService } from '../classes/reference-data.service';
import { SubjectDto, SchoolLevelDto } from '@app/domain';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Einstellungen</h1>
      </header>

      <!-- Fächer -->
      <section class="settings-section">
        <h2>Fächer</h2>
        <ul class="item-list">
          @for (subject of subjects(); track subject.id) {
            <li class="item-row">
              @if (editingSubject() === subject.id) {
                <input class="inline-input" [value]="subject.name" #subjectInput (keydown.enter)="saveSubject(subject.id, subjectInput.value)" (keydown.escape)="editingSubject.set(null)" />
                <button class="btn-save" (click)="saveSubject(subject.id, subjectInput.value)">Speichern</button>
                <button class="btn-cancel" (click)="editingSubject.set(null)">Abbrechen</button>
              } @else {
                <span class="item-name">{{ subject.name }}</span>
                <button class="btn-icon" (click)="editingSubject.set(subject.id)" title="Bearbeiten">✎</button>
                <button class="btn-icon danger" (click)="deleteSubject(subject.id)" title="Löschen">✕</button>
              }
            </li>
          }
        </ul>
        <form [formGroup]="subjectForm" (ngSubmit)="addSubject()" class="add-row">
          <input type="text" formControlName="name" placeholder="Neues Fach" />
          <button type="submit" class="btn-add" [disabled]="subjectForm.invalid">+ Hinzufügen</button>
        </form>
      </section>

      <!-- Schulstufen -->
      <section class="settings-section">
        <h2>Schulstufen / Schuljahre</h2>
        <ul class="item-list">
          @for (level of schoolLevels(); track level.id) {
            <li class="item-row">
              @if (editingLevel() === level.id) {
                <input class="inline-input" [value]="level.name" #levelName style="width:120px" (keydown.escape)="editingLevel.set(null)" />
                <input class="inline-input" [value]="level.year ?? ''" #levelYear placeholder="Schuljahr" style="width:100px" (keydown.escape)="editingLevel.set(null)" />
                <button class="btn-save" (click)="saveLevel(level.id, levelName.value, levelYear.value)">Speichern</button>
                <button class="btn-cancel" (click)="editingLevel.set(null)">Abbrechen</button>
              } @else {
                <span class="item-name">{{ level.name }}@if (level.year) { <span class="item-sub">· {{ level.year }}</span> }</span>
                <button class="btn-icon" (click)="editingLevel.set(level.id)" title="Bearbeiten">✎</button>
                <button class="btn-icon danger" (click)="deleteLevel(level.id)" title="Löschen">✕</button>
              }
            </li>
          }
        </ul>
        <form [formGroup]="levelForm" (ngSubmit)="addLevel()" class="add-row">
          <input type="text" formControlName="name" placeholder="Bezeichnung" style="width:140px" />
          <input type="text" formControlName="year" placeholder="Schuljahr (opt.)" style="width:140px" />
          <button type="submit" class="btn-add" [disabled]="levelForm.invalid">+ Hinzufügen</button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: 2rem 1.5rem; }
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .settings-section { margin-bottom: 2.5rem; }
    .settings-section h2 { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin: 0 0 0.75rem; }
    .item-list { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .item-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: 1px solid #eee; border-radius: 8px; }
    .item-name { flex: 1; font-size: 0.9rem; }
    .item-sub { color: #aaa; margin-left: 0.3rem; }
    .btn-icon { background: none; border: none; color: #aaa; cursor: pointer; font-size: 0.95rem; padding: 0 0.25rem; }
    .btn-icon:hover { color: #333; }
    .btn-icon.danger:hover { color: #e74c3c; }
    .inline-input { padding: 0.3rem 0.5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 0.875rem; flex: 1; outline: none; }
    .inline-input:focus { border-color: #1a1a1a; }
    .btn-save { background: #1a1a1a; color: white; border: none; padding: 0.3rem 0.7rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
    .btn-cancel { background: none; border: 1px solid #ddd; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; color: #666; }
    .add-row { display: flex; gap: 0.5rem; align-items: center; }
    .add-row input { padding: 0.45rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.875rem; flex: 1; outline: none; }
    .add-row input:focus { border-color: #1a1a1a; }
    .btn-add { background: #1a1a1a; color: white; border: none; padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.875rem; cursor: pointer; white-space: nowrap; }
    .btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly schoolLevelService = inject(SchoolLevelService);
  private readonly fb = inject(FormBuilder);

  subjects = signal<SubjectDto[]>([]);
  schoolLevels = signal<SchoolLevelDto[]>([]);
  editingSubject = signal<string | null>(null);
  editingLevel = signal<string | null>(null);

  subjectForm = this.fb.group({ name: ['', [Validators.required, Validators.minLength(1)]] });
  levelForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    year: [''],
  });

  ngOnInit(): void {
    this.loadSubjects();
    this.loadLevels();
  }

  loadSubjects(): void {
    this.subjectService.getAll().subscribe({ next: (d) => this.subjects.set(d) });
  }

  loadLevels(): void {
    this.schoolLevelService.getAll().subscribe({ next: (d) => this.schoolLevels.set(d) });
  }

  addSubject(): void {
    if (this.subjectForm.invalid) return;
    this.subjectService.create({ name: this.subjectForm.value.name! }).subscribe({
      next: () => { this.subjectForm.reset(); this.loadSubjects(); },
    });
  }

  saveSubject(id: string, name: string): void {
    if (!name.trim()) return;
    this.subjectService.update(id, { name: name.trim() }).subscribe({
      next: () => { this.editingSubject.set(null); this.loadSubjects(); },
    });
  }

  deleteSubject(id: string): void {
    if (!confirm('Fach löschen?')) return;
    this.subjectService.delete(id).subscribe({ next: () => this.loadSubjects() });
  }

  addLevel(): void {
    if (this.levelForm.invalid) return;
    const v = this.levelForm.value;
    this.schoolLevelService.create({ name: v.name!, year: v.year || undefined }).subscribe({
      next: () => { this.levelForm.reset(); this.loadLevels(); },
    });
  }

  saveLevel(id: string, name: string, year: string): void {
    if (!name.trim()) return;
    this.schoolLevelService.update(id, { name: name.trim(), year: year.trim() || undefined }).subscribe({
      next: () => { this.editingLevel.set(null); this.loadLevels(); },
    });
  }

  deleteLevel(id: string): void {
    if (!confirm('Schulstufe löschen?')) return;
    this.schoolLevelService.delete(id).subscribe({ next: () => this.loadLevels() });
  }
}
