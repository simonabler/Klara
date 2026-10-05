import { Between } from 'typeorm';
import { AssessmentSchema } from '@app/domain';
import { AssessmentService } from './assessment.service';

/**
 * getTable: Gewichtung, Skalen und Semester-Filter.
 * Repositories sind gemockt; manager.getRepository liefert Klasse, Notizen und Typen.
 */
function setup(opts: {
  events: any[];
  results: any[];
  types?: any[];
  schoolYear?: string | null;
}) {
  const students = [
    { id: 's1', firstName: 'Anna', lastName: 'Muster' },
    { id: 's2', firstName: 'Ben', lastName: 'Huber' },
  ];
  const classRepo = { findOne: jest.fn().mockResolvedValue({ id: 'c1', schoolYear: opts.schoolYear ?? '2026/27', students }) };
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  const noteRepo = { createQueryBuilder: jest.fn(() => qb) };
  const typeRepo = { find: jest.fn().mockResolvedValue(opts.types ?? []) };
  const repos: Record<string, any> = { Class: classRepo, Note: noteRepo, AssessmentType: typeRepo };

  const eventRepo = { find: jest.fn().mockResolvedValue(opts.events) };
  const resultRepo = { find: jest.fn().mockResolvedValue(opts.results) };
  const studentRepo = { manager: { getRepository: (name: string) => repos[name] } };

  const service = new AssessmentService(eventRepo as any, resultRepo as any, studentRepo as any);
  return { service, eventRepo, classRepo, qb };
}

const examType   = { id: 'type-exam', schema: AssessmentSchema.GRADES_1_5, weight: 2, color: '#123456', defaultForEventType: 'EXAM' };
const testType   = { id: 'type-test', schema: AssessmentSchema.GRADES_1_5, weight: null, color: null, defaultForEventType: null };
const pointsType = { id: 'type-points', schema: AssessmentSchema.POINTS, weight: 3, color: null, defaultForEventType: null };
const oralType   = { id: 'type-oral', schema: AssessmentSchema.PLUS_TILDE_MINUS, weight: null, color: null, defaultForEventType: 'ORAL_CHECK' };

describe('AssessmentService.getTable', () => {
  const events = [
    { id: 'e1', title: 'Schularbeit', type: 'EXAM', date: '2026-10-12' },
    { id: 'e2', title: 'Test', type: 'type-test', date: '2026-11-03' },
    { id: 'e3', title: 'Punktetest', type: 'type-points', date: '2026-11-20' },
    { id: 'e4', title: 'Mündlich', type: 'type-oral', date: '2026-12-01' },
  ];
  const results = [
    { id: 'r1', assessmentEventId: 'e1', studentId: 's1', grade: 2 },
    { id: 'r2', assessmentEventId: 'e2', studentId: 's1', grade: 4 },
    { id: 'r3', assessmentEventId: 'e3', studentId: 's1', points: 45 },
    { id: 'r4', assessmentEventId: 'e4', studentId: 's1', ptmValue: '+' },
    { id: 'r5', assessmentEventId: 'e1', studentId: 's2', grade: 1 },
  ];
  const types = [examType, testType, pointsType, oralType];

  it('gewichtet nach Leistungstyp und ignoriert Punkte und +/~/−', async () => {
    const { service } = setup({ events, results, types });
    const table = await service.getTable('t1', 'c1', 'sub1', undefined, true);

    const anna = table.rows.find(r => r.studentId === 's1')!;
    // (2×2 + 4×1) / 3 = 2,67 → 2,7 — vorher ungewichtet inkl. 45 Punkte: 17
    expect(anna.gradeAverage).toBe(2.7);
    expect(table.rows.find(r => r.studentId === 's2')!.gradeAverage).toBe(1);
    expect(table.classAverage).toBe(1.9); // (2,7 + 1) / 2 = 1,85 → 1,9
  });

  it('liefert Schema, Gewicht und Farbe je Spalte', async () => {
    const { service } = setup({ events, results, types });
    const { columns } = await service.getTable('t1', 'c1', 'sub1', undefined, true);

    expect(columns.map(c => c.schema)).toEqual(['GRADES_1_5', 'GRADES_1_5', 'POINTS', 'PLUS_TILDE_MINUS']);
    // Gewicht nur dort, wo die Spalte in den Ø einfließt
    expect(columns.map(c => c.weight)).toEqual([2, 1, undefined, undefined]);
    expect(columns[0].color).toBe('#123456');
  });

  it('mischt keine Notenskalen', async () => {
    const tenType = { id: 'type-ten', schema: AssessmentSchema.GRADES_1_10, weight: null, color: null, defaultForEventType: null };
    const { service } = setup({
      events: [...events, { id: 'e5', title: '1–10', type: 'type-ten', date: '2026-12-10' }],
      results: [...results, { id: 'r6', assessmentEventId: 'e5', studentId: 's1', grade: 9 }],
      types: [...types, tenType],
    });
    const table = await service.getTable('t1', 'c1', 'sub1', undefined, true);
    expect(table.rows.find(r => r.studentId === 's1')!.gradeAverage).toBe(2.7);
  });

  it('berechnet ohne aktivierte Notenberechnung keinen Ø', async () => {
    const { service } = setup({ events, results, types });
    const table = await service.getTable('t1', 'c1', 'sub1', undefined, false);
    expect(table.rows.every(r => r.gradeAverage === undefined)).toBe(true);
    expect(table.classAverage).toBeUndefined();
    expect(table.columns.every(c => c.weight === undefined)).toBe(true);
  });

  it('lädt die Klasse nur für die eigene Lehrkraft', async () => {
    const { service, classRepo } = setup({ events, results, types });
    await service.getTable('t1', 'c1', 'sub1');
    expect(classRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c1', teacherId: 't1' } }));
  });

  describe('Semester-Filter', () => {
    it('lädt ohne Semester alle Events (wie bisher)', async () => {
      const { service, eventRepo, qb } = setup({ events, results, types });
      await service.getTable('t1', 'c1', 'sub1', '2026/27', true);
      expect(eventRepo.find.mock.calls[0][0].where.date).toBeUndefined();
      expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('createdAt'), expect.anything());
    });

    it('grenzt Events und Notizen auf das 1. Semester ein', async () => {
      const { service, eventRepo, qb } = setup({ events, results, types });
      await service.getTable('t1', 'c1', 'sub1', '2026/27', true, 1);

      expect(eventRepo.find.mock.calls[0][0].where.date).toEqual(Between('2026-09-01', '2027-01-31'));
      expect(qb.andWhere).toHaveBeenCalledWith(
        'n.createdAt >= :from AND n.createdAt < :until',
        { from: new Date(2026, 8, 1), until: new Date(2027, 1, 1) },
      );
    });

    it('nimmt das Schuljahr der Klasse, wenn keines übergeben wird', async () => {
      const { service, eventRepo } = setup({ events, results, types, schoolYear: '2025/26' });
      await service.getTable('t1', 'c1', 'sub1', undefined, true, 2);
      expect(eventRepo.find.mock.calls[0][0].where.date).toEqual(Between('2026-02-01', '2026-08-31'));
    });
  });
});
