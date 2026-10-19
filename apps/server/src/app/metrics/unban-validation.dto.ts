import { IsIP } from 'class-validator';

export class UnbanValidationDto {
  @IsIP()
  ip!: string;
}
