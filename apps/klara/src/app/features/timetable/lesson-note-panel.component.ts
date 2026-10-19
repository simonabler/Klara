import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NoteType, StudentRefDto, TimetableEntryDto } from '@app/domain';
import { ClassService } from '../classes/class.service';
import { NoteService } from '../notes/note.service';
import { ToastService } from '../../shared/toast/toast.service';
import { DAY_NAMES_LONG, PERIOD_TIMES } from './week.utils';

interface SavedNote {
  names: string;
  type: NoteType;
  content: string;
}

/**
 * Panel für eine Unterrichtsstunde im Stundenplan:
 * Schüler der Klasse antippen, Art wählen, Notiz schreiben, speichern.
 * Klasse und Fach kommen aus dem Stundenplan-Eintrag.
 */
@Component({
  selector: 'app-lesson-note-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="panel-inner">

      <!-- Header -->
      <div class="panel-header">
        <div class="panel-header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div class="panel-heading">
          <h2 class="panel-title">{{ entry?.subjectName }} · {{ entry?.className }}</h2>
          <span class="panel-subtitle">{{ lessonLabel() }}</span>
        </div>
        <button class="panel-close" (click)="closed.emit()" aria-label="Schließen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="panel-body">
        @if (loading()) {
          <p class="state">Klasse wird geladen…</p>
        } @else if (students().length === 0) {
          <p class="state">
            Diese Klasse hat noch keine Schülerinnen und Schüler.
            <a [routerLink]="['/app/classes', entry?.classId, 'edit']">Klasse bearbeiten</a>
          </p>
        } @else {
          <div class="field">
            <div class="field-label-row">
              <span class="field-label" id="lnp-students">Schüler/innen</span>
              <button type="button" class="link-btn" (click)="toggleAll()">
                {{ allSelected() ? 'Keine' : 'Alle' }} auswählen
              </button>
            </div>
            <div class="chip-grid" role="group" aria-labelledby="lnp-students">
              @for (s of students(); track s.id) {
                <button type="button" class="chip"
                        [class.selected]="isSelected(s.id)"
                        [attr.aria-pressed]="isSelected(s.id)"
                        (click)="toggle(s.id)">
                  {{ s.firstName }} {{ s.lastName.charAt(0) }}.
                </button>
              }
            </div>
          </div>

          <div class="field">
            <span class="field-label" id="lnp-type">Art</span>
            <div class="toggle-row" role="radiogroup" aria-labelledby="lnp-type">
              @for (t of noteTypes; track t.value) {
                <button type="button" class="toggle-btn" role="radio"
                        [class.active]="type() === t.value"
                        [attr.aria-checked]="type() === t.value"
                        (click)="type.set(t.value)">
                  {{ t.label }}
                </button>
              }
            </div>
          </div>

          <div class="field">
            <label for="lnp-content" class="field-label">Notiz</label>
            <textarea id="lnp-content" rows="4"
                      [ngModel]="content()" (ngModelChange)="content.set($event)"
                      (keydown.control.enter)="save()" (keydown.meta.enter)="save()"
                      placeholder="z. B. Hat das Experiment selbstständig erklärt"></textarea>
            <span class="field-hint">Strg + Enter speichert. Die Notiz wird für jede ausgewählte Person einzeln angelegt.</span>
          </div>

          @if (saved().length > 0) {
            <div class="saved">
              <span class="field-label">In dieser Stunde gespeichert</span>
              @for (n of saved(); track $index) {
                <div class="saved-item">
                  <span class="saved-type">{{ typeLabel(n.type) }}</span>
                  <span class="saved-names">{{ n.names }}</span>
                  <span class="saved-content">{{ n.content }}</span>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="panel-footer">
        <button type="button" class="btn btn-ghost" (click)="editEntry.emit()">Stunde bearbeiten</button>
        <div class="footer-actions">
          <button type="button" class="btn btn-primary" [disabled]="!canSave()" (click)="save()">
            {{ saving() ? 'Speichert…' : saveLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel-inner { display: flex; flex-direction: column; height: 100%; }
    .panel-header {
      display: flex; align-items: center; gap: var(--sp-3);
      padding: var(--sp-5); border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .panel-header-icon {
      width: 32px; height: 32px; border-radius: var(--r-sm); background: var(--info-bg);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .panel-heading { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .panel-title { font-size: 15px; font-weight: 600; color: var(--navy); margin: 0; }
    .panel-subtitle { font-size: 12px; color: var(--ink-faint); }
    .panel-close {
      width: 30px; height: 30px; border: none; background: var(--surface);
      border-radius: var(--r-sm); cursor: pointer; display: flex;
      align-items: center; justify-content: center; color: var(--ink-light);
    }
    .panel-close:hover { background: var(--border); }
    .panel-body { flex: 1; overflow-y: auto; padding: var(--sp-5); }
    .state { font-size: 14px; color: var(--ink-faint); }

    .field { margin-bottom: var(--sp-5); }
    .field-label { display: block; font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: var(--sp-2); }
    .field-label-row { display: flex; align-items: baseline; justify-content: space-between; }
    .field-hint { font-size: 12px; color: var(--ink-faint); margin-top: 4px; display: block; }
    .link-btn {
      background: none; border: none; padding: 0; cursor: pointer;
      font-family: var(--font-body); font-size: 12px; color: var(--teal);
    }
    .link-btn:hover { text-decoration: underline; }
    textarea { width: 100%; resize: vertical; margin: 0; }

    .chip-grid { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
    .chip {
      padding: 6px 12px; border-radius: 999px; border: 1.5px solid var(--border);
      background: var(--white); cursor: pointer; font-family: var(--font-body);
      font-size: 13px; color: var(--ink); transition: all .12s;
    }
    .chip:hover { border-color: var(--light-teal); }
    .chip.selected { border-color: var(--teal); background: #EEF6F9; color: var(--navy); font-weight: 600; }

    .toggle-row { display: flex; gap: var(--sp-2); }
    .toggle-btn {
      flex: 1; padding: var(--sp-2); border: 1.5px solid var(--border); border-radius: var(--r-sm);
      background: var(--white); cursor: pointer; font-family: var(--font-body);
      font-size: 13px; font-weight: 500; color: var(--ink-light); transition: all .12s;
    }
    .toggle-btn:hover { border-color: var(--light-teal); }
    .toggle-btn.active { border-color: var(--teal); background: #EEF6F9; color: var(--navy); }

    .saved { border-top: 1px solid var(--border); padding-top: var(--sp-4); }
    .saved-item {
      display: grid; grid-template-columns: auto 1fr; gap: 2px var(--sp-2);
      padding: var(--sp-2) 0; font-size: 13px;
    }
    .saved-type { font-size: 11px; font-weight: 600; color: var(--teal); }
    .saved-names { font-weight: 500; color: var(--navy); }
    .saved-content { grid-column: 1 / -1; color: var(--ink-light); }

    .panel-footer {
      padding: var(--sp-4) var(--sp-5); border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-shrink: 0;
    }
    .footer-actions { display: flex; gap: var(--sp-2); margin-left: auto; }
    .btn {
      display: inline-flex; align-items: center; gap: var(--sp-2); padding: 9px 18px;
      border-radius: var(--r-sm); font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .12s;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:hover:not(:disabled) { background: #243350; box-shadow: var(--sh-md); }
    .btn-ghost { background: transparent; color: var(--navy); border: 1.5px solid var(--border); }
    .btn-ghost:hover:not(:disabled) { border-color: var(--navy); background: var(--surface); }
  `],
})
export class LessonNotePanelComponent implements OnChanges {
  @Input() entry: TimetableEntryDto | null = null;
  /** Tag der angeklickten Stunde (für die Anzeige) */
  @Input() date: Date | null = null;

  @Output() closed    = new EventEmitter<void>();
  @Output() editEntry = new EventEmitter<void>();

  private readonly classSvc = inject(ClassService);
  private readonly noteSvc  = inject(NoteService);
  private readonly toast    = inject(ToastService);

  readonly noteTypes = [
    { value: NoteType.PARTICIPATION, label: 'Mitarbeit' },
    { value: NoteType.BEHAVIOUR,     label: 'Verhalten' },
    { value: NoteType.GENERAL,       label: 'Allgemein' },
  ];

  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly students = signal<StudentRefDto[]>([]);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly type     = signal<NoteType>(NoteType.PARTICIPATION);
  readonly content  = signal('');
  readonly saved    = signal<SavedNote[]>([]);

  readonly allSelected = computed(() =>
    this.students().length > 0 && this.selected().size === this.students().length,
  );
  readonly canSave = computed(() =>
    !this.saving() && this.selected().size > 0 && this.content().trim().length > 0,
  );
  readonly saveLabel = computed(() => {
    const n = this.selected().size;
    return n > 1 ? `Für ${n} speichern` : 'Speichern';
  });
  /** Tag, Datum, Stunde und Raum – wird bei Änderung der Inputs neu gebildet */
  readonly lessonLabel = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entry'] || changes['date']) {
      this.lessonLabel.set(this.buildLabel());
    }
    if (changes['entry']) {
      const prev = changes['entry'].previousValue as TimetableEntryDto | null;
      // Gleiche Klasse erneut geöffnet: Auswahl und Verlauf bleiben erhalten
      if (prev?.id !== this.entry?.id) this.reset();
      if (this.entry && prev?.classId !== this.entry.classId) this.loadStudents(this.entry.classId);
    }
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.students().map(s => s.id)));
  }

  typeLabel(type: NoteType): string {
    return this.noteTypes.find(t => t.value === type)?.label ?? type;
  }

  save(): void {
    if (!this.canSave() || !this.entry) return;
    const entry   = this.entry;
    const content = this.content().trim();
    const type    = this.type();
    const ids     = [...this.selected()];

    this.saving.set(true);
    forkJoin(ids.map(studentId => this.noteSvc.create({
      content, type, studentId,
      classId:   entry.classId,
      subjectId: entry.subjectId,
    }))).subscribe({
      next: () => {
        const names = this.students()
          .filter(s => ids.includes(s.id))
          .map(s => `${s.firstName} ${s.lastName}`)
          .join(', ');
        this.saved.update(list => [{ names, type, content }, ...list]);
        this.toast.show('success', ids.length > 1 ? `${ids.length} Notizen gespeichert` : 'Notiz gespeichert');
        this.content.set('');
        this.selected.set(new Set());
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('error', 'Notiz konnte nicht gespeichert werden', 'Bitte versuche es erneut.');
      },
    });
  }

  private reset(): void {
    this.selected.set(new Set());
    this.content.set('');
    this.type.set(NoteType.PARTICIPATION);
    this.saved.set([]);
  }

  private loadStudents(classId: string): void {
    this.loading.set(true);
    this.students.set([]);
    this.classSvc.getOne(classId).subscribe({
      next: cls => {
        const sorted = [...(cls.students ?? [])].sort((a, b) =>
          a.lastName.localeCompare(b.lastName, 'de') || a.firstName.localeCompare(b.firstName, 'de'),
        );
        this.students.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('error', 'Klasse konnte nicht geladen werden');
      },
    });
  }

  private buildLabel(): string {
    if (!this.entry) return '';
    const parts = [
      `${DAY_NAMES_LONG[this.entry.dayOfWeek] ?? ''}`,
      this.date ? this.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      `${this.entry.period}. Stunde`,
      PERIOD_TIMES[this.entry.period] ?? '',
      this.entry.room ?? '',
    ];
    return parts.filter(Boolean).join(' · ');
  }
}
