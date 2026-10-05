import { BadRequestException } from '@nestjs/common';
import { SchoolYearService } from './school-year.service';

function setup(retentionYears: number | null = 1) {
  const teacherRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 't1', retentionYears }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const classRepo = { find: jest.fn().mockResolvedValue([]) };
  const noteRepo = { count: jest.fn().mockResolvedValue(0) };
  const eventRepo = { count: jest.fn().mockResolvedValue(0) };
  const dataSource = { transaction: jest.fn() };
  const service = new SchoolYearService(
    dataSource as any, teacherRepo as any, classRepo as any, noteRepo as any, eventRepo as any,
  );
  return { service, teacherRepo, classRepo, noteRepo, eventRepo, dataSource };
}

const today = new Date(2026, 9, 5); // 05.10.2026

describe('SchoolYearService', () => {
  describe('rollover – Eingaben', () => {
    const base = {
      fromSchoolYear: '2025/26',
      toSchoolYear: '2026/27',
      classes: [{ sourceClassId: 'a', name: '4A' }],
    };

    it('lehnt ein ungültiges Schuljahr ab', async () => {
      const { service, dataSource } = setup();
      await expect(service.rollover('t1', { ...base, toSchoolYear: '2026/28' })).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lehnt ein Zielschuljahr vor dem Ausgangsjahr ab', async () => {
      const { service } = setup();
      await expect(service.rollover('t1', { ...base, toSchoolYear: '2024/25' })).rejects.toThrow('nach dem bisherigen');
    });

    it('lehnt doppelte Namen ab (ohne Groß-/Kleinschreibung)', async () => {
      const { service } = setup();
      await expect(service.rollover('t1', {
        ...base,
        classes: [{ sourceClassId: 'a', name: '4A' }, { sourceClassId: 'b', name: ' 4a ' }],
      })).rejects.toThrow('eindeutig');
    });

    it('lehnt eine mehrfach gewählte Klasse ab', async () => {
      const { service } = setup();
      await expect(service.rollover('t1', {
        ...base,
        classes: [{ sourceClassId: 'a', name: '4A' }, { sourceClassId: 'a', name: '4B' }],
      })).rejects.toThrow('mehrfach');
    });
  });

  describe('getRetention', () => {
    it('meldet ohne eingestellte Frist nichts als fällig', async () => {
      const { service, classRepo } = setup(null);
      expect(await service.getRetention('t1', today)).toEqual({ retentionYears: null, due: [] });
      expect(classRepo.find).not.toHaveBeenCalled();
    });

    it('listet nur Schuljahre mit abgelaufener Frist, mit Kennzahlen', async () => {
      const { service, classRepo, noteRepo, eventRepo } = setup(1);
      classRepo.find.mockResolvedValue([
        { id: 'c1', name: '3B', schoolYear: '2024/25', students: [{ id: 's1' }, { id: 's2' }] },
        { id: 'c2', name: '3A', schoolYear: '2024/25', students: [{ id: 's3' }] },
        { id: 'c3', name: '4A', schoolYear: '2025/26', students: [{ id: 's3' }] },
        { id: 'c4', name: 'Kurs', schoolYear: null, students: [] },
      ]);
      noteRepo.count.mockResolvedValue(7);
      eventRepo.count.mockResolvedValue(3);

      const { due } = await service.getRetention('t1', today);

      expect(due).toEqual([{
        schoolYear: '2024/25',
        deletableFrom: '2026-09-01',
        classes: [{ id: 'c2', name: '3A', studentCount: 1 }, { id: 'c1', name: '3B', studentCount: 2 }],
        noteCount: 7,
        assessmentCount: 3,
        studentsToDelete: 2,
        studentsKept: 1,
      }]);
    });
  });

  describe('purge – Schutz', () => {
    it('löscht nichts ohne eingestellte Frist', async () => {
      const { service, dataSource } = setup(null);
      await expect(service.purge('t1', '2024/25', today)).rejects.toThrow('keine Aufbewahrungsfrist');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('löscht nichts vor Ablauf der Frist', async () => {
      const { service, dataSource } = setup(2);
      await expect(service.purge('t1', '2024/25', today)).rejects.toThrow('läuft erst am 01.09.2027 ab');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  it('speichert die Frist', async () => {
    const { service, teacherRepo } = setup();
    expect(await service.setRetention('t1', 3)).toEqual({ retentionYears: 3 });
    expect(teacherRepo.update).toHaveBeenCalledWith('t1', { retentionYears: 3 });
  });
});
