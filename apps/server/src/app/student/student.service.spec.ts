import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudentService, parseDateOfBirth, buildImportErrorReason } from './student.service';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';
import { Class } from '../class/class.entity';

const TEACHER_ID = 'teacher-uuid';

const mockStudent: Student = {
  id:          'student-uuid',
  firstName:   'Anna',
  lastName:    'Muster',
  dateOfBirth: new Date('2014-03-12'),
  email:       null,
  phone:       null,
  gender:      null,
  avatarUrl:   null,
  teacherId:   TEACHER_ID,
  teacher:     null,
  parents:     [],
  classes:     [],
  notes:       [],
  results:     [],
  createdAt:   new Date(),
  updatedAt:   new Date(),
} as any;

function makeStudentRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), ...overrides };
}
function makeParentRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return { create: jest.fn(), save: jest.fn(), find: jest.fn().mockResolvedValue([]), delete: jest.fn(), ...overrides };
}
function makeClassRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return { create: jest.fn(), save: jest.fn(), findOne: jest.fn().mockResolvedValue(null), query: jest.fn().mockResolvedValue(undefined), ...overrides };
}

describe('parseDateOfBirth', () => {
  it('parst DD.MM.YYYY', () => {
    const d = parseDateOfBirth('10.02.2005');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2005);
    expect(d!.getMonth()).toBe(1);
    expect(d!.getDate()).toBe(10);
  });

  it('parst DD.MM.YY < 30 als 20xx', () => {
    expect(parseDateOfBirth('05.01.03')!.getFullYear()).toBe(2003);
  });

  it('parst DD.MM.YY >= 30 als 19xx', () => {
    expect(parseDateOfBirth('01.09.95')!.getFullYear()).toBe(1995);
  });

  it('parst ISO YYYY-MM-DD', () => {
    const d = parseDateOfBirth('2005-02-10');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2005);
  });

  it('gibt undefined für leeren String zurück', () => {
    expect(parseDateOfBirth('')).toBeUndefined();
  });

  it('gibt undefined für undefined zurück', () => {
    expect(parseDateOfBirth(undefined)).toBeUndefined();
  });

  it('gibt undefined für ungültiges Format zurück', () => {
    expect(parseDateOfBirth('kein-datum')).toBeUndefined();
  });

  it('gibt undefined für komplett ungültigen String zurück', () => {
    expect(parseDateOfBirth('abc.def.ghij')).toBeUndefined();
  });
});

describe('buildImportErrorReason', () => {
  const row = { firstName: 'Felix', lastName: 'Nagiller' };

  it('23505 → Doppelter Eintrag mit Name', () => {
    const msg = buildImportErrorReason({ code: '23505' }, row);
    expect(msg).toContain('Felix Nagiller');
    expect(msg).toContain('existiert bereits');
  });

  it('23503 → Fremdschlüssel-Fehler', () => {
    expect(buildImportErrorReason({ code: '23503' }, row)).toContain('Fremdschlüssel');
  });

  it('23502 → Pflichtfeld fehlt', () => {
    expect(buildImportErrorReason({ code: '23502' }, row)).toContain('Pflichtfeld');
  });

  it('22007 mit "timestamp" in message → Geburtsdatum', () => {
    const msg = buildImportErrorReason({ code: '22007', message: 'invalid timestamp' }, row);
    expect(msg).toContain('Geburtsdatum');
    expect(msg).toContain('TT.MM.JJJJ');
  });

  it('22007 ohne "timestamp" → Datum', () => {
    expect(buildImportErrorReason({ code: '22007', message: 'invalid date' }, row)).toContain('Datum');
  });

  it('22001 → Wert zu lang', () => {
    expect(buildImportErrorReason({ code: '22001' }, row)).toContain('zu lang');
  });

  it('JS Invalid Date message → lesbarer Hinweis', () => {
    expect(buildImportErrorReason({ message: 'Invalid Date' }, row)).toContain('Geburtsdatum');
  });

  it('NaN in message → lesbarer Hinweis', () => {
    expect(buildImportErrorReason({ message: '0NaN-NaN-NaN' }, row)).toContain('Geburtsdatum');
  });

  it('unbekannter Code → enthält Code', () => {
    expect(buildImportErrorReason({ code: '99999' }, row)).toContain('99999');
  });

  it('kein Code, keine bekannte message → Unbekannter Fehler', () => {
    expect(buildImportErrorReason({ message: 'something weird' }, row)).toBe('Unbekannter Fehler beim Speichern');
  });
});

