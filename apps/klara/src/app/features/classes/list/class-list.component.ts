import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ClassService } from '../class.service';
import { ClassDto } from '@app/domain';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Klassen</h1>
        <a class="btn btn-primary" routerLink="/app/classes/new">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neu
        </a>
      </header>

      @if (loading()) {
        <p class="state-msg">Wird geladen…</p>
      } @else if (error()) {
        <p class="state-msg state-error">{{ error() }}</p>
      } @else if (classes().length === 0) {
        <div class="empty-state">
          <p>Noch keine Klassen angelegt.</p>
          <a class="btn btn-primary" routerLink="/app/classes/new">Erste Klasse anlegen</a>
        </div>
      } @else {
        <ul class="class-list">
          @for (cls of classes(); track cls.id) {
            <li class="class-card">
              <a [routerLink]="['/app/classes', cls.id, 'edit']" class="class-link">
                <span class="class-name">{{ cls.name }}</span>
                <div class="class-meta">
                  @if (cls.schoolYear) {
                    <span class="chip chip-ghost">{{ cls.schoolYear }}</span>
                  }
                  @if (cls.schoolLevel) {
                    <span class="chip chip-teal">{{ cls.schoolLevel }}. Schulstufe</span>
                  }
                  <span class="student-count">{{ studentCount(cls) }} Schüler</span>
                  <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-5); }
    h1 { font-family: var(--font-display); font-size: 26px; font-weight: 400; color: var(--navy); margin: 0; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; transition: all .15s; text-decoration: none;
    }
    .btn-primary { background: var(--navy); color: var(--white); }
    .btn-primary:hover { background: #243350; box-shadow: var(--sh-md); }

    .state-msg { color: var(--ink-faint); font-size: 14px; }
    .state-error { color: var(--error-fg); }
    .empty-state { text-align: center; padding: var(--sp-7) 0; color: var(--ink-faint); display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); }

    .class-list { list-style: none; display: flex; flex-direction: column; gap: var(--sp-2); }
    .class-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      box-shadow: var(--sh-sm);
      transition: box-shadow .15s;
    }
    .class-card:hover { box-shadow: var(--sh-md); }
    .class-link {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--sp-4) var(--sp-5); text-decoration: none; color: inherit;
    }
    .class-name { font-size: 15px; font-weight: 500; color: var(--navy); }
    .class-meta { display: flex; align-items: center; gap: var(--sp-3); }
    .chip { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .chip-teal { background: var(--light-teal); color: var(--navy); }
    .student-count { font-size: 13px; color: var(--ink-faint); }
    .chevron { color: var(--border); }

    @media (max-width: 768px) {
      .page { padding: var(--sp-4) var(--sp-3); }
      .page-header { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
      h1 { font-size: 22px; }
      .class-row { padding: var(--sp-3); }
    }
  `],
})
export class ClassListComponent implements OnInit {
  private readonly classService = inject(ClassService);
  classes = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.classService.getAll().subscribe({
      next: (data) => { this.classes.set(data); this.loading.set(false); },
      error: () => { this.error.set('Klassen konnten nicht geladen werden.'); this.loading.set(false); },
    });
  }

  studentCount(cls: any): number { return cls.students?.length ?? 0; }

}
