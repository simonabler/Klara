import { Component, OnInit, inject, signal, computed, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssessmentService } from '../assessments/assessment.service';
import { NoteService } from '../notes/note.service';
import {
  BeurteilungTableDto,
  TableStudentRowDto,
  NoteDto,
} from '@app/domain';

@Component({
  selector: 'app-beurteilung-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-wrap">

      @if (loading()) {
        <div class="table-state">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
        </div>
      } @else if (!table()) {
        <div class="table-empty">
          Wähle eine Klasse um die Tabellenansicht zu laden.
        </div>
      } @else if (table()!.rows.length === 0) {
        <div class="table-empty">
          Diese Klasse hat noch keine Schülerinnen und Schüler.
        </div>
      } @else {

        <!-- Grid-Tabelle -->
        <div class="grid-table"
             [style.grid-template-columns]="gridTemplate()">

          <!-- Header-Zeile -->
          <div class="cell cell-header cell-sticky">Schüler/in</div>
          <div class="cell cell-header cell-notes-header">Notizen</div>
          @for (col of table()!.columns; track col.id) {
            <div class="cell cell-header cell-event" [title]="col.title">
              <span class="col-title">{{ col.title }}</span>
              <span class="col-date">{{ col.date | date:'dd.MM.' }}</span>
            </div>
          }
          @if (table()!.gradingEnabled) {
            <div class="cell cell-header cell-avg">
              Ø
              @if (table()!.classAverage != null) {
                <span class="class-avg">{{ table()!.classAverage }}</span>
              }
            </div>
          }

          <!-- Datenzeilen -->
          @for (row of table()!.rows; track row.studentId; let odd = $odd) {
            <!-- Schüler-Spalte -->
            <div class="cell cell-sticky cell-student" [class.row-odd]="odd">
              <div class="student-avatar">
                @if (row.avatarUrl) {
                  <img [src]="row.avatarUrl" [alt]="row.firstName" />
                } @else {
                  <span>{{ row.firstName[0] }}{{ row.lastName[0] }}</span>
                }
              </div>
              <span class="student-name">{{ row.lastName }} {{ row.firstName }}</span>
            </div>

            <!-- Notizen-Spalte -->
            <div class="cell cell-notes" [class.row-odd]="odd">
              @if (row.noteCount > 0) {
                <button class="notes-badge" (click)="openDrawer(row)">
                  {{ row.noteCount }}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              }
            </div>

            <!-- Leistungs-Zellen -->
            @for (col of table()!.columns; track col.id) {
              <div class="cell cell-value" [class.row-odd]="odd"
                   [title]="table()!.rows[0] && cellComment(row, col.id)">
                <span class="cell-val" [class.has-comment]="cellComment(row, col.id)">
                  {{ cellDisplay(row, col.id) }}
                </span>
              </div>
            }

            <!-- Ø-Spalte -->
            @if (table()!.gradingEnabled) {
              <div class="cell cell-avg-val" [class.row-odd]="odd">
                @if (row.gradeAverage != null) {
                  <span class="avg-chip">{{ row.gradeAverage }}</span>
                }
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- ── Notizen-Drawer ── -->
    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <aside class="drawer">
        <div class="drawer-header">
          <div class="drawer-title">
            <span>Notizen</span>
            @if (drawerStudent()) {
              <span class="drawer-student">{{ drawerStudent()!.lastName }} {{ drawerStudent()!.firstName }}</span>
            }
          </div>
          <button class="drawer-close" (click)="closeDrawer()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="drawer-body">
          @if (drawerLoading()) {
            <p class="drawer-state">Lade Notizen…</p>
          } @else if (drawerNotes().length === 0) {
            <p class="drawer-state">Keine Notizen vorhanden.</p>
          } @else {
            @for (note of drawerNotes(); track note.id) {
              <div class="note-item" [attr.data-type]="note.type">
                <div class="note-meta">
                  <span class="note-type-badge">{{ noteTypeLabel(note.type) }}</span>
                  <span class="note-date">{{ note.createdAt | date:'dd.MM.yyyy' }}</span>
                </div>
                <p class="note-content">{{ note.content }}</p>
              </div>
            }
          }
        </div>
      </aside>
    }
  `,
  styles: [`
    /* ── Wrapper ── */
    .table-wrap { position: relative; overflow-x: auto; width: 100%; }

    .table-empty {
      padding: var(--sp-7) var(--sp-5); text-align: center;
      font-size: 14px; color: var(--ink-faint);
      background: var(--white); border: 1px dashed var(--border); border-radius: var(--r-lg);
    }

    /* ── Grid ── */
    .grid-table {
      display: grid;
      min-width: 100%;
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      overflow: hidden;
    }

    .cell {
      padding: var(--sp-2) var(--sp-3);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--white);
      display: flex; align-items: center;
      font-size: 13px; color: var(--ink);
    }
    .cell:last-child { border-right: none; }

    /* Sticky Schüler-Spalte */
    .cell-sticky {
      position: sticky; left: 0; z-index: 2;
      background: var(--white);
      box-shadow: 2px 0 4px rgba(30,50,70,.06);
    }

    /* Header */
    .cell-header {
      background: var(--surface) !important;
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--ink-faint); border-bottom: 2px solid var(--border);
      z-index: 3;
    }
    .cell-sticky.cell-header { z-index: 4; }

    .cell-event { flex-direction: column; align-items: flex-start; gap: 2px; min-width: 80px; }
    .col-title { color: var(--navy); font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
    .col-date  { color: var(--ink-faint); font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; }

    .cell-avg, .cell-avg-val { min-width: 60px; justify-content: center; background: var(--surface) !important; }
    .class-avg { margin-left: var(--sp-1); color: var(--navy); font-size: 13px; font-weight: 700; text-transform: none; letter-spacing: 0; }

    /* Datenzeilen */
    .cell-student { min-width: 180px; gap: var(--sp-2); }
    .row-odd .cell-sticky { background: var(--surface) !important; }
    .row-odd:not(.cell-sticky):not(.cell-header) { background: var(--surface); }
    .cell.row-odd { background: var(--surface); }

    .student-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--light-teal); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 11px; font-weight: 600; overflow: hidden;
    }
    .student-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .student-name { font-size: 13px; font-weight: 500; color: var(--navy); white-space: nowrap; }

    .cell-notes, .cell-notes-header { min-width: 64px; justify-content: center; }
    .notes-badge {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 20px;
      background: var(--light-teal); color: var(--navy);
      font-size: 12px; font-weight: 600;
      border: none; cursor: pointer; transition: background .12s;
    }
    .notes-badge:hover { background: var(--teal); color: var(--white); }

    .cell-value { min-width: 80px; justify-content: center; }
    .cell-val { font-size: 14px; font-weight: 500; color: var(--ink); }
    .cell-val.has-comment { text-decoration: underline dotted var(--ink-faint); cursor: help; }

    .avg-chip {
      padding: 2px 10px; border-radius: 20px;
      background: var(--navy); color: var(--white);
      font-size: 12px; font-weight: 700;
    }

    /* ── Skeleton ── */
    .skeleton-row {
      height: 44px; border-radius: var(--r-sm);
      background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      margin-bottom: var(--sp-2);
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Drawer ── */
    .drawer-backdrop {
      position: fixed; inset: 0; background: rgba(28,43,58,.4); z-index: 40;
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(420px, 100vw);
      background: var(--white); z-index: 50;
      display: flex; flex-direction: column;
      box-shadow: -4px 0 24px rgba(30,50,70,.12);
      animation: slideIn .25s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }

    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--sp-4) var(--sp-5);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .drawer-title { display: flex; flex-direction: column; gap: 2px; }
    .drawer-title > span:first-child { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--ink-faint); }
    .drawer-student { font-size: 16px; font-weight: 600; color: var(--navy); }
    .drawer-close {
      background: none; border: none; cursor: pointer; color: var(--ink-faint);
      padding: var(--sp-2); border-radius: var(--r-sm);
      display: flex; align-items: center; transition: color .12s, background .12s;
    }
    .drawer-close:hover { color: var(--navy); background: var(--surface); }

    .drawer-body { flex: 1; overflow-y: auto; padding: var(--sp-4) var(--sp-5); }
    .drawer-state { font-size: 14px; color: var(--ink-faint); text-align: center; padding: var(--sp-6) 0; }

    .note-item {
      border-left: 3px solid var(--teal);
      padding: var(--sp-3) var(--sp-4);
      margin-bottom: var(--sp-3);
      border-radius: 0 var(--r-sm) var(--r-sm) 0;
      background: var(--surface);
    }
    .note-item[data-type="BEHAVIOUR"] { border-left-color: var(--sand); }
    .note-meta { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-2); }
    .note-type-badge { font-size: 11px; font-weight: 600; color: var(--teal); }
    .note-item[data-type="BEHAVIOUR"] .note-type-badge { color: #B08060; }
    .note-date { font-size: 11px; color: var(--ink-faint); margin-left: auto; }
    .note-content { font-size: 13px; color: var(--ink-light); line-height: 1.6; margin: 0; }
  `],
})
export class BeurteilungTableComponent implements OnChanges {
  private readonly assessmentService = inject(AssessmentService);
  private readonly noteService       = inject(NoteService);

  @Input() classId    = '';
  @Input() subjectId  = '';
  @Input() schoolYear = '';

  loading       = signal(false);
  table         = signal<BeurteilungTableDto | null>(null);
  drawerOpen    = signal(false);
  drawerStudent = signal<TableStudentRowDto | null>(null);
  drawerNotes   = signal<NoteDto[]>([]);
  drawerLoading = signal(false);

  gridTemplate = computed(() => {
    const t = this.table();
    if (!t) return '';
    const studentCol = '180px';
    const notesCol   = '64px';
    const eventCols  = t.columns.map(() => 'minmax(80px, 1fr)').join(' ');
    const avgCol     = t.gradingEnabled ? ' 64px' : '';
    return `${studentCol} ${notesCol} ${eventCols}${avgCol}`;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (this.classId) this.load();
  }

  load(): void {
    this.loading.set(true);
    this.assessmentService.getTable(
      this.classId,
      this.subjectId || undefined,
      this.schoolYear || undefined,
    ).subscribe({
      next: t  => { this.table.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  cellDisplay(row: TableStudentRowDto, eventId: string): string {
    const cell = row.cells?.[eventId];
    if (!cell || cell.value == null) return '';
    return String(cell.value);
  }

  cellComment(row: TableStudentRowDto, eventId: string): string {
    return row.cells?.[eventId]?.comment ?? '';
  }

  noteTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PARTICIPATION: 'Mitarbeit',
      BEHAVIOUR:     'Verhalten',
      GENERAL:       'Allgemein',
    };
    return labels[type] ?? type;
  }

  openDrawer(row: TableStudentRowDto): void {
    this.drawerStudent.set(row);
    this.drawerOpen.set(true);
    this.drawerNotes.set([]);
    this.drawerLoading.set(true);

    this.noteService.getByStudent(row.studentId, this.classId, this.subjectId || undefined)
      .subscribe({
        next: notes => { this.drawerNotes.set(notes); this.drawerLoading.set(false); },
        error: ()   => this.drawerLoading.set(false),
      });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerStudent.set(null);
  }
}
