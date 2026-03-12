/**
 * Backend-only Validierungs-DTOs für die Note-Endpoints.
 * class-validator Dekoratoren leben hier, nicht in @app/domain,
 * damit das Angular-Frontend kein reflect-metadata braucht.
 */
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { NoteType } from '@app/domain';

export class CreateNoteValidationDto {
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

export class UpdateNoteValidationDto {
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

export class NoteFilterValidationDto {
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
