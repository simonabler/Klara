import { IsArray, Max, Min, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AssessmentEventType } from '@app/domain';

export class CreateAssessmentEventValidationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(AssessmentEventType)
  type!: AssessmentEventType;

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
  @IsEnum(AssessmentEventType)
  type?: AssessmentEventType;

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
  @Max(5)
  grade?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
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
