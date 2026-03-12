import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
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

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsEnum(NoteType)
  type!: NoteType;

  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  schoolLevelId?: string;
}

// ── Update ──────────────────────────────────────────────────────────────────

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  schoolLevelId?: string;
}

// ── Query / Filter ──────────────────────────────────────────────────────────

export class NoteFilterDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
