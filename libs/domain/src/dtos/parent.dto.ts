import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ParentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email?: string;
  phone?: string;
}

export class CreateParentDto {
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
