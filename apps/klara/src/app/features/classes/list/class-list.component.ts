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
        <a class="btn-primary" routerLink="/classes/new">+ Neu</a>
      </header>

      @if (loading()) {
        <p class="state-msg">Wird geladen…</p>
      } @else if (error()) {
        <p class="state-msg error">{{ error() }}</p>
      } @else if (classes().length === 0) {
        <p class="state-msg">Noch keine Klassen angelegt.</p>
      } @else {
        <ul class="class-list">
          @for (cls of classes(); track cls.id) {
            <li class="class-card">
              <a [routerLink]="['/classes', cls.id, 'edit']" class="class-link">
                <div class="class-name">{{ cls.name }}</div>
                <div class="class-meta">
                  @if (cls.schoolLevel) {
                    <span class="badge">{{ cls.schoolLevel.name }}{{ cls.schoolLevel.year ? ' · ' + cls.schoolLevel.year : '' }}</span>
                  }
                  <span class="student-count">{{ cls.studentCount }} {{ cls.studentCount === 1 ? 'Schüler' : 'Schüler' }}</span>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .btn-primary { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
    .btn-primary:hover { background: #333; }
    .state-msg { color: #888; }
    .error { color: #c0392b; }
    .class-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .class-card { border: 1px solid #eee; border-radius: 10px; transition: border-color 0.15s; }
    .class-card:hover { border-color: #ccc; }
    .class-link { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; text-decoration: none; color: inherit; }
    .class-name { font-weight: 600; font-size: 1.05rem; }
    .class-meta { display: flex; align-items: center; gap: 0.75rem; }
    .badge { background: #f0f0ee; color: #555; font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 20px; }
    .student-count { font-size: 0.85rem; color: #999; }
  `],
})
export class ClassListComponent implements OnInit {
  private readonly classService = inject(ClassService);
  classes = signal<ClassDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.classService.getAll().subscribe({
      next: (data) => {
        this.classes.set(data.map(c => ({ ...c, studentCount: c.studentIds?.length ?? 0 })));
        this.loading.set(false);
      },
      error: () => { this.error.set('Klassen konnten nicht geladen werden.'); this.loading.set(false); },
    });
  }
}
