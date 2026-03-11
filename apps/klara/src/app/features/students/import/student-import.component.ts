import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  { key: 'parent1FirstName',   label: 'Erziehungsber. Vorname',          required: false },
  { key: 'parent1LastName',    label: 'Erziehungsber. Nachname',         required: false },
  { key: 'parent1Email',       label: 'Erziehungsber. E-Mail',           required: false },
  { key: 'parent1Phone',       label: 'Erziehungsber. Telefon',          required: false },
];

// ── Auto-Mapping Hints ───────────────────────────────────────────────────────
const MAPPING_HINTS: { patterns: RegExp[]; key: string }[] = [
  { patterns: [/vorname/i, /first.?name/i, /given.?name/i],            key: 'firstName'        },
  { patterns: [/nachname/i, /last.?name/i, /family.?name/i, /^name$/i],key: 'lastName'         },
  { patterns: [/geburt/i, /birth/i, /dob/i, /datum/i],                 key: 'dateOfBirth'      },
  { patterns: [/erz.*vorname/i, /parent.*first/i, /mutter.*vor/i, /vater.*vor/i, /erziehungsberechtigter_vorname/i], key: 'parent1FirstName' },
  { patterns: [/erz.*nach/i, /parent.*last/i, /erziehungsberechtigter_nachname/i],                key: 'parent1LastName'  },
  { patterns: [/erz.*mail/i, /parent.*mail/i, /erziehungsberechtigter_email/i],                   key: 'parent1Email'     },
  { patterns: [/erz.*tel/i, /parent.*phone/i, /telefon/i, /erziehungsberechtigter_telefon/i],     key: 'parent1Phone'     },
];

function autoDetect(header: string): string {
  for (const hint of MAPPING_HINTS) {
    if (hint.patterns.some(p => p.test(header))) return hint.key;
  }
  return '';
}

type Step = 'upload' | 'map' | 'preview' | 'result';

interface ImportResult { imported: number; skipped: number; errors: { row: number; reason: string }[] }

