import { NoteType } from '../enums';

// ── Response DTO ────────────────────────────────────────────────────────────

export class NoteSubjectRefDto {
  id!: string;
  name!: string;
}

export class NoteSchoolLevelRefDto {
  id!: string;
  name!: string;
  year?: string;
}

export class NoteDto {
  id!: string;
  content!: string;
  type!: NoteType;
  studentId!: string;
  teacherId!: string;
  subjectId?: string;
  subject?: NoteSubjectRefDto;
  schoolLevelId?: string;
  schoolLevel?: NoteSchoolLevelRefDto;
  createdAt!: string;
}

// ── Create ──────────────────────────────────────────────────────────────────
// Dekoratoren leben nur im Backend (NestJS) – hier plain TypeScript

export class CreateNoteDto {
  content!: string;
  type!: NoteType;
  studentId!: string;
  subjectId?: string;
  schoolLevelId?: string;
}

// ── Update ──────────────────────────────────────────────────────────────────

export class UpdateNoteDto {
  content?: string;
  type?: NoteType;
  subjectId?: string;
  schoolLevelId?: string;
}

// ── Query / Filter ──────────────────────────────────────────────────────────

export class NoteFilterDto {
  studentId?: string;
  subjectId?: string;
  type?: NoteType;
  from?: string;
  to?: string;
}
