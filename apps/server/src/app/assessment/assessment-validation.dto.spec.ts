import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  BulkUpsertResultsValidationDto,
  MAX_BULK_RESULTS,
} from './assessment-validation.dto';

/** Gleiche Einstellungen wie in main.ts */
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const validate = (body: unknown) =>
  pipe.transform(body, {
    type: 'body',
    metatype: BulkUpsertResultsValidationDto,
  });

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function errorsOf(body: unknown): Promise<string[]> {
  const err = await validate(body).catch((e) => e);
  expect(err).toBeInstanceOf(BadRequestException);
  return err.getResponse().message;
}

describe('BulkUpsertResultsValidationDto (K-06)', () => {
  it('akzeptiert gültige Einträge wie vom Frontend', async () => {
    const body = {
      results: [
        { studentId: uuid(1), grade: 2, comment: 'gut' },
        { studentId: uuid(2), ptmValue: '+' },
      ],
    };
    await expect(validate(body)).resolves.toBeInstanceOf(
      BulkUpsertResultsValidationDto
    );
  });

  it('prüft jeden Eintrag einzeln (ungültige studentId)', async () => {
    const messages = await errorsOf({
      results: [{ studentId: 'kein-uuid', grade: 1 }],
    });
    expect(messages.join()).toMatch(/studentId must be a UUID/);
  });

  it('prüft die Felder der Einträge (Note < 1, Kommentar zu lang)', async () => {
    const messages = await errorsOf({
      results: [{ studentId: uuid(1), grade: 0, comment: 'x'.repeat(1001) }],
    });
    expect(messages.join()).toMatch(/grade must not be less than 1/);
    expect(messages.join()).toMatch(/comment must be shorter/);
  });

  it('lehnt unbekannte Felder in den Einträgen ab', async () => {
    const messages = await errorsOf({
      results: [{ studentId: uuid(1), teacherId: uuid(9) }],
    });
    expect(messages.join()).toMatch(/teacherId should not exist/);
  });

  it(`begrenzt auf ${MAX_BULK_RESULTS} Einträge`, async () => {
    const results = Array.from({ length: MAX_BULK_RESULTS + 1 }, (_, i) => ({
      studentId: uuid(i),
    }));
    const messages = await errorsOf({ results });
    expect(messages.join()).toMatch(
      new RegExp(`no more than ${MAX_BULK_RESULTS}`)
    );
  });

  it('lehnt doppelte Schüler ab', async () => {
    const messages = await errorsOf({
      results: [{ studentId: uuid(1) }, { studentId: uuid(1) }],
    });
    expect(messages.join()).toMatch(/nur einmal vorkommen/);
  });

  it('lehnt Einträge ab, die keine Objekte sind', async () => {
    await errorsOf({ results: ['x', 42] });
  });
});
