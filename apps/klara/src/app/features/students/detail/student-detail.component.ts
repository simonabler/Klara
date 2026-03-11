import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StudentService } from '../student.service';
import { StudentDto } from '@app/domain';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      @if (loading()) {
        <p class="state-msg">Wird geladen…</p>
      } @else if (error()) {
        <p class="state-msg error">{{ error() }}</p>
      } @else if (student()) {
        <header class="page-header">
          <a class="back-link" routerLink="/students">← Schüler</a>
          <a class="btn-secondary" [routerLink]="['/students', student()!.id, 'edit']">Bearbeiten</a>
        </header>

        <div class="profile">
          <div class="avatar-large">
            @if (student()!.avatarUrl) {
              <img [src]="student()!.avatarUrl" [alt]="student()!.firstName" />
            } @else {
              <span class="avatar-initials">{{ initials() }}</span>
            }
          </div>

          <div class="profile-main">
            <h1>{{ student()!.firstName }} {{ student()!.lastName }}</h1>
            @if (student()!.classes?.length) {
              <span class="badge">{{ student()!.classes[0].name }}</span>
            }
          </div>
        </div>

        <section class="info-section">
          <h2>Stammdaten</h2>
          <dl class="info-grid">
            <dt>Vorname</dt><dd>{{ student()!.firstName }}</dd>
            <dt>Nachname</dt><dd>{{ student()!.lastName }}</dd>
            @if (student()!.dateOfBirth) {
              <dt>Geburtsdatum</dt>
              <dd>{{ student()!.dateOfBirth | date:'dd.MM.yyyy' }}</dd>
            }
          </dl>
        </section>

        @if (student()!.parents?.length) {
          <section class="info-section">
            <h2>Erziehungsberechtigte</h2>
            @for (parent of student()!.parents; track parent.id) {
              <div class="parent-card">
                <span class="parent-name">{{ parent.firstName }} {{ parent.lastName }}</span>
                @if (parent.email) { <span class="parent-contact">{{ parent.email }}</span> }
                @if (parent.phone) { <span class="parent-contact">{{ parent.phone }}</span> }
              </div>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .back-link { color: #666; text-decoration: none; font-size: 0.9rem; }
    .back-link:hover { color: #333; }
    .btn-secondary { border: 1px solid #ddd; background: white; padding: 0.4rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.875rem; color: #333; }
    .btn-secondary:hover { background: #f5f5f5; }
    .profile { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; }
    .avatar-large { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #f0f0ee; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials { font-size: 1.5rem; font-weight: 600; color: #666; }
    .profile-main h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 0.4rem; }
    .badge { background: #f0f0ee; color: #555; font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 20px; }
    .info-section { margin-bottom: 2rem; }
    .info-section h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin: 0 0 0.75rem; }
    .info-grid { display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem 1rem; margin: 0; }
    dt { color: #888; font-size: 0.875rem; }
    dd { margin: 0; font-size: 0.875rem; }
    .parent-card { padding: 0.75rem 1rem; border: 1px solid #eee; border-radius: 8px; margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .parent-name { font-weight: 500; font-size: 0.9rem; }
    .parent-contact { font-size: 0.82rem; color: #888; }
    .state-msg { color: #888; }
    .error { color: #c0392b; }
  `],
})
export class StudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentService);

  student = signal<StudentDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.studentService.getOne(id).subscribe({
      next: (data) => { this.student.set(data); this.loading.set(false); },
      error: () => { this.error.set('Schüler konnte nicht geladen werden.'); this.loading.set(false); },
    });
  }

  initials(): string {
    const s = this.student();
    if (!s) return '';
    return `${s.firstName[0]}${s.lastName[0]}`.toUpperCase();
  }
}
