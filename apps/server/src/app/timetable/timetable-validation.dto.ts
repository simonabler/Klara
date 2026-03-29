import {
  IsEnum, IsInt, IsOptional, IsString, IsUUID,
  IsDateString, Max, MaxLength, Min, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RepeatType, WeekVariant } from '@app/domain';

export class CreateTimetableEntryValidationDto {
  @IsUUID()
  subjectId!: string;

  @IsUUID()
  classId!: string;

  /** 1 = Montag … 5 = Freitag */
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  dayOfWeek!: number;

  /** Unterrichtsstunden-Nummer 1–10 */
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  period!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @IsEnum(RepeatType)
  repeatType!: RepeatType;

  /** Nur bei BIWEEKLY Pflicht */
  @ValidateIf(o => o.repeatType === RepeatType.BIWEEKLY)
  @IsEnum(WeekVariant)
  weekVariant?: WeekVariant;

  /** Nur bei SEMESTER Pflicht */
  @ValidateIf(o => o.repeatType === RepeatType.SEMESTER)
  @IsInt()
  @Min(1)
  @Max(2)
  @Type(() => Number)
  semester?: number;

  /** Nur bei ONCE Pflicht */
  @ValidateIf(o => o.repeatType === RepeatType.ONCE)
  @IsDateString()
  onceDate?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsString()
  @MaxLength(10)
  schoolYear!: string;
}

export class UpdateTimetableEntryValidationDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  period?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @IsOptional()
  @IsEnum(RepeatType)
  repeatType?: RepeatType;

  @IsOptional()
  @IsEnum(WeekVariant)
  weekVariant?: WeekVariant;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  @Type(() => Number)
  semester?: number;

  @IsOptional()
  @IsDateString()
  onceDate?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  schoolYear?: string;
}
