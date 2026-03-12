import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateNoteDto, UpdateNoteDto, NoteFilterDto } from './note.dto';
import { NoteType } from '../enums';

// ── CreateNoteDto ──────────────────────────────────────────────────────────

describe('CreateNoteDto', () => {
  it('should pass with minimal valid data', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Zeigt aktive Mitarbeit',
      type:      NoteType.PARTICIPATION,
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields provided', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:       'Störendes Verhalten',
      type:          NoteType.BEHAVIOUR,
      studentId:     '550e8400-e29b-41d4-a716-446655440000',
      subjectId:     '660e8400-e29b-41d4-a716-446655440001',
      schoolLevelId: '770e8400-e29b-41d4-a716-446655440002',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if content is missing', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      type:      NoteType.GENERAL,
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'content')).toBe(true);
  });

  it('should fail if content is empty string', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   '',
      type:      NoteType.GENERAL,
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'content')).toBe(true);
  });

  it('should fail if type is missing', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Notiz ohne Typ',
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'type')).toBe(true);
  });

  it('should fail if type is not a valid NoteType enum value', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Notiz',
      type:      'INVALID_TYPE',
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'type')).toBe(true);
  });

  it('should accept all valid NoteType values', async () => {
    for (const type of Object.values(NoteType)) {
      const dto = plainToInstance(CreateNoteDto, {
        content:   'Test',
        type,
        studentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail if studentId is missing', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content: 'Notiz',
      type:    NoteType.GENERAL,
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'studentId')).toBe(true);
  });

  it('should fail if studentId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Notiz',
      type:      NoteType.GENERAL,
      studentId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'studentId')).toBe(true);
  });

  it('should fail if optional subjectId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Notiz',
      type:      NoteType.GENERAL,
      studentId: '550e8400-e29b-41d4-a716-446655440000',
      subjectId: 'invalid-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'subjectId')).toBe(true);
  });

  it('should pass if optional subjectId is omitted', async () => {
    const dto = plainToInstance(CreateNoteDto, {
      content:   'Allgemeine Notiz',
      type:      NoteType.GENERAL,
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

// ── UpdateNoteDto ──────────────────────────────────────────────────────────

describe('UpdateNoteDto', () => {
  it('should pass with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateNoteDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with only content provided', async () => {
    const dto = plainToInstance(UpdateNoteDto, { content: 'Geändert' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with only type provided', async () => {
    const dto = plainToInstance(UpdateNoteDto, { type: NoteType.BEHAVIOUR });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if content is empty string', async () => {
    const dto = plainToInstance(UpdateNoteDto, { content: '' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'content')).toBe(true);
  });

  it('should fail if type is invalid enum value', async () => {
    const dto = plainToInstance(UpdateNoteDto, { type: 'WRONG' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'type')).toBe(true);
  });

  it('should fail if subjectId is not a valid UUID', async () => {
    const dto = plainToInstance(UpdateNoteDto, { subjectId: 'no-uuid' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'subjectId')).toBe(true);
  });
});

// ── NoteFilterDto ──────────────────────────────────────────────────────────

describe('NoteFilterDto', () => {
  it('should pass with empty filter (no criteria)', async () => {
    const dto = plainToInstance(NoteFilterDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with valid studentId filter', async () => {
    const dto = plainToInstance(NoteFilterDto, {
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if studentId is not a UUID', async () => {
    const dto = plainToInstance(NoteFilterDto, { studentId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'studentId')).toBe(true);
  });

  it('should pass with valid type filter', async () => {
    const dto = plainToInstance(NoteFilterDto, { type: NoteType.PARTICIPATION });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if type filter value is invalid', async () => {
    const dto = plainToInstance(NoteFilterDto, { type: 'NOT_VALID' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'type')).toBe(true);
  });

  it('should pass with from/to date strings', async () => {
    const dto = plainToInstance(NoteFilterDto, {
      from: '2026-03-01',
      to:   '2026-03-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with combined valid filter criteria', async () => {
    const dto = plainToInstance(NoteFilterDto, {
      studentId: '550e8400-e29b-41d4-a716-446655440000',
      subjectId: '660e8400-e29b-41d4-a716-446655440001',
      type:      NoteType.GENERAL,
      from:      '2026-01-01',
      to:        '2026-12-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
