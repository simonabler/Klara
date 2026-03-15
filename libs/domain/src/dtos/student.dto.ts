import { CreateParentDto, ParentDto } from './parent.dto';
import { ClassRefDto } from './class.dto';
import { Gender } from '../enums';

export class StudentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  avatarUrl?: string;
  teacherId!: string;
  parents!: ParentDto[];
  classes!: ClassRefDto[];
  createdAt!: string;
  updatedAt!: string;
}

export class CreateStudentDto {
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  gender?: string;
  parents?: CreateParentDto[];
}

export class UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  gender?: string;
  parents?: CreateParentDto[];
}

// ---------- Bulk Import ----------

export type ImportAction = 'create' | 'update' | 'ignore';

export class ImportStudentRowDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  gender?: string;
  className?: string;
  schoolYear?: string;
  parent1FirstName?: string;
  parent1LastName?: string;
  parent1Email?: string;
  parent1Phone?: string;
  // Gesetzt vom Frontend nach der Konflikt-Auflösung
  action?: ImportAction;
  existingStudentId?: string;
}

export class BulkImportStudentsDto {
  rows!: ImportStudentRowDto[];
}

export class ImportResultDto {
  imported!: number;
  updated!: number;
  skipped!: number;
  classesCreated!: number;
  errors!: { row: number; reason: string }[];
}

// ---------- Duplicate Check ----------

export class CheckDuplicatesRequestDto {
  rows!: { firstName: string; lastName: string; dateOfBirth?: string }[];
}

export class DuplicateMatchDto {
  rowIndex!: number;
  existingStudentId!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  classes!: { id: string; name: string; schoolYear?: string }[];
}

export class CheckDuplicatesResultDto {
  matches!: DuplicateMatchDto[];
}
