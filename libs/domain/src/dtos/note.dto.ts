import { NoteType } from '../enums';

// ── Refs ────────────────────────────────────────────────────────────────────

export class NoteSubjectRefDto {
  id!: string;
  name!: string;
}

export class NoteClassRefDto {
  id!: string;
  name!: string;
  schoolYear?: string;
  schoolLevel?: number;
}

// ── Response DTO ────────────────────────────────────────────────────────────

export class NoteDto {
  id!: string;
  content!: string;
  type!: NoteType;
  studentId!: string;
  teacherId!: string;
  subjectId?: string;
  subject?: NoteSubjectRefDto;
  classId?: string;
  class?: NoteClassRefDto;
  createdAt!: string;
}

// ── Create ──────────────────────────────────────────────────────────────────

export class CreateNoteDto {
  content!: string;
  type!: NoteType;
  studentId!: string;
  subjectId?: string;
  classId?: string;
}

// ── Update ──────────────────────────────────────────────────────────────────

export class UpdateNoteDto {
  content?: string;
  type?: NoteType;
  subjectId?: string;
  classId?: string;
}

// ── Filter ──────────────────────────────────────────────────────────────────

export class NoteFilterDto {
  studentId?: string;
  subjectId?: string;
  classId?: string;
  type?: NoteType;
  from?: string;
  to?: string;
}
