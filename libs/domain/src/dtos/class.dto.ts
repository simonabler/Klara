// ---------- SchoolLevel ----------

export class SchoolLevelDto {
  id!: string;
  name!: string;
  year?: string;
}

export class CreateSchoolLevelDto {
  name!: string;
  year?: string;
}

export class UpdateSchoolLevelDto {
  name?: string;
  year?: string;
}

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

export class ClassDto {
  id!: string;
  name!: string;
  schoolLevelId?: string;
  schoolLevel?: SchoolLevelDto;
  studentIds!: string[];
  studentCount!: number;
}

export class CreateClassDto {
  name!: string;
  schoolLevelId?: string;
  studentIds?: string[];
}

export class UpdateClassDto {
  name?: string;
  schoolLevelId?: string;
  studentIds?: string[];
}
