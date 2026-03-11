import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudentService } from './student.service';
import { Student } from './student.entity';
import { Parent } from '../parent/parent.entity';

const TEACHER_ID = 'teacher-uuid';

const mockStudent: Student = {
  id: 'student-uuid',
  firstName: 'Anna',
  lastName: 'Muster',
  dateOfBirth: new Date('2014-03-12'),
  avatarUrl: null,
  teacherId: TEACHER_ID,
  teacher: null,
  parents: [],
  classes: [],
  notes: [],
  results: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('StudentService', () => {
  let service: StudentService;
  let studentRepo: any;
  let parentRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: getRepositoryToken(Student),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    studentRepo = module.get(getRepositoryToken(Student));
    parentRepo = module.get(getRepositoryToken(Parent));
  });

  describe('findAll', () => {
    it('should return students for teacher', async () => {
      studentRepo.find.mockResolvedValue([mockStudent]);
      const result = await service.findAll(TEACHER_ID);
      expect(result).toHaveLength(1);
      expect(studentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId: TEACHER_ID } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return student if found', async () => {
      studentRepo.findOne.mockResolvedValue(mockStudent);
      const result = await service.findOne('student-uuid', TEACHER_ID);
      expect(result.firstName).toBe('Anna');
    });

    it('should throw NotFoundException if not found', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('not-existing', TEACHER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return student', async () => {
      studentRepo.create.mockReturnValue(mockStudent);
      studentRepo.save.mockResolvedValue(mockStudent);
      studentRepo.findOne.mockResolvedValue(mockStudent);

      const result = await service.create(
        { firstName: 'Anna', lastName: 'Muster' },
        TEACHER_ID,
      );
      expect(result.firstName).toBe('Anna');
      expect(studentRepo.save).toHaveBeenCalled();
    });

    it('should save parents if provided', async () => {
      studentRepo.create.mockReturnValue(mockStudent);
      studentRepo.save.mockResolvedValue(mockStudent);
      studentRepo.findOne.mockResolvedValue({ ...mockStudent, parents: [{ firstName: 'Maria', lastName: 'Muster' }] });
      parentRepo.create.mockReturnValue({});
      parentRepo.save.mockResolvedValue([]);

      await service.create(
        { firstName: 'Anna', lastName: 'Muster', parents: [{ firstName: 'Maria', lastName: 'Muster' }] },
        TEACHER_ID,
      );
      expect(parentRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove student', async () => {
      studentRepo.findOne.mockResolvedValue(mockStudent);
      studentRepo.remove.mockResolvedValue(undefined);
      await service.remove('student-uuid', TEACHER_ID);
      expect(studentRepo.remove).toHaveBeenCalledWith(mockStudent);
    });

    it('should throw NotFoundException if student not found', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('not-existing', TEACHER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
