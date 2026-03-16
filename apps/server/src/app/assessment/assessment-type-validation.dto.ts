import {
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AssessmentSchema } from '@app/domain';

export class CreateAssessmentTypeValidationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(AssessmentSchema)
  schema!: AssessmentSchema;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxPoints?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateAssessmentTypeValidationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(AssessmentSchema)
  schema?: AssessmentSchema;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxPoints?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
