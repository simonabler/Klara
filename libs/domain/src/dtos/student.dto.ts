import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateParentDto, ParentDto } from './parent.dto';

export class StudentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  teacherId!: string;
  parents!: ParentDto[];
  createdAt!: string;
  updatedAt!: string;
}

export class CreateStudentDto {
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
  @Type(() => CreateParentDto)
  parents?: CreateParentDto[];
}

export class UpdateStudentDto {
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
  @Type(() => CreateParentDto)
  parents?: CreateParentDto[];
}
