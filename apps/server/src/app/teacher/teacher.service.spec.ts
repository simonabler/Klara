import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherService } from './teacher.service';
import { Teacher } from './teacher.entity';

const mockTeacher: Teacher = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'test@example.com',
  displayName: 'Test Lehrer',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TeacherService', () => {
  let service: TeacherService;
  let repo: jest.Mocked<Repository<Teacher>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        {
          provide: getRepositoryToken(Teacher),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
    repo = module.get(getRepositoryToken(Teacher));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    it('should return existing teacher if found by googleId', async () => {
      repo.findOne.mockResolvedValue(mockTeacher);

      const result = await service.findOrCreate({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test Lehrer',
      });

      expect(result).toEqual(mockTeacher);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should create a new teacher if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockTeacher);
      repo.save.mockResolvedValue(mockTeacher);

      const result = await service.findOrCreate({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test Lehrer',
      });

      expect(repo.create).toHaveBeenCalledWith({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test Lehrer',
        avatarUrl: undefined,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockTeacher);
    });

    it('should not create a second teacher for the same googleId', async () => {
      repo.findOne.mockResolvedValue(mockTeacher);

      await service.findOrCreate({ googleId: 'google-123', email: 'test@example.com', displayName: 'Test Lehrer' });
      await service.findOrCreate({ googleId: 'google-123', email: 'test@example.com', displayName: 'Test Lehrer' });

      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return teacher by id', async () => {
      repo.findOne.mockResolvedValue(mockTeacher);
      const result = await service.findById('uuid-1');
      expect(result).toEqual(mockTeacher);
    });

    it('should return null if teacher not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findById('not-existing');
      expect(result).toBeNull();
    });
  });
});
