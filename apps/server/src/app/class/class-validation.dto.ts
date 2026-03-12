import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateSubjectValidationDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateSubjectValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

export class CreateClassValidationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  schoolYear?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  schoolLevel?: number;

  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}

export class UpdateClassValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  schoolYear?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  schoolLevel?: number;

  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
