import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StudentService } from '../student.service';
import { StudentDto } from '@app/domain';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Schüler</h1>
        <div class="header-actions"><a class="btn-secondary" routerLink="/students/import">↑ Import</a><a class="btn-primary" routerLink="/students/new">+ Neu</a></div>
      </header>

      @if (loading()) {
        <p class="state-msg">Wird geladen…</p>
      } @else if (error()) {
        <p class="state-msg error">{{ error() }}</p>
      } @else if (students().length === 0) {
        <p class="state-msg">Noch keine Schüler angelegt.</p>
      } @else {
        <ul class="student-list">
          @for (student of students(); track student.id) {
            <li class="student-card">
              <a [routerLink]="['/students', student.id]" class="student-link">
                <div class="avatar">
                  @if (student.avatarUrl) {
                    <img [src]="student.avatarUrl" [alt]="student.firstName" />
                  } @else {
                    <span class="avatar-initials">{{ initials(student) }}</span>
                  }
                </div>
                <div class="student-info">
                  <span class="student-name">{{ student.lastName }} {{ student.firstName }}</span>
                  @if (student.classes?.length) {
                    <span class="student-class">{{ student.classes[0].name }}</span>
                  }
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
    .header-actions { display: flex; gap: 0.5rem; } .btn-primary { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 500; } .btn-secondary { border: 1px solid #ddd; background: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.875rem; color: #555; }
    .btn-primary:hover { background: #333; }
    .state-msg { color: #888; }
    .error { color: #c0392b; }
    .student-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .student-card { border: 1px solid #eee; border-radius: 10px; transition: border-color 0.15s; }
    .student-card:hover { border-color: #ccc; }
    .student-link { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1rem; text-decoration: none; color: inherit; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: #f0f0ee; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials { font-size: 0.85rem; font-weight: 600; color: #666; }
    .student-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .student-name { font-weight: 500; font-size: 0.95rem; }
    .student-class { font-size: 0.82rem; color: #888; }
  `],
})
export class StudentListComponent implements OnInit {
  private readonly studentService = inject(StudentService);

  students = signal<StudentDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.studentService.getAll().subscribe({
      next: (data) => { this.students.set(data); this.loading.set(false); },
      error: () => { this.error.set('Schüler konnten nicht geladen werden.'); this.loading.set(false); },
    });
  }

  initials(student: StudentDto): string {
    return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  }
}
