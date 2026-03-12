import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateNoteValidationDto as CreateNoteDto, UpdateNoteValidationDto as UpdateNoteDto, NoteFilterValidationDto as NoteFilterDto } from './note-validation.dto';
import { NoteType } from '@app/domain';

// ──────────────────────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────────────────────

async function validationErrors(
  DtoClass: new () => object,
  plain: object,
): Promise<string[]> {
  const instance = plainToInstance(DtoClass, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ──────────────────────────────────────────────────────────────────────────────
// CreateNoteDto
// ──────────────────────────────────────────────────────────────────────────────

describe('CreateNoteDto – validation', () => {
  const validBase = {
    content:   'Sehr aktive Mitarbeit heute',
    type:      NoteType.PARTICIPATION,
    studentId: VALID_UUID,
  };

  it('should pass with minimal valid input', async () => {
    const errors = await validationErrors(CreateNoteDto, validBase);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const errors = await validationErrors(CreateNoteDto, {
      ...validBase,
      subjectId:     VALID_UUID,
      classId: VALID_UUID,
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail if content is empty string', async () => {
    const errors = await validationErrors(CreateNoteDto, { ...validBase, content: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if content is missing', async () => {
    const { content: _, ...withoutContent } = validBase;
    const errors = await validationErrors(CreateNoteDto, withoutContent);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid NoteType', async () => {
    const errors = await validationErrors(CreateNoteDto, {
      ...validBase,
      type: 'INVALID_TYPE',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if studentId is not a UUID', async () => {
    const errors = await validationErrors(CreateNoteDto, {
      ...validBase,
      studentId: 'not-a-uuid',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if studentId is missing', async () => {
    const { studentId: _, ...withoutStudent } = validBase;
    const errors = await validationErrors(CreateNoteDto, withoutStudent);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if optional subjectId is present but not a UUID', async () => {
    const errors = await validationErrors(CreateNoteDto, {
      ...validBase,
      subjectId: 'invalid',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if optional classId is present but not a UUID', async () => {
    const errors = await validationErrors(CreateNoteDto, {
      ...validBase,
      classId: '12345',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept all three NoteType values', async () => {
    for (const type of Object.values(NoteType)) {
      const errors = await validationErrors(CreateNoteDto, { ...validBase, type });
      expect(errors).toHaveLength(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// UpdateNoteDto
// ──────────────────────────────────────────────────────────────────────────────

describe('UpdateNoteDto – validation', () => {
  it('should pass with an empty object (all optional)', async () => {
    const errors = await validationErrors(UpdateNoteDto, {});
    expect(errors).toHaveLength(0);
  });

  it('should pass with only content provided', async () => {
    const errors = await validationErrors(UpdateNoteDto, { content: 'Updated text' });
    expect(errors).toHaveLength(0);
  });

  it('should pass with only type provided', async () => {
    const errors = await validationErrors(UpdateNoteDto, { type: NoteType.BEHAVIOUR });
    expect(errors).toHaveLength(0);
  });

  it('should fail if content is empty string', async () => {
    const errors = await validationErrors(UpdateNoteDto, { content: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if type is an invalid value', async () => {
    const errors = await validationErrors(UpdateNoteDto, { type: 'WRONG' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if subjectId is provided but not a UUID', async () => {
    const errors = await validationErrors(UpdateNoteDto, { subjectId: 'bad-id' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with a valid UUID for subjectId', async () => {
    const errors = await validationErrors(UpdateNoteDto, { subjectId: VALID_UUID });
    expect(errors).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// NoteFilterDto
// ──────────────────────────────────────────────────────────────────────────────

describe('NoteFilterDto – validation', () => {
  it('should pass with empty filter', async () => {
    const errors = await validationErrors(NoteFilterDto, {});
    expect(errors).toHaveLength(0);
  });

  it('should pass with all filters set', async () => {
    const errors = await validationErrors(NoteFilterDto, {
      studentId: VALID_UUID,
      subjectId: VALID_UUID,
      type:      NoteType.GENERAL,
      from:      '2026-03-01',
      to:        '2026-03-31',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail if studentId is not a UUID', async () => {
    const errors = await validationErrors(NoteFilterDto, { studentId: 'not-uuid' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if type is not a valid NoteType', async () => {
    const errors = await validationErrors(NoteFilterDto, { type: 'BAD' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept from and to as plain strings', async () => {
    const errors = await validationErrors(NoteFilterDto, {
      from: '2026-01-01',
      to:   '2026-12-31',
    });
    expect(errors).toHaveLength(0);
  });

  it('should accept only from without to', async () => {
    const errors = await validationErrors(NoteFilterDto, { from: '2026-01-01' });
    expect(errors).toHaveLength(0);
  });

  it('should accept only to without from', async () => {
    const errors = await validationErrors(NoteFilterDto, { to: '2026-12-31' });
    expect(errors).toHaveLength(0);
  });
});