describe('StudentService', () => {
  let service: StudentService;
  let studentRepo: ReturnType<typeof makeStudentRepo>;
  let parentRepo:  ReturnType<typeof makeParentRepo>;
  let classRepo:   ReturnType<typeof makeClassRepo>;

  async function buildModule(sRepo = makeStudentRepo(), pRepo = makeParentRepo(), cRepo = makeClassRepo()) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getRepositoryToken(Student), useValue: sRepo },
        { provide: getRepositoryToken(Parent),  useValue: pRepo },
        { provide: getRepositoryToken(Class),   useValue: cRepo },
      ],
    }).compile();
    service     = module.get<StudentService>(StudentService);
    studentRepo = sRepo;
    parentRepo  = pRepo;
    classRepo   = cRepo;
  }

  beforeEach(() => buildModule());

  describe('findAll', () => {
    it('gibt Schüler der Lehrkraft zurück', async () => {
      studentRepo.find.mockResolvedValue([mockStudent]);
      const result = await service.findAll(TEACHER_ID);
      expect(result).toHaveLength(1);
      expect(studentRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { teacherId: TEACHER_ID } }));
    });
  });

  describe('findOne', () => {
    it('gibt Schüler zurück wenn gefunden', async () => {
      studentRepo.findOne.mockResolvedValue(mockStudent);
      const result = await service.findOne('student-uuid', TEACHER_ID);
      expect(result.firstName).toBe('Anna');
    });

    it('wirft NotFoundException wenn nicht gefunden', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('not-existing', TEACHER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('legt Schüler an und gibt ihn zurück', async () => {
      studentRepo.create.mockReturnValue(mockStudent);
      studentRepo.save.mockResolvedValue(mockStudent);
      studentRepo.findOne.mockResolvedValue(mockStudent);
      const result = await service.create({ firstName: 'Anna', lastName: 'Muster' }, TEACHER_ID);
      expect(result.firstName).toBe('Anna');
      expect(studentRepo.save).toHaveBeenCalled();
    });

    it('speichert Erziehungsberechtigte wenn übergeben', async () => {
      studentRepo.create.mockReturnValue(mockStudent);
      studentRepo.save.mockResolvedValue(mockStudent);
      studentRepo.findOne.mockResolvedValue({ ...mockStudent, parents: [{ firstName: 'Maria' }] });
      parentRepo.create.mockReturnValue({});
      parentRepo.save.mockResolvedValue([]);
      await service.create({ firstName: 'Anna', lastName: 'Muster', parents: [{ firstName: 'Maria', lastName: 'Muster' }] }, TEACHER_ID);
      expect(parentRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('löscht Schüler', async () => {
      studentRepo.findOne.mockResolvedValue(mockStudent);
      studentRepo.remove.mockResolvedValue(undefined);
      await service.remove('student-uuid', TEACHER_ID);
      expect(studentRepo.remove).toHaveBeenCalledWith(mockStudent);
    });

    it('wirft NotFoundException wenn Schüler nicht gefunden', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('not-existing', TEACHER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkImport', () => {
    function savedStudent(id: string, first: string, last: string): Student {
      return { ...mockStudent, id, firstName: first, lastName: last } as any;
    }

    it('importiert einen einfachen Schüler', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));

      const result = await service.bulkImport([{ firstName: 'Felix', lastName: 'Nagiller' }], TEACHER_ID);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('überspringt Zeilen ohne Vor- oder Nachname', async () => {
      const result = await service.bulkImport(
        [{ firstName: '', lastName: 'Muster' }, { firstName: 'Anna', lastName: '' }, { firstName: undefined, lastName: 'Muster' }],
        TEACHER_ID,
      );
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(3);
      result.errors.forEach(e => expect(e.reason).toContain('Pflichtfeld'));
    });

    it('parst DD.MM.YYYY Geburtsdatum korrekt', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));

      await service.bulkImport([{ firstName: 'Felix', lastName: 'Nagiller', dateOfBirth: '10.02.2005' }], TEACHER_ID);

      const arg = studentRepo.create.mock.calls[0][0];
      expect(arg.dateOfBirth).toBeInstanceOf(Date);
      expect(arg.dateOfBirth.getFullYear()).toBe(2005);
      expect(arg.dateOfBirth.getMonth()).toBe(1);
      expect(arg.dateOfBirth.getDate()).toBe(10);
    });

    it('behandelt ungültiges Datum als undefined — kein Absturz', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));

      const result = await service.bulkImport([{ firstName: 'Felix', lastName: 'Nagiller', dateOfBirth: 'kein-datum' }], TEACHER_ID);

      expect(result.imported).toBe(1);
      expect(studentRepo.create.mock.calls[0][0].dateOfBirth).toBeUndefined();
    });

    it('erkennt Duplikate (gleicher Name + Geburtsdatum) und importiert nur einmal', async () => {
      let n = 0;
      studentRepo.create.mockImplementation(() => savedStudent(`s${++n}`, 'Sebastian', 'Wörz'));
      studentRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.bulkImport(
        [
          { firstName: 'Sebastian', lastName: 'Wörz', dateOfBirth: '05.01.2003', email: 'a@test.at' },
          { firstName: 'Sebastian', lastName: 'Wörz', dateOfBirth: '05.01.2003', email: 'b@test.at' },
        ],
        TEACHER_ID,
      );

      expect(result.imported).toBe(1);
      expect(studentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('legt Elternteil an wenn Vor- und Nachname vorhanden', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Anna', 'Muster'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Anna', 'Muster'));
      parentRepo.create.mockReturnValue({});
      parentRepo.save.mockResolvedValue({});

      await service.bulkImport([{
        firstName: 'Anna', lastName: 'Muster',
        parent1FirstName: 'Maria', parent1LastName: 'Muster', parent1Email: 'maria@test.at',
      }], TEACHER_ID);

      expect(parentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Maria', lastName: 'Muster', email: 'maria@test.at' }),
      );
    });

    it('legt keinen Elternteil an wenn nur Vorname vorhanden', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Anna', 'Muster'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Anna', 'Muster'));

      await service.bulkImport([{ firstName: 'Anna', lastName: 'Muster', parent1FirstName: 'Maria' }], TEACHER_ID);

      expect(parentRepo.save).not.toHaveBeenCalled();
    });

    it('legt neue Klasse an wenn nicht vorhanden', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));
      classRepo.findOne.mockResolvedValue(null);
      classRepo.create.mockReturnValue({ id: 'cls-1', name: '4A', students: [] });
      classRepo.save.mockResolvedValue({ id: 'cls-1', name: '4A' });

      const result = await service.bulkImport(
        [{ firstName: 'Felix', lastName: 'Nagiller', className: '4A', schoolYear: '2025/26' }],
        TEACHER_ID,
      );

      expect(result.classesCreated).toBe(1);
      expect(classRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: '4A', schoolYear: '2025/26' }),
      );
    });

    it('verwendet bestehende Klasse und erhöht classesCreated nicht', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));
      classRepo.findOne.mockResolvedValue({ id: 'cls-existing', name: '4A' });

      const result = await service.bulkImport(
        [{ firstName: 'Felix', lastName: 'Nagiller', className: '4A', schoolYear: '2025/26' }],
        TEACHER_ID,
      );

      expect(result.classesCreated).toBe(0);
      expect(classRepo.save).not.toHaveBeenCalled();
    });

    it('cached Klassen-Lookups — DB nur einmal abgefragt für gleiche Klasse', async () => {
      let n = 0;
      studentRepo.create.mockImplementation(() => savedStudent(`s${++n}`, 'X', 'Y'));
      studentRepo.save.mockImplementation((s: any) => Promise.resolve(s));
      classRepo.findOne.mockResolvedValue(null);
      classRepo.create.mockReturnValue({ id: 'cls-1', name: '4A', students: [] });
      classRepo.save.mockResolvedValue({ id: 'cls-1', name: '4A' });

      await service.bulkImport(
        [
          { firstName: 'Felix',  lastName: 'Nagiller', className: '4A', schoolYear: '2025/26' },
          { firstName: 'Stefan', lastName: 'Bauer',    className: '4A', schoolYear: '2025/26' },
          { firstName: 'Lukas',  lastName: 'Huber',    className: '4A', schoolYear: '2025/26' },
        ],
        TEACHER_ID,
      );

      expect(classRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('weist Schüler via direktem query in class_students zu (kein Cascade)', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));
      classRepo.findOne.mockResolvedValue(null);
      classRepo.create.mockReturnValue({ id: 'cls-1', students: [] });
      classRepo.save.mockResolvedValue({ id: 'cls-1' });

      await service.bulkImport(
        [{ firstName: 'Felix', lastName: 'Nagiller', className: '4A', schoolYear: '2025/26' }],
        TEACHER_ID,
      );

      expect(classRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO class_students'),
        ['cls-1', 's1'],
      );
    });

    it('gibt lesbare Fehlermeldung bei PK-Konflikt (23505)', async () => {
      studentRepo.create.mockReturnValue({});
      studentRepo.save.mockRejectedValue({ code: '23505', message: '' });

      const result = await service.bulkImport([{ firstName: 'Felix', lastName: 'Nagiller' }], TEACHER_ID);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].reason).toContain('existiert bereits');
    });

    it('fährt nach Fehler einer Zeile mit den nächsten fort', async () => {
      let n = 0;
      studentRepo.create.mockImplementation(() => savedStudent(`s${++n}`, 'X', 'Y'));
      studentRepo.save
        .mockRejectedValueOnce({ code: '23505', message: '' })
        .mockResolvedValue(savedStudent('s2', 'Stefan', 'Bauer'));

      const result = await service.bulkImport(
        [
          { firstName: 'Felix',  lastName: 'Nagiller' },
          { firstName: 'Stefan', lastName: 'Bauer' },
        ],
        TEACHER_ID,
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('gibt classesCreated: 0 zurück wenn keine className angegeben', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));

      const result = await service.bulkImport([{ firstName: 'Felix', lastName: 'Nagiller' }], TEACHER_ID);

      expect(result.classesCreated).toBe(0);
      expect(classRepo.findOne).not.toHaveBeenCalled();
    });

    it('ignoriert leere className', async () => {
      studentRepo.create.mockReturnValue(savedStudent('s1', 'Felix', 'Nagiller'));
      studentRepo.save.mockResolvedValue(savedStudent('s1', 'Felix', 'Nagiller'));

      const result = await service.bulkImport(
        [{ firstName: 'Felix', lastName: 'Nagiller', className: '  ' }],
        TEACHER_ID,
      );

      expect(result.classesCreated).toBe(0);
      expect(classRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
