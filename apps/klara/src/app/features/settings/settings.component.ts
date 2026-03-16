import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../classes/reference-data.service';
import { AssessmentTypeService } from '../assessments/assessment-type.service';
import { SubjectDto, AssessmentTypeDto, AssessmentSchema } from '@app/domain';
import { AuthService } from '../../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

      <!-- Leistungstypen -->
      <section class="settings-section">
        <div class="section-label">Leistungstypen</div>

        <div class="type-list">
          @for (t of assessmentTypes(); track t.id) {
            <div class="item-row">
              @if (editingTypeId() === t.id) {
                <div class="type-edit-row">
                  <input class="inline-input" [value]="t.name" #typeNameInput
                         (keydown.enter)="saveType(t.id, typeNameInput.value, typeSchemaSelect.value)"
                         (keydown.escape)="editingTypeId.set(null)" />
                  <select class="inline-select" #typeSchemaSelect [value]="t.schema">
                    @for (s of schemaOptions; track s.value) {
                      <option [value]="s.value">{{ s.label }}</option>
                    }
                  </select>
                  <button class="btn btn-sm btn-primary" (click)="saveType(t.id, typeNameInput.value, typeSchemaSelect.value)">Speichern</button>
                  <button class="btn btn-sm btn-secondary" (click)="editingTypeId.set(null)">Abbrechen</button>
                </div>
              } @else {
                <div class="type-info">
                  <span class="item-name">{{ t.name }}</span>
                  <span class="type-schema-badge">{{ schemaLabel(t.schema) }}</span>
                  @if (t.isDefault) {
                    <span class="type-default-badge">Standard</span>
                  }
                </div>
                <div class="item-actions">
                  <button class="icon-btn" (click)="editingTypeId.set(t.id)" title="Bearbeiten">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  @if (!t.isDefault) {
                    <button class="icon-btn icon-btn-danger" (click)="deleteType(t.id)" title="Löschen">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  }
                </div>
              }
            </div>
          }
          @if (assessmentTypes().length === 0) {
            <div class="item-row"><span class="item-empty">Wird geladen…</span></div>
          }
        </div>

        <form [formGroup]="typeForm" (ngSubmit)="addType()" class="add-row">
          <input type="text" formControlName="name" placeholder="Neuer Leistungstyp…" />
          <select formControlName="schema">
            @for (s of schemaOptions; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
          <button type="submit" class="btn btn-primary" [disabled]="typeForm.invalid">Hinzufügen</button>
        </form>
      </section>

      <!-- Notenberechnung -->
      <section class="settings-section">
        <div class="section-label">Notenberechnung</div>
        <div class="toggle-card">
          <div class="toggle-info">
            <div class="toggle-title">Gewichtete Notenberechnung aktivieren</div>
            <div class="toggle-desc">
              Ermöglicht die Vergabe von Gewichtungen pro Leistungstyp und zeigt einen
              berechneten Ø-Vorschlag in der Tabellenansicht. Empfohlen für Sekundarstufe.
            </div>
          </div>
          <button class="toggle-btn" [class.active]="gradingEnabled()" (click)="toggleGrading()">
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-label">{{ gradingEnabled() ? 'Ein' : 'Aus' }}</span>
          </button>
        </div>
      </section>

      <!-- Datenschutz & Konto -->
      <section class="settings-section">
        <div class="section-label">Datenschutz &amp; Konto</div>

        <!-- Info -->
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

        <!-- Daten exportieren -->
        <div class="export-card">
          <div class="export-card-info">
            <div class="export-card-title">Alle Daten exportieren</div>
            <div class="export-card-desc">
              Lädt alle deine gespeicherten Daten herunter – Schülerprofile, Elterndaten, Notizen und Leistungsaufzeichnungen.
              Gemäß DSGVO Art. 20 (Recht auf Datenportabilität).
            </div>
          </div>
          <button class="btn btn-ghost" (click)="exportAllData()" [disabled]="exporting()">
            @if (exporting()) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Wird exportiert…
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Daten herunterladen
            }
          </button>
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
                  @if (deleting()) { Wird gelöscht… } @else { Konto endgültig löschen }
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
      border-radius: var(--r-md); overflow: hidden; margin-bottom: var(--sp-3);
    }
    .item-row {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: 10px var(--sp-4); border-bottom: 1px solid var(--border); transition: background .1s;
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
    .add-row select { min-width: 160px; }

    .type-list { margin-bottom: var(--sp-3); }
    .type-info { display: flex; align-items: center; gap: var(--sp-3); flex: 1; min-width: 0; }
    .type-edit-row { display: flex; align-items: center; gap: var(--sp-2); flex: 1; flex-wrap: wrap; }
    .type-edit-row .inline-input { flex: 1; min-width: 120px; }
    .inline-select {
      padding: 7px 10px; border: 1.5px solid var(--border); border-radius: var(--r-sm);
      font-size: 13px; font-family: var(--font-body); background: var(--white); outline: none;
      min-width: 140px;
    }
    .inline-select:focus { border-color: var(--teal); }
    .type-schema-badge {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
      background: var(--light-teal); color: var(--navy);
    }
    .type-default-badge {
      font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
      background: var(--surface); color: var(--ink-faint); border: 1px solid var(--border);
      letter-spacing: 0.3px; text-transform: uppercase;
    }

    /* ── Toggle-Karte ── */
    .toggle-card {
      display: flex; align-items: center; justify-content: space-between; gap: var(--sp-5);
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md);
      padding: var(--sp-4) var(--sp-5);
    }
    .toggle-info { flex: 1; }
    .toggle-title { font-size: 14px; font-weight: 500; color: var(--navy); margin-bottom: 4px; }
    .toggle-desc  { font-size: 13px; color: var(--ink-faint); line-height: 1.5; }
    .toggle-btn {
      display: flex; align-items: center; gap: var(--sp-2);
      background: none; border: none; cursor: pointer; flex-shrink: 0;
    }
    .toggle-track {
      width: 40px; height: 22px; border-radius: 11px; background: var(--border);
      position: relative; display: block; transition: background .2s;
    }
    .toggle-btn.active .toggle-track { background: var(--teal); }
    .toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px; border-radius: 50%;
      background: var(--white); transition: transform .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }
    .toggle-btn.active .toggle-thumb { transform: translateX(18px); }
    .toggle-label { font-size: 13px; font-weight: 500; color: var(--ink-light); min-width: 24px; }

    .privacy-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: var(--sp-4); margin-bottom: var(--sp-4);
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

    .export-card {
      display: flex; align-items: center; gap: var(--sp-4);
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: var(--sp-4); margin-bottom: var(--sp-4);
    }
    .export-card-info { flex: 1; }
    .export-card-title { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }
    .export-card-desc { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }

    .danger-zone {
      border: 1.5px solid #F5BABA; border-radius: var(--r-md); overflow: hidden;
    }
    .danger-zone-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
      color: #C62828; padding: 10px var(--sp-4);
      background: #FEF5F5; border-bottom: 1px solid #F5BABA;
    }
    .danger-action {
      display: flex; align-items: center; gap: var(--sp-4);
      padding: var(--sp-4); background: var(--white);
    }
    .danger-action-info { flex: 1; }
    .danger-action-title { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }
    .danger-action-desc { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }
    .delete-confirm-panel { background: var(--white); padding: var(--sp-5); }
    .delete-confirm-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600; color: #C62828; margin-bottom: var(--sp-3);
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

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; white-space: nowrap;
    }
    .btn:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary { background: var(--navy); color: var(--white); border: none; }
    .btn-primary:hover:not(:disabled) { background: #243350; }
    .btn-secondary { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-secondary:hover { border-color: var(--navy); }
    .btn-ghost { background: transparent; color: var(--navy); border: 1.5px solid var(--border); }
    .btn-ghost:hover:not(:disabled) { border-color: var(--navy); background: var(--surface); }
    .btn-sm { padding: 5px 12px; font-size: 12px; }
    .btn-danger-outline { background: transparent; color: #C62828; border: 1.5px solid #C62828; }
    .btn-danger-outline:hover:not(:disabled) { background: #FEF5F5; }
    .btn-danger-filled { background: #C62828; color: var(--white); border-color: #C62828; }
    .btn-danger-filled:hover:not(:disabled) { background: #a93226; border-color: #a93226; }
  `],
})
export class SettingsComponent implements OnInit {
  private readonly subjectService        = inject(SubjectService);
  private readonly assessmentTypeService = inject(AssessmentTypeService);
  private readonly authService           = inject(AuthService);
  private readonly http                  = inject(HttpClient);
  private readonly fb                    = inject(FormBuilder);

  subjects          = signal<SubjectDto[]>([]);
  editingSubject    = signal<string | null>(null);
  showDeleteConfirm = signal(false);
  deleting          = signal(false);
  exporting         = signal(false);
  deleteConfirmText = '';

  // ── Leistungstypen ──────────────────────────────────────────────────────────
  assessmentTypes  = signal<AssessmentTypeDto[]>([]);
  editingTypeId    = signal<string | null>(null);

  // ── Notenberechnung ─────────────────────────────────────────────────────────
  gradingEnabled = signal(false);

  readonly schemaOptions = [
    { value: AssessmentSchema.GRADES_1_5,        label: '1–5' },
    { value: AssessmentSchema.GRADES_1_10,       label: '1–10' },
    { value: AssessmentSchema.PLUS_TILDE_MINUS,  label: '+/~/−' },
    { value: AssessmentSchema.POINTS,            label: 'Punkte' },
    { value: AssessmentSchema.PASS_FAIL,         label: 'Bestanden / Nicht bestanden' },
  ];

  schemaLabel(schema: string): string {
    return this.schemaOptions.find(o => o.value === schema)?.label ?? schema;
  }

  typeForm = this.fb.group({
    name:   ['', [Validators.required, Validators.minLength(1)]],
    schema: [AssessmentSchema.GRADES_1_5, Validators.required],
  });

  // ── Subject form ────────────────────────────────────────────────────────────
  subjectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    this.loadSubjects();
    this.loadAssessmentTypes();
    this.loadGradingEnabled();
  }

  // ── Subjects ────────────────────────────────────────────────────────────────
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

  // ── Leistungstypen ──────────────────────────────────────────────────────────
  loadAssessmentTypes(): void {
    this.assessmentTypeService.getAll().subscribe({ next: d => this.assessmentTypes.set(d) });
  }

  addType(): void {
    if (this.typeForm.invalid) return;
    const v = this.typeForm.value;
    this.assessmentTypeService.create({
      name:   v.name!,
      schema: v.schema as AssessmentSchema,
    }).subscribe({
      next: () => { this.typeForm.reset({ schema: AssessmentSchema.GRADES_1_5 }); this.loadAssessmentTypes(); },
    });
  }

  saveType(id: string, name: string, schema: string): void {
    if (!name.trim()) return;
    this.assessmentTypeService.update(id, {
      name:   name.trim(),
      schema: schema as AssessmentSchema,
    }).subscribe({
      next: () => { this.editingTypeId.set(null); this.loadAssessmentTypes(); },
    });
  }

  deleteType(id: string): void {
    if (!confirm('Leistungstyp löschen?')) return;
    this.assessmentTypeService.delete(id).subscribe({ next: () => this.loadAssessmentTypes() });
  }

  // ── Notenberechnung ─────────────────────────────────────────────────────────
  loadGradingEnabled(): void {
    this.authService.getGradingEnabled().subscribe({ next: v => this.gradingEnabled.set(v) });
  }

  toggleGrading(): void {
    const next = !this.gradingEnabled();
    this.authService.setGradingEnabled(next).subscribe({ next: v => this.gradingEnabled.set(v) });
  }

  async exportAllData(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<object>('/api/auth/export', { withCredentials: true }),
      );
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `klara_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.exporting.set(false);
    }
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
