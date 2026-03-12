import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SubjectService } from '../classes/reference-data.service';
import { SubjectDto } from '@app/domain';

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
        <div class="section-label">Fächer</div>
        <div class="item-list">
          @for (subject of subjects(); track subject.id) {
            <div class="item-row">
              @if (editingSubject() === subject.id) {
                <input class="inline-input" [value]="subject.name" #subjectInput
                       (keydown.enter)="saveSubject(subject.id, subjectInput.value)"
                       (keydown.escape)="editingSubject.set(null)" />
                <button class="btn btn-sm btn-primary" (click)="saveSubject(subject.id, subjectInput.value)">Speichern</button>
                <button class="btn btn-sm btn-secondary" (click)="editingSubject.set(null)">Abbrechen</button>
              } @else {
                <span class="item-name">{{ subject.name }}</span>
                <div class="item-actions">
                  <button class="icon-btn" (click)="editingSubject.set(subject.id)" title="Bearbeiten">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="icon-btn icon-btn-danger" (click)="deleteSubject(subject.id)" title="Löschen">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              }
            </div>
          }
          @if (subjects().length === 0) {
            <div class="item-row"><span class="item-empty">Noch keine Fächer angelegt.</span></div>
          }
        </div>
        <form [formGroup]="subjectForm" (ngSubmit)="addSubject()" class="add-row">
          <input type="text" formControlName="name" placeholder="Neues Fach hinzufügen…" />
          <button type="submit" class="btn btn-primary" [disabled]="subjectForm.invalid">Hinzufügen</button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { margin-bottom: var(--sp-6); }
    h1 { font-family: var(--font-display); font-size: 26px; font-weight: 400; color: var(--navy); margin: 0; }

    .settings-section { margin-bottom: var(--sp-7); }
    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--ink-faint);
      margin-bottom: var(--sp-3);
      display: flex; align-items: center; gap: var(--sp-3);
    }
    .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .item-list {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); overflow: hidden;
      margin-bottom: var(--sp-3);
    }
    .item-row {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: 10px var(--sp-4); border-bottom: 1px solid var(--border);
      transition: background .1s;
    }
    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: var(--surface); }
    .item-name { flex: 1; font-size: 14px; color: var(--ink); }
    .item-empty { flex: 1; font-size: 13px; color: var(--ink-faint); }
    .item-actions { display: flex; gap: var(--sp-1); }

    .icon-btn {
      width: 28px; height: 28px; border-radius: var(--r-sm);
      background: none; border: none; cursor: pointer;
      color: var(--ink-faint); display: flex; align-items: center; justify-content: center;
      transition: background .12s, color .12s;
    }
    .icon-btn:hover { background: var(--surface); color: var(--ink); }
    .icon-btn-danger:hover { background: var(--error-bg); color: var(--error-fg); }

    .inline-input {
      flex: 1; padding: 6px 10px; border: 1.5px solid var(--teal);
      border-radius: var(--r-sm); font-size: 13px; background: var(--white);
      outline: none; box-shadow: 0 0 0 3px rgba(123,170,186,.15);
    }

    .add-row { display: flex; gap: var(--sp-2); align-items: center; }
    .add-row input { flex: 1; margin: 0; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; white-space: nowrap;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-secondary { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-secondary:hover { border-color: var(--navy); }
    .btn-sm { padding: 5px 12px; font-size: 12px; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly fb             = inject(FormBuilder);

  subjects       = signal<SubjectDto[]>([]);
  editingSubject = signal<string | null>(null);

  subjectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.subjectService.getAll().subscribe({ next: d => this.subjects.set(d) });
  }

  addSubject(): void {
    if (this.subjectForm.invalid) return;
    const v = this.subjectForm.value;
    this.subjectService.create({ name: v.name! }).subscribe({
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
}
