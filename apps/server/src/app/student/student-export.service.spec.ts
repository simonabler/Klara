import { NotFoundException } from '@nestjs/common';
import { StudentExportService } from './student-export.service';

function setup(student: any = {
  id: 's1', firstName: 'Anna', lastName: 'Muster', dateOfBirth: '2012-03-04', gender: 'w',
  email: null, phone: '+43 1', avatarUrl: '/api/uploads/avatars/a.png',
  createdAt: new Date('2025-09-10T08:00:00Z'), updatedAt: new Date('2026-01-02T08:00:00Z'),
  parents: [{ firstName: 'Max', lastName: 'Muster', email: 'max@example.at', phone: null }],
  classes: [{ name: '4A', schoolYear: '2026/27', schoolLevel: 4 }, { name: '3A', schoolYear: '2025/26', schoolLevel: 3 }],
}) {
  const studentRepo = { findOne: jest.fn().mockResolvedValue(student) };
  const teacherRepo = { findOne: jest.fn().mockResolvedValue({ displayName: 'Frau Lehrerin', email: 'l@schule.at', retentionYears: 2 }) };
  const noteRepo = { find: jest.fn().mockResolvedValue([
    { createdAt: new Date('2026-10-01T09:00:00Z'), type: 'PARTICIPATION', content: 'Gut mitgearbeitet', subject: { name: 'Deutsch' }, class: { name: '4A' } },
  ]) };
  const resultRepo = { find: jest.fn().mockResolvedValue([
    { grade: null, points: null, ptmValue: '+', comment: null, createdAt: new Date('2026-10-03T10:00:00Z'),
      assessmentEvent: { date: '2026-10-03', title: 'Wiederholung', type: 'ORAL_CHECK', subject: { name: 'Deutsch' }, class: { name: '4A' } } },
    { grade: 2, points: null, ptmValue: null, comment: 'sauber', createdAt: new Date('2026-09-20T10:00:00Z'),
      assessmentEvent: { date: '2026-09-20', title: 'SA 1', type: 'type-sa', subject: { name: 'Deutsch' }, class: null } },
  ]) };
  const typeRepo = { find: jest.fn().mockResolvedValue([{ id: 'type-sa', name: 'Schularbeit', defaultForEventType: 'EXAM' }]) };
  const service = new StudentExportService(studentRepo as any, teacherRepo as any, noteRepo as any, resultRepo as any, typeRepo as any);
  return { service, studentRepo, noteRepo, resultRepo };
}

describe('StudentExportService', () => {
  it('liefert 404 für fremde oder unbekannte Schüler/innen', async () => {
    const { service } = setup(null);
    await expect(service.exportStudent('fremd', 't1')).rejects.toThrow(NotFoundException);
  });

  it('fragt alles nur für die eigene Lehrkraft ab', async () => {
    const { service, studentRepo, noteRepo, resultRepo } = setup();
    await service.exportStudent('s1', 't1');
    expect(studentRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 's1', teacherId: 't1' } }));
    expect(noteRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 's1', teacherId: 't1' } }));
    expect(resultRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 's1', assessmentEvent: { teacherId: 't1' } } }));
  });

  it('enthält Stammdaten, Verantwortliche, Frist, Eltern und Klassen', async () => {
    const { service } = setup();
    const d = await service.exportStudent('s1', 't1');
    expect(d.responsible).toEqual({ displayName: 'Frau Lehrerin', email: 'l@schule.at' });
    expect(d.retentionYears).toBe(2);
    expect(d.student).toMatchObject({
      firstName: 'Anna', lastName: 'Muster', dateOfBirth: '2012-03-04', gender: 'w',
      email: null, phone: '+43 1', hasProfilePhoto: true,
    });
    expect(d.parents).toEqual([{ firstName: 'Max', lastName: 'Muster', email: 'max@example.at', phone: null }]);
    expect(d.classes.map(c => c.name)).toEqual(['3A', '4A']); // nach Schuljahr sortiert
  });

  it('listet Leistungen chronologisch mit lesbarem Leistungstyp', async () => {
    const { service } = setup();
    const { results } = await service.exportStudent('s1', 't1');
    expect(results.map(r => [r.date, r.assessmentType, r.grade, r.value])).toEqual([
      ['2026-09-20', 'Schularbeit', 2, null],
      ['2026-10-03', 'Mündliche Überprüfung', null, '+'], // Enum-Wert über Standard-Typ aufgelöst
    ]);
    expect(results[0]).toMatchObject({ subject: 'Deutsch', class: null, comment: 'sauber' });
  });

  it('enthält die Notizen mit Fach und Klasse', async () => {
    const { service } = setup();
    const { notes } = await service.exportStudent('s1', 't1');
    expect(notes).toEqual([{
      createdAt: '2026-10-01T09:00:00.000Z', type: 'PARTICIPATION', content: 'Gut mitgearbeitet', subject: 'Deutsch', class: '4A',
    }]);
  });
});
