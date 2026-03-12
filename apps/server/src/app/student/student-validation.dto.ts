import {
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParentValidationDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateStudentValidationDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentValidationDto)
  parents?: CreateParentValidationDto[];
}

export class UpdateStudentValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentValidationDto)
  parents?: CreateParentValidationDto[];
}

// ── Bulk Import ──────────────────────────────────────────────────────────────

export class ImportStudentRowValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  parent1FirstName?: string;

  @IsOptional()
  @IsString()
  parent1LastName?: string;

  @IsOptional()
  @IsString()
  parent1Email?: string;

  @IsOptional()
  @IsString()
  parent1Phone?: string;
}

export class BulkImportStudentsValidationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStudentRowValidationDto)
  rows!: ImportStudentRowValidationDto[];
}
