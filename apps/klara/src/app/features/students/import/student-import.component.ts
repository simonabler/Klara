import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// ── Schuljahr-Helfer ─────────────────────────────────────────────────────────
function buildSchoolYearOptions(): string[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const currentStart = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let offset = 1; offset >= -2; offset--) {
    const start = currentStart + offset;
    years.push(`${start}/${(start + 1).toString().slice(-2)}`);
  }
  return years;
}
function currentSchoolYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const start = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${(start + 1).toString().slice(-2)}`;
}

// ── Ziel-Datenfelder ────────────────────────────────────────────────────────
export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

const TARGET_FIELDS: TargetField[] = [
  { key: 'firstName',          label: 'Vorname',                         required: true  },
  { key: 'lastName',           label: 'Nachname',                        required: true  },
  { key: 'dateOfBirth',        label: 'Geburtsdatum',                    required: false },
  { key: 'gender',             label: 'Geschlecht (m/w/d)',              required: false },
  { key: 'email',              label: 'E-Mail (Schüler/in)',             required: false },
  { key: 'phone',              label: 'Telefon (Schüler/in)',            required: false },
  { key: 'className',          label: 'Klasse',                          required: false },
  { key: 'parent1FirstName',   label: 'Erziehungsber. Vorname',          required: false },
  { key: 'parent1LastName',    label: 'Erziehungsber. Nachname',         required: false },
  { key: 'parent1Email',       label: 'Erziehungsber. E-Mail',           required: false },
  { key: 'parent1Phone',       label: 'Erziehungsber. Telefon',          required: false },
];

// ── Auto-Mapping Hints ───────────────────────────────────────────────────────
const MAPPING_HINTS: { patterns: RegExp[]; key: string }[] = [
  { patterns: [/^vorname$/i, /^first.?name$/i, /^given.?name$/i],                                    key: 'firstName'        },
  { patterns: [/^nachname$/i, /^familienname$/i, /^last.?name$/i, /^family.?name$/i, /^name$/i],      key: 'lastName'         },
  { patterns: [/geburt/i, /birth/i, /^dob$/i, /^datum$/i],                                            key: 'dateOfBirth'      },
  { patterns: [/^geschlecht$/i, /^gender$/i, /^sex$/i],                                                key: 'gender'           },
  { patterns: [/^email.*sch/i, /^e.?mail.*sch/i, /schüler.*mail/i, /^email$/i, /^e.?mail$/i],        key: 'email'            },
  { patterns: [/^telefon.*sch/i, /schüler.*tel/i, /^telefon\s*1/i, /^phone$/i, /^tel$/i],             key: 'phone'            },
  { patterns: [/^klasse$/i, /^class$/i, /^gruppe$/i],                                                  key: 'className'        },
  { patterns: [/erziehungsberechtigter_vorname/i, /erz.*vorname/i, /parent.*first/i],                  key: 'parent1FirstName' },
  { patterns: [/erziehungsberechtigter_nachname/i, /erz.*nach/i, /parent.*last/i],                     key: 'parent1LastName'  },
  { patterns: [/erziehungsberechtigter_email/i, /erz.*mail/i, /parent.*mail/i],                        key: 'parent1Email'     },
  { patterns: [/erziehungsberechtigter_telefon/i, /erz.*tel/i, /parent.*phone/i, /^telefon/i],         key: 'parent1Phone'     },
];

function autoDetect(header: string): string {
  for (const hint of MAPPING_HINTS) {
    if (hint.patterns.some(p => p.test(header))) return hint.key;
  }
  return '';
}

type Step = 'upload' | 'map' | 'conflicts' | 'preview' | 'result';
type ImportAction = 'create' | 'update' | 'ignore';

interface DuplicateMatch {
  rowIndex: number;
  existingStudentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  classes: { id: string; name: string; schoolYear?: string }[];
}

interface ImportResult { imported: number; updated: number; skipped: number; classesCreated: number; errors: { row: number; reason: string }[] }

@Component({
  selector: 'app-student-import',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" routerLink="/app/students">← Schüler</a>
        <h1>Schüler importieren</h1>
      </header>

      <!-- Schrittanzeige -->
      <div class="steps">
        @for (s of stepLabels; track s.id) {
          <div class="step" [class.active]="step() === s.id" [class.done]="stepDone(s.id)">
            <span class="step-num">{{ stepDone(s.id) ? '✓' : $index + 1 }}</span>
            <span class="step-label">{{ s.label }}</span>
          </div>
          @if (!$last) { <div class="step-line" [class.done]="stepDone(s.id)"></div> }
        }
      </div>

      <!-- ── Schritt 1: Upload ── -->
      @if (step() === 'upload') {
        <section class="card">
          <h2>CSV-Datei auswählen</h2>
          <p class="hint">Die erste Zeile muss Spaltenbezeichnungen enthalten. Trennzeichen: Semikolon (;) – wie es Excel auf deutschen Systemen verwendet.</p>

          <div class="field">
            <label>Schuljahr für den Import</label>
            <select [(ngModel)]="selectedSchoolYear">
              @for (y of schoolYearOptions; track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
            <span class="field-hint">Wird neuen Klassen aus der CSV zugewiesen, falls kein Schuljahr in der Datei vorhanden ist.</span>
          </div>

          <div class="dropzone" [class.drag-over]="dragOver()"
               (dragover)="$event.preventDefault(); dragOver.set(true)"
               (dragleave)="dragOver.set(false)"
               (drop)="onDrop($event)">
            <input #fileInput type="file" accept=".csv,text/csv" (change)="onFileChange($event)" class="file-input" />
            <span class="drop-icon">📄</span>
            <p class="drop-text">CSV hierher ziehen oder <button class="link-btn" (click)="fileInput.click()">Datei auswählen</button></p>
            @if (fileName()) { <p class="file-name">{{ fileName() }}</p> }
          </div>

          <div class="template-hint">
            <span>Noch keine CSV? </span>
            <a href="/schueler-import-vorlage.csv" download class="template-link">📥 Vorlage herunterladen</a>
          </div>
        </section>
      }

      <!-- ── Schritt 2: Spalten-Mapping ── -->
      @if (step() === 'map') {
        <section class="card">
          <h2>Spalten zuordnen</h2>
          <p class="hint">
            Jede CSV-Spalte wird einem Datenfeld zugeordnet. Die Zuordnung wurde automatisch erkannt –
            bitte prüfen und bei Bedarf anpassen.
          </p>

          <div class="mapping-table">
            <div class="mapping-header">
              <span>CSV-Spalte</span>
              <span>Beispielwert</span>
              <span>Ziel-Datenfeld</span>
            </div>
            @for (col of csvHeaders(); track col; let i = $index) {
              <div class="mapping-row" [class.mapped]="mappings()[i]">
                <span class="col-name">{{ col }}</span>
                <span class="col-preview">{{ previewValue(i) }}</span>
                <select class="field-select" (change)="setMapping(i, $any($event.target).value)">
                  <option value="" [selected]="!mappings()[i]">— ignorieren —</option>
                  @for (field of targetFields; track field.key) {
                    <option [value]="field.key" [selected]="mappings()[i] === field.key">
                      {{ field.label }}{{ field.required ? ' *' : '' }}
                    </option>
                  }
                </select>
              </div>
            }
          </div>

          @if (mappingError()) {
            <p class="error-msg">{{ mappingError() }}</p>
          }

          <div class="card-footer">
            <button class="btn-secondary" (click)="step.set('upload')">Zurück</button>
            <button class="btn-primary" [disabled]="checkingDups()" (click)="goToConflicts()">
              {{ checkingDups() ? 'Prüfe Duplikate…' : 'Weiter →' }}
            </button>
          </div>
        </section>
      }

      <!-- ── Schritt 3: Konflikte ── -->
      @if (step() === 'conflicts') {
        <section class="card">
          @if (conflictCount() === 0) {
            <h2>Keine Konflikte</h2>
            <p class="hint">Alle Schüler sind neu – kein einziger existiert bereits.</p>
          } @else {
            <div class="conflict-header">
              <div>
                <h2>{{ conflictCount() }} {{ conflictCount() === 1 ? 'Konflikt' : 'Konflikte' }} gefunden</h2>
                <p class="hint">Diese Schüler existieren bereits. Wähle für jeden eine Aktion.</p>
              </div>
              <div class="bulk-actions">
                <button class="btn-sm btn-ghost" [class.active]="allIgnored()" (click)="setAllActions('ignore')">Alle ignorieren</button>
                <button class="btn-sm btn-ghost" [class.active]="allUpdated()" (click)="setAllActions('update')">Alle updaten</button>
              </div>
            </div>

            <div class="conflict-list">
              @for (c of conflicts(); track c.rowIndex) {
                <div class="conflict-row">
                  <div class="conflict-info">
                    <span class="conflict-name">{{ c.lastName }} {{ c.firstName }}</span>
                    @if (c.dateOfBirth) {
                      <span class="conflict-meta">{{ c.dateOfBirth | date:'dd.MM.yyyy' }}</span>
                    }
                    @if (c.classes.length > 0) {
                      <span class="conflict-meta">
                        {{ c.classes.map(cl => cl.name + (cl.schoolYear ? ' · ' + cl.schoolYear : '')).join(', ') }}
                      </span>
                    }
                  </div>
                  <div class="action-tabs">
                    <button class="action-tab"
                      [class.active-ignore]="getAction(c.rowIndex) === 'ignore'"
                      (click)="setAction(c.rowIndex, 'ignore')">Ignorieren</button>
                    <button class="action-tab"
                      [class.active-update]="getAction(c.rowIndex) === 'update'"
                      (click)="setAction(c.rowIndex, 'update')">Updaten</button>
                    <button class="action-tab"
                      [class.active-create]="getAction(c.rowIndex) === 'create'"
                      (click)="setAction(c.rowIndex, 'create')">Neu anlegen</button>
                  </div>
                </div>
              }
            </div>
          }

          <div class="card-footer">
            <button class="btn-secondary" (click)="step.set('map')">Zurück</button>
            <button class="btn-primary" (click)="step.set('preview')">Weiter zur Vorschau →</button>
          </div>
        </section>
      }

      <!-- ── Schritt 3: Vorschau ── -->
      @if (step() === 'preview') {
        <section class="card">
          <h2>Vorschau <span class="count-badge">{{ previewRows().length }} Schüler</span></h2>
          <p class="hint">Die ersten 5 Zeilen werden angezeigt. Prüfen Sie die Daten, bevor Sie den Import starten.</p>

          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Vorname</th>
                  <th>Nachname</th>
                  <th>Geburtsdatum</th>
                  @if (hasClassColumn()) { <th>Klasse</th> }
                  @if (hasEmailColumn()) { <th>E-Mail</th> }
                  <th>Erziehungsber.</th>
                </tr>
              </thead>
              <tbody>
                @for (row of previewRows().slice(0, 5); track $index) {
                  <tr [class.error-row]="!row['firstName'] || !row['lastName']" >
                    <td>{{ row["firstName"] || '—' }}</td>
                    <td>{{ row["lastName"] || '—' }}</td>
                    <td>{{ row["dateOfBirth"] || '—' }}</td>
                    @if (hasClassColumn()) { <td>{{ row["className"] || '—' }}</td> }
                    @if (hasEmailColumn()) { <td>{{ row["email"] || '—' }}</td> }
                    <td>
                      @if (row["parent1FirstName"] && row["parent1LastName"]) {
                        {{ row["parent1FirstName"] }} {{ row["parent1LastName"] }}
                        @if (row["parent1Email"]) { <span class="email-hint">({{ row["parent1Email"] }})</span> }
                      } @else { — }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (previewRows().length > 5) {
              <p class="more-hint">… und {{ previewRows().length - 5 }} weitere Zeilen</p>
            }
          </div>

          @if (invalidCount() > 0) {
            <p class="warn-msg">⚠ {{ invalidCount() }} Zeile(n) ohne Vor- oder Nachname werden übersprungen.</p>
          }

          <div class="card-footer">
            <button class="btn-secondary" (click)="step.set('conflicts')">Zurück</button>
            <button class="btn-primary" [disabled]="importing()" (click)="runImport()">
              {{ importing() ? 'Importiert…' : effectiveCount() + ' Schüler verarbeiten' }}
            </button>
          </div>
        </section>
      }

      <!-- ── Schritt 4: Ergebnis ── -->
      @if (step() === 'result') {
        <section class="card result-card">
          @if (importResult(); as r) {
            <div class="result-icon">{{ r.imported > 0 ? '✅' : '⚠' }}</div>
            <h2>Import abgeschlossen</h2>
            <div class="result-stats">
              <div class="stat success">
                <span class="stat-num">{{ r.imported }}</span>
                <span class="stat-label">neu importiert</span>
              </div>
              @if (r.updated > 0) {
                <div class="stat info">
                  <span class="stat-num">{{ r.updated }}</span>
                  <span class="stat-label">{{ r.updated === 1 ? 'aktualisiert' : 'aktualisiert' }}</span>
                </div>
              }
              @if (r.classesCreated > 0) {
                <div class="stat info">
                  <span class="stat-num">{{ r.classesCreated }}</span>
                  <span class="stat-label">{{ r.classesCreated === 1 ? 'Klasse angelegt' : 'Klassen angelegt' }}</span>
                </div>
              }
              @if (r.skipped > 0) {
                <div class="stat warn">
                  <span class="stat-num">{{ r.skipped }}</span>
                  <span class="stat-label">übersprungen</span>
                </div>
              }
            </div>

            @if (r.errors.length > 0) {
              <details class="error-details">
                <summary>{{ r.errors.length }} Fehler anzeigen</summary>
                <ul class="error-list">
                  @for (e of r.errors; track e.row) {
                    <li>Zeile {{ e.row }}: {{ e.reason }}</li>
                  }
                </ul>
              </details>
            }

            <div class="result-actions">
              <button class="btn-secondary" (click)="reset()">Weiteren Import starten</button>
              <a class="btn-primary" routerLink="/app/students">Zur Schülerliste →</a>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }

    .page-header { margin-bottom: var(--sp-6); }
    .page-header h1 {
      font-family: var(--font-display);
      font-size: 26px; font-weight: 400; color: var(--navy);
      margin: var(--sp-2) 0 0;
    }
    .back-link { color: var(--ink-faint); font-size: 13px; transition: color .15s; }
    .back-link:hover { color: var(--ink); }

    /* Steps */
    .steps { display: flex; align-items: center; margin-bottom: var(--sp-5); }
    .step { display: flex; align-items: center; gap: var(--sp-2); font-size: 12px; color: var(--ink-faint); }
    .step.active { color: var(--navy); font-weight: 500; }
    .step.done { color: var(--success-fg); }
    .step-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--border); display: flex; align-items: center;
      justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0;
    }
    .step.active .step-num { background: var(--navy); color: var(--white); }
    .step.done .step-num { background: var(--success-fg); color: var(--white); }
    .step-line { flex: 1; height: 1px; background: var(--border); margin: 0 var(--sp-2); }
    .step-line.done { background: var(--success-fg); }

    /* Card */
    .card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: var(--sp-6);
      box-shadow: var(--sh-sm);
    }
    .card h2 {
      font-size: 15px; font-weight: 600; color: var(--navy);
      margin: 0 0 var(--sp-2); display: flex; align-items: center; gap: var(--sp-3);
    }
    .hint { font-size: 13px; color: var(--ink-faint); margin: 0 0 var(--sp-5); }

    /* Dropzone */
    .dropzone {
      border: 2px dashed var(--border); border-radius: var(--r-md);
      padding: var(--sp-7) var(--sp-5); text-align: center;
      cursor: pointer; transition: border-color .15s, background .15s;
      position: relative;
    }
    .dropzone.drag-over { border-color: var(--teal); background: var(--surface); }
    .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .drop-icon { font-size: 2rem; display: block; margin-bottom: var(--sp-3); }
    .drop-text { margin: 0; color: var(--ink-faint); font-size: 14px; }
    .link-btn {
      background: none; border: none; color: var(--navy);
      text-decoration: underline; cursor: pointer; font-size: inherit; padding: 0;
    }
    .file-name { margin: var(--sp-3) 0 0; font-size: 13px; color: var(--ink-light); font-weight: 500; }
    .template-hint { margin-top: var(--sp-4); font-size: 12px; color: var(--ink-faint); }
    .template-link { color: var(--teal); font-weight: 500; }
    .template-link:hover { color: var(--navy); }
    .field { display: flex; flex-direction: column; gap: var(--sp-1); margin-bottom: var(--sp-5); }
    .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--ink-faint); }
    .field-hint { font-size: 11px; color: var(--ink-faint); margin-top: 2px; }

    /* Mapping */
    .mapping-table {
      border: 1px solid var(--border); border-radius: var(--r-md);
      overflow: hidden; margin-bottom: var(--sp-4);
    }
    .mapping-header {
      display: grid; grid-template-columns: 1fr 1fr 1.3fr;
      padding: var(--sp-2) var(--sp-4);
      background: var(--surface);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; color: var(--ink-faint);
    }
    .mapping-row {
      display: grid; grid-template-columns: 1fr 1fr 1.3fr;
      align-items: center; padding: var(--sp-2) var(--sp-4);
      border-top: 1px solid var(--border); transition: background .1s;
    }
    .mapping-row.mapped { background: #f6fbf8; }
    .col-name { font-size: 13px; font-weight: 500; color: var(--ink); }
    .col-preview { font-size: 12px; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: var(--sp-3); }
    .field-select {
      padding: 5px 8px; border: 1.5px solid var(--border);
      border-radius: var(--r-sm); font-size: 12px;
      font-family: var(--font-body); outline: none; background: var(--white); width: 100%;
    }
    .field-select:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(123,170,186,.15); }
    .error-msg { color: var(--error-fg); font-size: 13px; margin: var(--sp-2) 0; }

    /* Preview */
    .count-badge {
      font-size: 11px; background: var(--navy); color: var(--white);
      padding: 2px 8px; border-radius: 20px; font-weight: 500;
    }
    .preview-table-wrap { overflow-x: auto; margin-bottom: var(--sp-4); }
    .preview-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .preview-table th {
      text-align: left; padding: var(--sp-2) var(--sp-3);
      border-bottom: 2px solid var(--border);
      font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: var(--ink-faint);
    }
    .preview-table td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); color: var(--ink); }
    .preview-table .error-row td { color: var(--error-fg); background: var(--error-bg); }
    .email-hint { color: var(--ink-faint); font-size: 11px; margin-left: var(--sp-2); }
    .more-hint { font-size: 12px; color: var(--ink-faint); margin: var(--sp-2) 0 0; }
    .warn-msg {
      font-size: 13px; color: var(--warn-fg); background: var(--warn-bg);
      border: 1px solid #f0d898; border-radius: var(--r-sm);
      padding: var(--sp-2) var(--sp-3); margin-bottom: var(--sp-4);
    }

    /* Result */
    .result-card { text-align: center; padding: var(--sp-7) var(--sp-6); }
    .result-icon { font-size: 2.5rem; margin-bottom: var(--sp-3); }
    .result-card h2 { justify-content: center; }
    .result-stats { display: flex; justify-content: center; gap: var(--sp-7); margin: var(--sp-5) 0; }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-num { font-size: 2.5rem; font-weight: 700; line-height: 1; font-family: var(--font-display); }
    .stat-label { font-size: 12px; color: var(--ink-faint); margin-top: var(--sp-2); }
    .stat.success .stat-num { color: var(--success-fg); }
    .stat.warn .stat-num { color: var(--warn-fg); }
    .stat.info .stat-num { color: var(--teal); }

    /* ── Konflikte ── */
    .conflict-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--sp-4); flex-wrap: wrap; margin-bottom: var(--sp-5);
    }
    .conflict-header h2 { margin-bottom: var(--sp-1); }
    .conflict-header .hint { margin-bottom: 0; }
    .bulk-actions { display: flex; gap: var(--sp-2); flex-shrink: 0; margin-top: 4px; }

    .conflict-list { display: flex; flex-direction: column; gap: var(--sp-2); margin-bottom: var(--sp-4); }
    .conflict-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--sp-4); flex-wrap: wrap;
      padding: var(--sp-3) var(--sp-4);
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
    }
    .conflict-info { display: flex; flex-direction: column; gap: 2px; }
    .conflict-name { font-size: 14px; font-weight: 500; color: var(--navy); }
    .conflict-meta { font-size: 12px; color: var(--ink-faint); }

    .action-tabs { display: flex; gap: 4px; }
    .action-tab {
      padding: 5px 12px; border-radius: var(--r-sm);
      border: 1.5px solid var(--border); background: var(--white);
      font-size: 12px; font-weight: 500; color: var(--ink-light);
      cursor: pointer; transition: all .12s; font-family: var(--font-body);
    }
    .action-tab:hover { border-color: var(--ink-light); }
    .action-tab.active-ignore { border-color: var(--ink-faint); background: var(--surface); color: var(--ink-light); }
    .action-tab.active-update { border-color: var(--teal); background: #e8f4f8; color: #2E7D9A; }
    .action-tab.active-create { border-color: var(--navy); background: var(--navy); color: var(--white); }

    .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: var(--r-sm); font-family: var(--font-body); font-weight: 500; cursor: pointer; transition: all .12s; }
    .btn-ghost { background: transparent; color: var(--ink-light); border: 1.5px solid var(--border); }
    .btn-ghost:hover { border-color: var(--navy); color: var(--navy); }
    .btn-ghost.active { border-color: var(--teal); color: var(--teal); background: #e8f4f8; }
    .error-details { text-align: left; margin: var(--sp-4) 0; font-size: 13px; }
    .error-details summary { cursor: pointer; color: var(--ink-faint); }
    .error-list { margin: var(--sp-2) 0 0 var(--sp-4); padding: 0; color: var(--error-fg); }
    .error-list li { margin-bottom: var(--sp-1); }
    .result-actions { display: flex; justify-content: center; gap: var(--sp-3); margin-top: var(--sp-5); }

    /* Footer */
    .card-footer {
      display: flex; justify-content: flex-end; gap: var(--sp-3);
      margin-top: var(--sp-5); border-top: 1px solid var(--border); padding-top: var(--sp-4);
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
    .btn-secondary { background: transparent; color: var(--ink-light); border: 1.5px solid var(--border); }
    .btn-secondary:hover { border-color: var(--navy); color: var(--ink); }
    .result-actions { display: flex; justify-content: center; gap: var(--sp-3); margin-top: var(--sp-5); }
  `],
})
export class StudentImportComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly targetFields    = TARGET_FIELDS;
  readonly schoolYearOptions = buildSchoolYearOptions();
  readonly stepLabels = [
    { id: 'upload'    as Step, label: 'Datei'     },
    { id: 'map'       as Step, label: 'Zuordnen'  },
    { id: 'conflicts' as Step, label: 'Konflikte' },
    { id: 'preview'   as Step, label: 'Vorschau'  },
    { id: 'result'    as Step, label: 'Ergebnis'  },
  ];

  step            = signal<Step>('upload');
  dragOver        = signal(false);
  fileName        = signal('');
  csvHeaders      = signal<string[]>([]);
  csvRows         = signal<string[][]>([]);
  mappings        = signal<string[]>([]);
  mappingError    = signal('');
  importing       = signal(false);
  importResult    = signal<ImportResult | null>(null);
  selectedSchoolYear = currentSchoolYear();

  // Konflikt-Auflösung
  conflicts       = signal<DuplicateMatch[]>([]);
  checkingDups    = signal(false);
  rowActions      = signal<Map<number, ImportAction>>(new Map());

  previewRows    = computed(() => this.buildRows(this.csvRows(), this.csvHeaders(), this.mappings()));
  validCount     = computed(() => this.previewRows().filter(r => r['firstName'] && r['lastName']).length);
  invalidCount   = computed(() => this.previewRows().filter(r => !r['firstName'] || !r['lastName']).length);
  hasClassColumn = computed(() => this.mappings().includes('className'));
  hasEmailColumn = computed(() => this.mappings().includes('email'));

  // Anzahl Zeilen die tatsächlich verarbeitet werden (ohne ignorierte Konflikte)
  effectiveCount = computed(() => {
    const ignoredIndices = new Set(
      this.conflicts()
        .filter(c => (this.rowActions().get(c.rowIndex) ?? 'ignore') === 'ignore')
        .map(c => c.rowIndex),
    );
    return this.previewRows()
      .filter((r, i) => r['firstName'] && r['lastName'] && !ignoredIndices.has(i))
      .length;
  });

  stepDone(id: Step): boolean {
    const order: Step[] = ['upload', 'map', 'conflicts', 'preview', 'result'];
    return order.indexOf(this.step()) > order.indexOf(id);
  }

  // ── File handling ──────────────────────────────────────────────────────────

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  processFile(file: File): void {
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  }

  parseCSV(text: string): void {
    // BOM entfernen (UTF-8 BOM: \uFEFF) — verhindert kaputte erste Spalte
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const parse = (line: string) =>
      line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, '').trim());

    const headers = parse(lines[0]);
    const rows    = lines.slice(1).filter(l => l.trim()).map(parse);

    this.csvHeaders.set(headers);
    this.csvRows.set(rows);
    this.mappings.set(headers.map(h => autoDetect(h)));
    this.step.set('map');
  }

  // ── Mapping ────────────────────────────────────────────────────────────────

  setMapping(colIndex: number, targetKey: string): void {
    const m = [...this.mappings()];
    m[colIndex] = targetKey;
    this.mappings.set(m);
  }

  previewValue(colIndex: number): string {
    return this.csvRows()[0]?.[colIndex] ?? '';
  }

  goToConflicts(): void {
    const m = this.mappings();
    if (!m.includes('firstName') || !m.includes('lastName')) {
      this.mappingError.set('Bitte „Vorname" und „Nachname" zuweisen.');
      return;
    }
    this.mappingError.set('');

    // Duplikat-Check gegen API
    const rows = this.previewRows()
      .filter(r => r['firstName'] && r['lastName'])
      .map(r => ({ firstName: r['firstName'], lastName: r['lastName'], dateOfBirth: r['dateOfBirth'] || undefined }));

    this.checkingDups.set(true);
    this.http.post<{ matches: DuplicateMatch[] }>('/api/students/check-duplicates', { rows }).subscribe({
      next: (result) => {
        this.conflicts.set(result.matches);
        // Default-Aktion für alle Konflikte: ignorieren
        const actions = new Map<number, ImportAction>();
        result.matches.forEach(m => actions.set(m.rowIndex, 'ignore'));
        this.rowActions.set(actions);
        this.checkingDups.set(false);
        // Direkt zur Vorschau wenn keine Konflikte
        this.step.set(result.matches.length > 0 ? 'conflicts' : 'preview');
      },
      error: () => {
        // Bei Fehler direkt zur Vorschau (ohne Konflikt-Check)
        this.checkingDups.set(false);
        this.step.set('preview');
      },
    });
  }

  setAllActions(action: ImportAction): void {
    const actions = new Map<number, ImportAction>();
    this.conflicts().forEach(c => actions.set(c.rowIndex, action));
    this.rowActions.set(actions);
  }

  setAction(rowIndex: number, action: ImportAction): void {
    const actions = new Map(this.rowActions());
    actions.set(rowIndex, action);
    this.rowActions.set(actions);
  }

  getAction(rowIndex: number): ImportAction {
    return this.rowActions().get(rowIndex) ?? 'ignore';
  }

  conflictCount = computed(() => this.conflicts().length);
  allIgnored    = computed(() => this.conflicts().every(c => this.rowActions().get(c.rowIndex) === 'ignore'));
  allUpdated    = computed(() => this.conflicts().every(c => this.rowActions().get(c.rowIndex) === 'update'));

  // ── Row building ───────────────────────────────────────────────────────────

  buildRows(rows: string[][], headers: string[], mappings: string[]): Record<string, string>[] {
    return rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((_, i) => {
        const key = mappings[i];
        if (key) obj[key] = row[i] ?? '';
      });
      return obj;
    });
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  runImport(): void {
    this.importing.set(true);

    // Konflikte in die Rows einarbeiten
    const conflictMap = new Map<number, DuplicateMatch>(
      this.conflicts().map(c => [c.rowIndex, c]),
    );

    const rows = this.previewRows()
      .filter(r => r['firstName'] && r['lastName'])
      .map((r, i) => {
        const conflict = conflictMap.get(i);
        const action   = conflict ? (this.rowActions().get(i) ?? 'ignore') : 'create';
        return {
          ...r,
          schoolYear:        r['schoolYear'] || this.selectedSchoolYear,
          action,
          existingStudentId: conflict?.existingStudentId,
        };
      });

    this.http.post<ImportResult>('/api/students/import', { rows }).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.step.set('result');
        this.importing.set(false);
      },
      error: () => this.importing.set(false),
    });
  }

  reset(): void {
    this.step.set('upload');
    this.fileName.set('');
    this.csvHeaders.set([]);
    this.csvRows.set([]);
    this.mappings.set([]);
    this.importResult.set(null);
    this.conflicts.set([]);
    this.rowActions.set(new Map());
  }
}
