import { CreateParentDto, ParentDto } from './parent.dto';

export class ClassRefDto {
  id!: string;
  name!: string;
}

export class StudentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
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
  parents?: CreateParentDto[];
}

export class UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  parents?: CreateParentDto[];
}

// ---------- Bulk Import ----------

export class ImportStudentRowDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  parent1FirstName?: string;
  parent1LastName?: string;
  parent1Email?: string;
  parent1Phone?: string;
}

export class BulkImportStudentsDto {
  rows!: ImportStudentRowDto[];
}

export class ImportResultDto {
  imported!: number;
  skipped!: number;
  errors!: { row: number; reason: string }[];
}
