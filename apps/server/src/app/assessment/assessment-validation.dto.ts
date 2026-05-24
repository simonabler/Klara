import { IsArray, Max, Min, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAssessmentEventValidationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}

export class UpdateAssessmentEventValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  type?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class UpsertStudentResultValidationDto {
  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  grade?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalComment?: string;
}

export class BulkUpsertResultsValidationDto {
  @IsArray()
  results!: UpsertStudentResultValidationDto[];
}

export class AssignStudentsValidationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[];
}
