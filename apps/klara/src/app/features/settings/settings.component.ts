import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../classes/reference-data.service';
import { SubjectDto } from '@app/domain';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

      <!-- Datenschutz & Konto -->
      <section class="settings-section">
        <div class="section-label">Datenschutz &amp; Konto</div>

        <div class="privacy-card">
          <div class="privacy-info">
            <div class="privacy-info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div class="privacy-info-title">Datenschutz</div>
              <div class="privacy-info-text">
                Klara speichert personenbezogene Daten von Schülerinnen und Schülern.
                Als Lehrkraft trägst du die datenschutzrechtliche Verantwortung für die korrekte Nutzung.
              </div>
              <a href="https://klara.abler.tirol/datenschutz" target="_blank" rel="noopener" class="privacy-link">
                Datenschutzerklärung lesen
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Gefahrenzone -->
        <div class="danger-zone">
          <div class="danger-zone-label">Gefahrenzone</div>

          @if (!showDeleteConfirm()) {
            <div class="danger-action">
              <div class="danger-action-info">
                <div class="danger-action-title">Konto unwiderruflich löschen</div>
                <div class="danger-action-desc">Löscht dein Konto und alle gespeicherten Daten – Schüler, Notizen, Leistungen. Diese Aktion kann nicht rückgängig gemacht werden.</div>
              </div>
              <button class="btn btn-danger-outline" (click)="showDeleteConfirm.set(true)">
                Konto löschen
              </button>
            </div>
          } @else {
            <div class="delete-confirm-panel">
              <div class="delete-confirm-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Konto wirklich löschen?
              </div>
              <p class="delete-confirm-text">
                Alle deine Daten – inklusive aller Schülerprofile, Notizen und Leistungsaufzeichnungen – werden <strong>unwiderruflich gelöscht</strong>.
              </p>
              <p class="delete-confirm-text">
                Gib zur Bestätigung <strong>KONTO LÖSCHEN</strong> ein:
              </p>
              <input
                class="confirm-input"
                type="text"
                [(ngModel)]="deleteConfirmText"
                placeholder="KONTO LÖSCHEN"
                autocomplete="off"
              />
              <div class="delete-confirm-actions">
                <button
                  class="btn btn-danger-outline btn-danger-filled"
                  [disabled]="deleteConfirmText !== 'KONTO LÖSCHEN' || deleting()"
                  (click)="deleteAccount()"
                >
                  @if (deleting()) {
                    Wird gelöscht…
                  } @else {
                    Konto endgültig löschen
                  }
                </button>
                <button class="btn btn-secondary" (click)="cancelDelete()">Abbrechen</button>
              </div>
            </div>
          }
        </div>
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

    /* Privacy Card */
    .privacy-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: var(--sp-4);
      margin-bottom: var(--sp-4);
    }
    .privacy-info { display: flex; gap: var(--sp-3); align-items: flex-start; }
    .privacy-info-icon {
      flex-shrink: 0; width: 32px; height: 32px;
      background: #E8F4F8; border-radius: var(--r-sm);
      display: flex; align-items: center; justify-content: center;
      color: #2E7D9A; margin-top: 1px;
    }
    .privacy-info-title { font-size: 14px; font-weight: 600; color: var(--navy); margin-bottom: 4px; }
    .privacy-info-text { font-size: 13px; color: var(--ink-light); line-height: 1.55; margin-bottom: 8px; }
    .privacy-link {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 500; color: var(--teal);
      text-decoration: none; transition: color .12s;
    }
    .privacy-link:hover { color: var(--navy); }

    /* Danger Zone */
    .danger-zone {
      border: 1.5px solid #F5BABA; border-radius: var(--r-md);
      overflow: hidden;
    }
    .danger-zone-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: #C62828;
      padding: 10px var(--sp-4); background: #FEF5F5;
      border-bottom: 1px solid #F5BABA;
    }
    .danger-action {
      display: flex; align-items: center; gap: var(--sp-4);
      padding: var(--sp-4); background: var(--white);
    }
    .danger-action-info { flex: 1; }
    .danger-action-title { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }
    .danger-action-desc { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }

    /* Delete Confirm Panel */
    .delete-confirm-panel {
      background: var(--white); padding: var(--sp-5);
    }
    .delete-confirm-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600; color: #C62828;
      margin-bottom: var(--sp-3);
    }
    .delete-confirm-text { font-size: 13px; color: var(--ink-light); line-height: 1.6; margin-bottom: var(--sp-3); }
    .delete-confirm-text strong { color: var(--ink); }
    .confirm-input {
      width: 100%; padding: 9px 12px; margin-bottom: var(--sp-4);
      border: 1.5px solid #F5BABA; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; color: var(--ink);
      background: var(--white); outline: none; transition: border-color .15s;
    }
    .confirm-input:focus { border-color: #C62828; box-shadow: 0 0 0 3px rgba(198,40,40,.1); }
    .delete-confirm-actions { display: flex; gap: var(--sp-2); }

    /* Buttons */
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

    /* Danger-Outline Button (rote Außenlinie, nicht gefüllt) */
    .btn-danger-outline {
      background: transparent;
      color: #C62828;
      border: 1.5px solid #C62828;
    }
    .btn-danger-outline:hover:not(:disabled) {
      background: #FEF5F5;
    }
    .btn-danger-outline:disabled { opacity: .45; cursor: not-allowed; }

    /* Gefüllte Danger-Variante nur im Bestätigungs-Panel */
    .btn-danger-filled {
      background: #C62828;
      color: var(--white);
      border-color: #C62828;
    }
    .btn-danger-filled:hover:not(:disabled) { background: #a93226; border-color: #a93226; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly authService    = inject(AuthService);
  private readonly fb             = inject(FormBuilder);

  subjects          = signal<SubjectDto[]>([]);
  editingSubject    = signal<string | null>(null);
  showDeleteConfirm = signal(false);
  deleting          = signal(false);
  deleteConfirmText = '';

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

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteConfirmText = '';
  }

  async deleteAccount(): Promise<void> {
    if (this.deleteConfirmText !== 'KONTO LÖSCHEN' || this.deleting()) return;
    this.deleting.set(true);
    try {
      await this.authService.deleteAccount();
    } catch {
      this.deleting.set(false);
    }
  }
}

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
