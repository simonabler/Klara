import { CreateParentDto, ParentDto } from './parent.dto';
import { ClassRefDto } from './class.dto';

export class StudentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  email?: string;
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
  parents?: CreateParentDto[];
}

export class UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  parents?: CreateParentDto[];
}

// ---------- Bulk Import ----------

export class ImportStudentRowDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  className?: string;
  schoolYear?: string;
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
  classesCreated!: number;
  errors!: { row: number; reason: string }[];
}
