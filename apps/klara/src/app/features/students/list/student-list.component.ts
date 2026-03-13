import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../student.service';
import { StudentDto } from '@app/domain';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Schüler</h1>
        <div class="header-actions">
          <a class="btn btn-ghost" routerLink="/app/students/import">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Import
          </a>
          <a class="btn btn-primary" routerLink="/app/students/new">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neu
          </a>
        </div>
      </header>

      @if (loading()) {
        <p class="state-msg">Wird geladen…</p>
      } @else if (error()) {
        <p class="state-msg state-error">{{ error() }}</p>
      } @else if (students().length === 0) {
        <div class="empty-state">
          <p>Noch keine Schüler angelegt.</p>
          <a class="btn btn-primary" routerLink="/app/students/new">Ersten Schüler anlegen</a>
        </div>
      } @else {
        <!-- Suchzeile -->
        <div class="search-bar">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="search-input" type="search" [(ngModel)]="searchQuery"
                 placeholder="Name suchen…" autocomplete="off" />
          @if (searchQuery()) {
            <button class="search-clear" (click)="searchQuery.set('')" aria-label="Suche löschen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          }
        </div>

        @if (filtered().length === 0) {
          <div class="empty-state empty-state--search">
            <p>Kein Schüler gefunden für „{{ searchQuery() }}".</p>
          </div>
        } @else {
          <!-- Trefferzahl wenn Suche aktiv -->
          @if (searchQuery()) {
            <p class="result-count">{{ filtered().length }} von {{ students().length }}</p>
          }
          <ul class="student-list">
            @for (student of filtered(); track student.id) {
              <li class="student-row">
                <a [routerLink]="['/app/students', student.id]" class="student-link">
                  <div class="avatar">
                    @if (student.avatarUrl) {
                      <img [src]="student.avatarUrl" [alt]="student.firstName" />
                    } @else {
                      {{ student.firstName[0] }}{{ student.lastName[0] }}
                    }
                  </div>
                  <div class="student-info">
                    <span class="student-name">{{ student.lastName }} {{ student.firstName }}</span>
                    @if (student.dateOfBirth) {
                      <span class="student-meta">geb. {{ student.dateOfBirth | date:'dd.MM.yyyy' }}</span>
                    }
                  </div>
                </a>
                <a [routerLink]="['/app/students', student.id, 'edit']" class="btn btn-ghost btn-sm">Bearbeiten</a>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--sp-5);
    }
    h1 {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 400;
      color: var(--navy);
      margin: 0;
    }
    .header-actions { display: flex; gap: var(--sp-2); }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:hover { background: #243350; box-shadow: var(--sh-md); }
    .btn-ghost { background: transparent; color: var(--navy); border: 1.5px solid var(--border); }
    .btn-ghost:hover { border-color: var(--navy); background: var(--surface); }
    .btn-sm { padding: 5px 12px; font-size: 12px; }

    /* Suchleiste */
    .search-bar {
      position: relative;
      margin-bottom: var(--sp-4);
    }
    .search-icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: var(--ink-faint); pointer-events: none;
    }
    .search-input {
      width: 100%; padding: 9px 36px 9px 36px;
      border: 1.5px solid var(--border); border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 14px; color: var(--ink);
      background: var(--white); outline: none; transition: border-color .15s;
    }
    .search-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(123,170,186,.18); }
    .search-input::-webkit-search-cancel-button { display: none; }
    .search-clear {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      width: 22px; height: 22px; border-radius: 50%; border: none;
      background: var(--border); color: var(--ink-faint);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .15s;
    }
    .search-clear:hover { background: var(--ink-faint); color: var(--white); }

    .result-count { font-size: 12px; color: var(--ink-faint); margin-bottom: var(--sp-3); }

    /* States */
    .state-msg { color: var(--ink-faint); font-size: 14px; }
    .state-error { color: var(--error-fg); }
    .empty-state { text-align: center; padding: var(--sp-7) 0; color: var(--ink-faint); display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); }
    .empty-state--search { padding: var(--sp-5) 0; }

    /* List */
    .student-list { list-style: none; display: flex; flex-direction: column; gap: var(--sp-2); }
    .student-row {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      padding: var(--sp-3) var(--sp-4);
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      box-shadow: var(--sh-sm);
      transition: box-shadow .15s;
    }
    .student-row:hover { box-shadow: var(--sh-md); }
    .student-link {
      display: flex; align-items: center; gap: var(--sp-3);
      flex: 1; text-decoration: none; color: inherit; min-width: 0;
    }

    /* Avatar */
    .avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--navy); color: var(--white);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; flex-shrink: 0; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }

    .student-name { font-size: 14px; font-weight: 500; color: var(--navy); display: block; }
    .student-meta { font-size: 12px; color: var(--ink-faint); }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      .page-header { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
      .page-header h1 { font-size: 22px; }
      .header-actions { width: 100%; justify-content: flex-end; }
      .student-row { padding: var(--sp-3); gap: var(--sp-3); }
    }
  `],
})
export class StudentListComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  students  = signal<StudentDto[]>([]);
  loading   = signal(true);
  error     = signal<string | null>(null);
  searchQuery = signal('');

  filtered = computed<StudentDto[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.students();
    return this.students().filter(s =>
      `${s.firstName} ${s.lastName} ${s.lastName} ${s.firstName}`
        .toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.studentService.getAll().subscribe({
      next: (data) => { this.students.set(data); this.loading.set(false); },
      error: () => { this.error.set('Schüler konnten nicht geladen werden.'); this.loading.set(false); },
    });
  }
}
