import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEvent } from './assessment-event.entity';
import { StudentResult } from './student-result.entity';
import { Student } from '../student/student.entity';
import { AssessmentEventType } from '@app/domain';
import { NotFoundException } from '@nestjs/common';

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
const mockStudentRepo = () => ({
  findBy: jest.fn(),
});

describe('AssessmentService', () => {
  let service: AssessmentService;
  let eventRepo: ReturnType<typeof mockEventRepo>;
  let resultRepo: ReturnType<typeof mockResultRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: getRepositoryToken(AssessmentEvent), useFactory: mockEventRepo },
        { provide: getRepositoryToken(StudentResult),   useFactory: mockResultRepo },
        { provide: getRepositoryToken(Student),         useFactory: mockStudentRepo },
      ],
    }).compile();

    service    = module.get(AssessmentService);
    eventRepo  = module.get(getRepositoryToken(AssessmentEvent));
    resultRepo = module.get(getRepositoryToken(StudentResult));
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
    it('should call upsertResult for each entry', async () => {
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, results: [] });
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockImplementation((d) => d);
      resultRepo.save.mockImplementation((d) => Promise.resolve({ ...d, grade: d.grade }));

      const results = [
        { studentId: 's1', grade: 1 },
        { studentId: 's2', grade: 2 },
        { studentId: 's3', grade: 3 },
      ];
      await service.bulkUpsertResults(eventId, results, teacherId);
      expect(resultRepo.save).toHaveBeenCalledTimes(3);
    });
  });
});
