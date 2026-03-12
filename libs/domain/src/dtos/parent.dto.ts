export class ParentDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email?: string;
  phone?: string;
}

export class CreateParentDto {
  firstName!: string;
  lastName!: string;
  email?: string;
  phone?: string;
}
