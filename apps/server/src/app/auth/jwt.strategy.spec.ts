import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { TeacherService } from '../teacher/teacher.service';
import { Teacher } from '../teacher/teacher.entity';

const mockTeacher: Teacher = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'test@example.com',
  displayName: 'Test Lehrer',
  avatarUrl: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let teacherService: jest.Mocked<Pick<TeacherService, 'findById'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : null) },
        },
        {
          provide: TeacherService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    teacherService = module.get(TeacherService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return teacher data for valid payload', async () => {
    (teacherService.findById as jest.Mock).mockResolvedValue(mockTeacher);

    const result = await strategy.validate({ sub: 'uuid-1', email: 'test@example.com' });

    expect(result).toEqual({
      id: mockTeacher.id,
      email: mockTeacher.email,
      displayName: mockTeacher.displayName,
    });
  });

  it('should throw UnauthorizedException if teacher not found', async () => {
    (teacherService.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'not-existing', email: 'x@x.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
