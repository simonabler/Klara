// ---------- Subject ----------

export class SubjectDto {
  id!: string;
  name!: string;
}

export class CreateSubjectDto {
  name!: string;
}

export class UpdateSubjectDto {
  name?: string;
}

// ---------- Class ----------

export class StudentRefDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  avatarUrl?: string;
}

export class ClassDto {
  id!: string;
  name!: string;
  schoolYear?: string;
  schoolLevel?: number;
  studentIds!: string[];
  studentCount!: number;
  students?: StudentRefDto[];
}

export class CreateClassDto {
  name!: string;
  schoolYear?: string;
  schoolLevel?: number;
  studentIds?: string[];
}

export class UpdateClassDto {
  name?: string;
  schoolYear?: string;
  schoolLevel?: number;
  studentIds?: string[];
}

// Kompakte Referenz für andere DTOs
export class ClassRefDto {
  id!: string;
  name!: string;
  schoolYear?: string;
  schoolLevel?: number;
}
