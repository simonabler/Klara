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
          <a class="btn-edit" [routerLink]="['/students', student()!.id, 'edit']">Bearbeiten</a>
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
          <div class="section-label">Stammdaten</div>
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
            <div class="section-label">Erziehungsberechtigte</div>
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
    .page { max-width: 640px; margin: 0 auto; padding: var(--sp-6) var(--sp-5); }

    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: var(--sp-6);
    }
    .back-link { color: var(--ink-faint); font-size: 13px; transition: color .15s; }
    .back-link:hover { color: var(--ink); }
    .btn-edit {
      padding: 7px 14px; border: 1.5px solid var(--border); border-radius: var(--r-sm);
      background: var(--white); font-family: var(--font-body); font-size: 13px;
      font-weight: 500; color: var(--ink); text-decoration: none; transition: all .15s;
    }
    .btn-edit:hover { border-color: var(--navy); color: var(--navy); }

    /* Profile header */
    .profile {
      display: flex; align-items: center; gap: var(--sp-5);
      margin-bottom: var(--sp-6);
      padding-bottom: var(--sp-6);
      border-bottom: 1px solid var(--border);
    }
    .avatar-large {
      width: 72px; height: 72px; border-radius: 50%;
      background: var(--navy); color: var(--white);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; overflow: hidden;
    }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials { font-size: 22px; font-weight: 600; }
    .profile-main h1 {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 400;
      color: var(--navy); margin: 0 0 var(--sp-2);
    }
    .badge {
      display: inline-flex; align-items: center;
      background: var(--light-teal); color: var(--navy);
      font-size: 12px; font-weight: 500;
      padding: 3px 10px; border-radius: 20px;
    }

    /* Info sections */
    .info-section { margin-bottom: var(--sp-6); }
    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--ink-faint);
      margin-bottom: var(--sp-3);
      display: flex; align-items: center; gap: var(--sp-3);
    }
    .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .info-grid { display: grid; grid-template-columns: 140px 1fr; gap: var(--sp-2) var(--sp-4); margin: 0; }
    dt { color: var(--ink-faint); font-size: 13px; padding-top: 1px; }
    dd { margin: 0; font-size: 14px; color: var(--ink); }

    .parent-card {
      padding: var(--sp-3) var(--sp-4);
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      margin-bottom: var(--sp-2);
      display: flex; flex-direction: column; gap: 3px;
      box-shadow: var(--sh-sm);
    }
    .parent-name { font-weight: 500; font-size: 14px; color: var(--ink); }
    .parent-contact { font-size: 12px; color: var(--ink-faint); }

    .state-msg { color: var(--ink-faint); font-size: 14px; }
    .error { color: var(--error-fg); }
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
