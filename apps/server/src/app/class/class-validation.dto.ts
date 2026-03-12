import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSchoolLevelValidationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  year?: string;
}

export class UpdateSchoolLevelValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  year?: string;
}

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
  @IsUUID()
  schoolLevelId?: string;

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
  @IsUUID()
  schoolLevelId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
