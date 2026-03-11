import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// ---------- SchoolLevel ----------

export class SchoolLevelDto {
  id!: string;
  name!: string;
  year?: string;
}

export class CreateSchoolLevelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  year?: string;
}

export class UpdateSchoolLevelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  year?: string;
}

// ---------- Subject ----------

export class SubjectDto {
  id!: string;
  name!: string;
}

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
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
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  schoolLevelId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  schoolLevelId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
