import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';
import { CreateParentDto } from './parent.dto';

describe('CreateStudentDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'Anna',
      lastName: 'Muster',
      dateOfBirth: '2014-03-12',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if firstName is missing', async () => {
    const dto = plainToInstance(CreateStudentDto, { lastName: 'Muster' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });

  it('should fail if lastName is missing', async () => {
    const dto = plainToInstance(CreateStudentDto, { firstName: 'Anna' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lastName')).toBe(true);
  });

  it('should fail if dateOfBirth is not a date string', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'Anna',
      lastName: 'Muster',
      dateOfBirth: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'dateOfBirth')).toBe(true);
  });

  it('should pass with valid nested parent', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'Anna',
      lastName: 'Muster',
      parents: [{ firstName: 'Maria', lastName: 'Muster', email: 'maria@example.com' }],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if parent has invalid email', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'Anna',
      lastName: 'Muster',
      parents: [{ firstName: 'Maria', lastName: 'Muster', email: 'not-an-email' }],
    });
    const errors = await validate(dto, { whitelist: true });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateStudentDto', () => {
  it('should pass with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateStudentDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with partial update', async () => {
    const dto = plainToInstance(UpdateStudentDto, { firstName: 'Neue Anna' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateParentDto', () => {
  it('should fail if firstName is missing', async () => {
    const dto = plainToInstance(CreateParentDto, { lastName: 'Muster' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });
});
