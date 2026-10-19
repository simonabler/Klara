import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { AssessmentType } from './assessment-type.entity';
import { Class } from '../class/class.entity';
import { Note } from '../note/note.entity';
import { AssessmentEventType } from '@app/domain';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OwnershipValidationService } from '../common/ownership-validation.service';

const mockEventRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});
const mockResultRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});
const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});
const mockOwnership = () => ({
  assertStudents: jest.fn().mockResolvedValue(undefined),
  assertOwned: jest.fn().mockResolvedValue(undefined),
});

describe('AssessmentService', () => {
  let service: AssessmentService;
  let eventRepo: ReturnType<typeof mockEventRepo>;
  let resultRepo: ReturnType<typeof mockResultRepo>;
  let ownership: ReturnType<typeof mockOwnership>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: getRepositoryToken(AssessmentEvent), useFactory: mockEventRepo },
        { provide: getRepositoryToken(StudentResult),   useFactory: mockResultRepo },
        { provide: getRepositoryToken(Class),           useFactory: mockRepo },
        { provide: getRepositoryToken(Note),            useFactory: mockRepo },
        { provide: getRepositoryToken(AssessmentType),  useFactory: mockRepo },
        { provide: OwnershipValidationService,          useFactory: mockOwnership },
      ],
    }).compile();

    service    = module.get(AssessmentService);
    eventRepo  = module.get(getRepositoryToken(AssessmentEvent));
    resultRepo = module.get(getRepositoryToken(StudentResult));
    ownership  = module.get(OwnershipValidationService);
  });

  const teacherId = 'teacher-uuid';
  const eventId   = 'event-uuid';

  const mockEvent = {
    id: eventId,
    title: 'Test Schularbeit',
    type: AssessmentEventType.EXAM,
    date: new Date('2025-03-10'),
    teacherId,
    classId: 'class-uuid',
    subjectId: 'subject-uuid',
    results: [],
  };

  describe('findOneEvent', () => {
    it('should return event with relations', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      const result = await service.findOneEvent(eventId, teacherId);
      expect(result).toBe(mockEvent);
      expect(eventRepo.findOne).toHaveBeenCalledWith({
        where: { id: eventId, teacherId },
        relations: ['class', 'subject', 'results', 'results.student'],
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneEvent(eventId, teacherId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createEvent', () => {
    it('should create event without students', async () => {
      const dto = {
        title: 'Schularbeit 1',
        type: AssessmentEventType.EXAM,
        date: '2025-03-10',
        classId: 'class-uuid',
        subjectId: 'subject-uuid',
      };
      const created = { id: eventId, ...dto, teacherId, results: [] };
      eventRepo.create.mockReturnValue(created);
      eventRepo.save.mockResolvedValue(created);
      eventRepo.findOne.mockResolvedValue(created);

      const result = await service.createEvent(dto, teacherId);
      expect(eventRepo.create).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create event and assign students', async () => {
      const dto = {
        title: 'Schularbeit 2',
        type: AssessmentEventType.WRITTEN_CHECK,
        date: '2025-04-01',
        studentIds: ['s1', 's2', 's3'],
      };
      const created = { id: eventId, ...dto, teacherId, results: [] };
      eventRepo.create.mockReturnValue(created);
      eventRepo.save.mockResolvedValue(created);
      eventRepo.findOne.mockResolvedValue(created);
      resultRepo.create.mockImplementation((d) => d);
      resultRepo.save.mockResolvedValue([]);

      await service.createEvent(dto, teacherId);
      // assignStudents wird intern aufgerufen → resultRepo.create 3× aufgerufen
      expect(resultRepo.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('assignStudents – Massenzuweisung', () => {
    it('should create results for new students', async () => {
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: [] });
      resultRepo.create.mockImplementation((d) => d);
      resultRepo.save.mockResolvedValue([]);

      await service.assignStudents(eventId, ['s1', 's2'], teacherId);
      expect(resultRepo.create).toHaveBeenCalledTimes(2);
      expect(resultRepo.save).toHaveBeenCalled();
    });

    it('should not duplicate existing students', async () => {
      const existingResult = { studentId: 's1', assessmentEventId: eventId };
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: [existingResult] });
      resultRepo.create.mockImplementation((d) => d);
      resultRepo.save.mockResolvedValue([]);
      resultRepo.remove.mockResolvedValue([]);

      await service.assignStudents(eventId, ['s1', 's2'], teacherId);
      // Nur s2 ist neu → nur 1 create
      expect(resultRepo.create).toHaveBeenCalledTimes(1);
      expect(resultRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 's2' })
      );
    });

    it('should remove students no longer in list', async () => {
      const existing = [
        { studentId: 's1', assessmentEventId: eventId },
        { studentId: 's2', assessmentEventId: eventId },
      ];
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: existing });
      resultRepo.create.mockImplementation((d) => d);
      resultRepo.save.mockResolvedValue([]);
      resultRepo.remove.mockResolvedValue([]);

      await service.assignStudents(eventId, ['s1'], teacherId);
      // s2 soll entfernt werden
      expect(resultRepo.remove).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ studentId: 's2' })])
      );
    });
  });

  describe('upsertResult', () => {
    it('should create a new result if none exists', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      resultRepo.findOne.mockResolvedValue(null);
      const newResult = { assessmentEventId: eventId, studentId: 's1' };
      resultRepo.create.mockReturnValue(newResult);
      resultRepo.save.mockResolvedValue({ ...newResult, grade: 2, points: 40 });

      const result = await service.upsertResult(
        eventId,
        { studentId: 's1', grade: 2, points: 40 },
        teacherId,
      );
      expect(resultRepo.create).toHaveBeenCalled();
      expect(result.grade).toBe(2);
    });

    it('should update existing result', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      const existing = { assessmentEventId: eventId, studentId: 's1', grade: 3, points: 30 };
      resultRepo.findOne.mockResolvedValue(existing);
      resultRepo.save.mockResolvedValue({ ...existing, grade: 1, points: 50 });

      const result = await service.upsertResult(
        eventId,
        { studentId: 's1', grade: 1, points: 50 },
        teacherId,
      );
      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(result.grade).toBe(1);
    });
  });

  describe('bulkUpsertResults', () => {
    function withTransaction() {
      const tx = {
        find: jest.fn().mockResolvedValue([{ studentId: 's1', assessmentEventId: eventId, grade: 5 }]),
        create: jest.fn((d) => d),
        save: jest.fn((d) => Promise.resolve(d)),
      };
      const transaction = jest.fn((cb) => cb({ getRepository: () => tx }));
      (resultRepo as any).manager = { transaction };
      return { tx, transaction };
    }

    it('speichert alle Einträge in einer Transaktion mit einem save', async () => {
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: [] });
      const { tx, transaction } = withTransaction();

      const results = [
        { studentId: 's1', grade: 1 },
        { studentId: 's2', grade: 2 },
        { studentId: 's3', grade: 3 },
      ];
      await service.bulkUpsertResults(eventId, results, teacherId);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(tx.find).toHaveBeenCalledTimes(1); // vorhandene einmal laden, nicht pro Schüler
      expect(tx.save).toHaveBeenCalledTimes(1);
      const saved = tx.save.mock.calls[0][0];
      expect(saved).toHaveLength(3);
      // vorhandenes Ergebnis von s1 wird aktualisiert, s2/s3 neu angelegt
      expect(saved[0]).toMatchObject({ studentId: 's1', grade: 1 });
      expect(tx.create).toHaveBeenCalledTimes(2);
      expect(resultRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Eigentümerprüfung der Schüler (K-01)', () => {
    const fremd = () => {
      const err = new ForbiddenException('Ungültige Schülerzuweisung');
      ownership.assertStudents.mockRejectedValue(err);
      ownership.assertOwned.mockRejectedValue(err);
    };

    it('assignStudents prüft alle Schüler und schreibt bei fremden nichts', async () => {
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: [] });
      fremd();
      await expect(service.assignStudents(eventId, ['s1', 'fremd'], teacherId)).rejects.toThrow(ForbiddenException);
      expect(ownership.assertStudents).toHaveBeenCalledWith(teacherId, ['s1', 'fremd']);
      expect(resultRepo.save).not.toHaveBeenCalled();
      expect(resultRepo.remove).not.toHaveBeenCalled();
    });

    it('upsertResult schreibt für fremde Schüler nichts', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      fremd();
      await expect(service.upsertResult(eventId, { studentId: 'fremd', grade: 1 }, teacherId)).rejects.toThrow(ForbiddenException);
      expect(resultRepo.save).not.toHaveBeenCalled();
    });

    it('bulkUpsertResults prüft vorab alle Schüler auf einmal', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      fremd();
      const results = [{ studentId: 's1', grade: 1 }, { studentId: 'fremd', grade: 2 }];
      await expect(service.bulkUpsertResults(eventId, results, teacherId)).rejects.toThrow(ForbiddenException);
      expect(ownership.assertStudents).toHaveBeenCalledWith(teacherId, ['s1', 'fremd']);
      expect(resultRepo.save).not.toHaveBeenCalled();
    });

    it('createEvent legt bei fremden Schülern kein Event an', async () => {
      fremd();
      const dto = { title: 'Test', type: AssessmentEventType.EXAM, date: '2025-03-10', studentIds: ['fremd'] };
      await expect(service.createEvent(dto, teacherId)).rejects.toThrow(ForbiddenException);
      expect(eventRepo.save).not.toHaveBeenCalled();
    });
  });
});
