import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';

const SCHOOL_YEAR = /^\d{4}\/\d{2}$/;
const SCHOOL_YEAR_MESSAGE = 'Schuljahr im Format 2026/27 angeben';

export class RolloverClassValidationDto {
  @IsUUID()
  sourceClassId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  schoolLevel?: number;
}

export class RolloverRequestValidationDto {
  @Matches(SCHOOL_YEAR, { message: SCHOOL_YEAR_MESSAGE })
  fromSchoolYear!: string;

  @Matches(SCHOOL_YEAR, { message: SCHOOL_YEAR_MESSAGE })
  toSchoolYear!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RolloverClassValidationDto)
  classes!: RolloverClassValidationDto[];
}

export class RetentionSettingsValidationDto {
  /** null = keine Frist; sonst 1–10 Jahre nach Schuljahresende */
  @ValidateIf((o) => o.retentionYears !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  retentionYears!: number | null;
}

export class PurgeRequestValidationDto {
  @Matches(SCHOOL_YEAR, { message: SCHOOL_YEAR_MESSAGE })
  schoolYear!: string;
}
