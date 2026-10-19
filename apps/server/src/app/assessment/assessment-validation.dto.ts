import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, Max, Min, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

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
  @MaxLength(50)
  ptmValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Obergrenze pro Bulk-Request – eine Klasse hat deutlich weniger Schüler */
export const MAX_BULK_RESULTS = 200;

export class BulkUpsertResultsValidationDto {
  @IsArray()
  @ArrayMaxSize(MAX_BULK_RESULTS)
  @ArrayUnique((r: UpsertStudentResultValidationDto) => r?.studentId, {
    message: 'Jeder Schüler darf nur einmal vorkommen',
  })
  @ValidateNested({ each: true })
  @Type(() => UpsertStudentResultValidationDto)
  results!: UpsertStudentResultValidationDto[];
}

export class AssignStudentsValidationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[];
}

/** Query-Parameter der Tabellenansicht (GET /assessments/table) */
export class AssessmentTableQueryValidationDto {
  @IsUUID()
  classId!: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  schoolYear?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'semester muss 1 oder 2 sein' })
  @IsIn([1, 2], { message: 'semester muss 1 oder 2 sein' })
  semester?: 1 | 2;
}