@Component({
  selector: 'app-student-import',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a class="back-link" routerLink="/students">← Schüler</a>
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
          <p class="hint">Die erste Zeile muss Spaltenbezeichnungen enthalten. Trennzeichen: Komma oder Semikolon.</p>

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
                <select class="field-select" [value]="mappings()[i]" (change)="setMapping(i, $any($event.target).value)">
                  <option value="">— ignorieren —</option>
                  @for (field of targetFields; track field.key) {
                    <option [value]="field.key">
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
            <button class="btn-primary" (click)="goToPreview()">Weiter zur Vorschau →</button>
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
                  <th>Erziehungsber.</th>
                </tr>
              </thead>
              <tbody>
                @for (row of previewRows().slice(0, 5); track $index) {
                  <tr [class.error-row]="!row.firstName || !row.lastName">
                    <td>{{ row.firstName || '—' }}</td>
                    <td>{{ row.lastName || '—' }}</td>
                    <td>{{ row.dateOfBirth || '—' }}</td>
                    <td>
                      @if (row.parent1FirstName && row.parent1LastName) {
                        {{ row.parent1FirstName }} {{ row.parent1LastName }}
                        @if (row.parent1Email) { <span class="email-hint">({{ row.parent1Email }})</span> }
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
            <button class="btn-secondary" (click)="step.set('map')">Zurück</button>
            <button class="btn-primary" [disabled]="importing()" (click)="runImport()">
              {{ importing() ? 'Importiert…' : validCount() + ' Schüler importieren' }}
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
                <span class="stat-label">importiert</span>
              </div>
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
              <a class="btn-primary" routerLink="/students">Zur Schülerliste →</a>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.4rem; font-weight: 600; margin: 0.4rem 0 0; }
    .back-link { color: #aaa; text-decoration: none; font-size: 0.875rem; }
    .back-link:hover { color: #333; }

    /* Steps */
    .steps { display: flex; align-items: center; margin-bottom: 2rem; }
    .step { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #bbb; }
    .step.active { color: #1a1a1a; font-weight: 500; }
    .step.done { color: #4caf50; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 600; flex-shrink: 0; }
    .step.active .step-num { background: #1a1a1a; color: white; }
    .step.done .step-num { background: #4caf50; color: white; }
    .step-line { flex: 1; height: 1px; background: #eee; margin: 0 0.5rem; }
    .step-line.done { background: #4caf50; }

    /* Card */
    .card { background: white; border: 1px solid #ebebeb; border-radius: 12px; padding: 1.75rem; }
    .card h2 { font-size: 1rem; font-weight: 600; margin: 0 0 0.4rem; display: flex; align-items: center; gap: 0.5rem; }
    .hint { font-size: 0.85rem; color: #aaa; margin: 0 0 1.5rem; }

    /* Dropzone */
    .dropzone { border: 2px dashed #ddd; border-radius: 10px; padding: 2.5rem 1.5rem; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; }
    .dropzone.drag-over { border-color: #1a1a1a; background: #f8f8f6; }
    .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .drop-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .drop-text { margin: 0; color: #888; font-size: 0.9rem; }
    .link-btn { background: none; border: none; color: #1a1a1a; text-decoration: underline; cursor: pointer; font-size: inherit; padding: 0; }
    .file-name { margin: 0.75rem 0 0; font-size: 0.85rem; color: #555; font-weight: 500; }
    .template-hint { margin-top: 1.25rem; font-size: 0.8rem; color: #aaa; }
    .template-link { color: #1a1a1a; text-decoration: none; font-weight: 500; }
    .template-link:hover { text-decoration: underline; }

    /* Mapping */
    .mapping-table { display: flex; flex-direction: column; gap: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
    .mapping-header { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 0; padding: 0.6rem 1rem; background: #f8f8f6; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #aaa; }
    .mapping-row { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 0; align-items: center; padding: 0.6rem 1rem; border-top: 1px solid #f0f0ee; transition: background 0.1s; }
    .mapping-row.mapped { background: #fafff8; }
    .col-name { font-size: 0.875rem; font-weight: 500; }
    .col-preview { font-size: 0.8rem; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 0.5rem; }
    .field-select { padding: 0.3rem 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.8rem; outline: none; background: white; width: 100%; }
    .field-select:focus { border-color: #1a1a1a; }
    .error-msg { color: #c0392b; font-size: 0.85rem; margin: 0.5rem 0; }

    /* Preview */
    .count-badge { font-size: 0.72rem; background: #1a1a1a; color: white; padding: 0.1rem 0.5rem; border-radius: 20px; font-weight: 500; }
    .preview-table-wrap { overflow-x: auto; margin-bottom: 1rem; }
    .preview-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .preview-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #eee; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #aaa; }
    .preview-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0ee; }
    .preview-table .error-row td { color: #e74c3c; background: #fdf3f2; }
    .email-hint { color: #aaa; font-size: 0.78rem; margin-left: 0.3rem; }
    .more-hint { font-size: 0.8rem; color: #aaa; margin: 0.5rem 0 0; }
    .warn-msg { font-size: 0.85rem; color: #e67e22; background: #fef9f0; border: 1px solid #fce5b0; border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 1rem; }

    /* Result */
    .result-card { text-align: center; padding: 2.5rem; }
    .result-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .result-card h2 { justify-content: center; font-size: 1.15rem; }
    .result-stats { display: flex; justify-content: center; gap: 2rem; margin: 1.5rem 0; }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-num { font-size: 2rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: #aaa; margin-top: 0.25rem; }
    .stat.success .stat-num { color: #27ae60; }
    .stat.warn .stat-num { color: #e67e22; }
    .error-details { text-align: left; margin: 1rem 0; font-size: 0.85rem; }
    .error-details summary { cursor: pointer; color: #aaa; }
    .error-list { margin: 0.5rem 0 0 1rem; padding: 0; color: #c0392b; }
    .error-list li { margin-bottom: 0.25rem; }
    .result-actions { display: flex; justify-content: center; gap: 0.75rem; margin-top: 1.5rem; }

    /* Footer buttons */
    .card-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; border-top: 1px solid #f0f0ee; padding-top: 1.25rem; }
    .btn-primary { background: #1a1a1a; color: white; padding: 0.6rem 1.25rem; border-radius: 8px; border: none; font-size: 0.875rem; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #333; }
    .btn-secondary { border: 1px solid #ddd; background: white; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.875rem; color: #333; cursor: pointer; }
    .btn-secondary:hover { background: #f5f5f5; }
  `],
})
export class StudentImportComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly targetFields = TARGET_FIELDS;
  readonly stepLabels = [
    { id: 'upload'  as Step, label: 'Datei' },
    { id: 'map'     as Step, label: 'Zuordnen' },
    { id: 'preview' as Step, label: 'Vorschau' },
    { id: 'result'  as Step, label: 'Ergebnis' },
  ];

  step = signal<Step>('upload');
  dragOver = signal(false);
  fileName = signal('');
  csvHeaders = signal<string[]>([]);
  csvRows = signal<string[][]>([]);
  mappings = signal<string[]>([]);
  mappingError = signal('');
  importing = signal(false);
  importResult = signal<ImportResult | null>(null);

  previewRows = computed(() => this.buildRows(this.csvRows(), this.csvHeaders(), this.mappings()));
  validCount = computed(() => this.previewRows().filter(r => r.firstName && r.lastName).length);
  invalidCount = computed(() => this.previewRows().filter(r => !r.firstName || !r.lastName).length);

  stepDone(id: Step): boolean {
    const order: Step[] = ['upload', 'map', 'preview', 'result'];
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
    // Trennzeichen erkennen: Semikolon oder Komma
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const parse = (line: string) =>
      line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, '').trim());

    const headers = parse(lines[0]);
    const rows = lines.slice(1).filter(l => l.trim()).map(parse);

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

  goToPreview(): void {
    const m = this.mappings();
    const hasFirst = m.includes('firstName');
    const hasLast = m.includes('lastName');
    if (!hasFirst || !hasLast) {
      this.mappingError.set('Bitte weisen Sie mindestens "Vorname" und "Nachname" zu.');
      return;
    }
    this.mappingError.set('');
    this.step.set('preview');
  }

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
    const rows = this.previewRows().filter(r => r['firstName'] && r['lastName']);
    this.http.post<ImportResult>('/api/students/import', { rows }).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.step.set('result');
        this.importing.set(false);
      },
      error: () => {
        this.importing.set(false);
      },
    });
  }

  reset(): void {
    this.step.set('upload');
    this.fileName.set('');
    this.csvHeaders.set([]);
    this.csvRows.set([]);
    this.mappings.set([]);
    this.importResult.set(null);
  }
}
