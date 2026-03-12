import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Class } from './class.entity';
import { Student } from '../student/student.entity';
import { AssessmentEvent } from '../assessment/assessment-event.entity';
import { StudentResult } from '../assessment/student-result.entity';
import { ClassDto, CreateClassDto, UpdateClassDto } from '@app/domain';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(AssessmentEvent)
    private readonly eventRepo: Repository<AssessmentEvent>,
    @InjectRepository(StudentResult)
    private readonly resultRepo: Repository<StudentResult>,
  ) {}

  async findAll(teacherId: string): Promise<ClassDto[]> {
    const classes = await this.classRepo.find({
      where: { teacherId },
      relations: ['students'],
      order: { schoolYear: 'DESC', name: 'ASC' },
    });

    // Alle AssessmentEvents dieser Lehrkraft laden (mit results)
    const events = await this.eventRepo.find({
      where: { teacherId },
      relations: ['results'],
    });

    return classes.map((cls) => {
      const studentCount = cls.students?.length ?? 0;

      // Offene Ereignisse: Events dieser Klasse mit weniger Ergebnissen als Schüler
      const openAssessmentCount = events
        .filter((e) => e.classId === cls.id)
        .filter((e) => (e.results?.length ?? 0) < studentCount)
        .length;

      return {
        id: cls.id,
        name: cls.name,
        schoolYear: cls.schoolYear,
        schoolLevel: cls.schoolLevel,
        studentIds: cls.students?.map((s) => s.id) ?? [],
        studentCount,
        openAssessmentCount,
        students: cls.students?.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          avatarUrl: s.avatarUrl,
        })),
      };
    });
  }

  async findOne(id: string, teacherId: string): Promise<Class> {
    const cls = await this.classRepo.findOne({
      where: { id, teacherId },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');
    return cls;
  }

  async create(dto: CreateClassDto, teacherId: string): Promise<Class> {
    const cls = this.classRepo.create({
      name:        dto.name,
      schoolYear:  dto.schoolYear ?? null,
      schoolLevel: dto.schoolLevel ?? null,
      teacherId,
    });

    if (dto.studentIds?.length) {
      cls.students = await this.studentRepo.findBy({
        id: In(dto.studentIds),
        teacherId,
      });
    } else {
      cls.students = [];
    }

    return this.classRepo.save(cls);
  }

  async update(id: string, dto: UpdateClassDto, teacherId: string): Promise<Class> {
    const cls = await this.findOne(id, teacherId);

    if (dto.name        !== undefined) cls.name        = dto.name;
    if (dto.schoolYear  !== undefined) cls.schoolYear  = dto.schoolYear;
    if (dto.schoolLevel !== undefined) cls.schoolLevel = dto.schoolLevel;

    if (dto.studentIds !== undefined) {
      cls.students = dto.studentIds.length
        ? await this.studentRepo.findBy({ id: In(dto.studentIds), teacherId })
        : [];
    }

    return this.classRepo.save(cls);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const cls = await this.findOne(id, teacherId);
    await this.classRepo.remove(cls);
  }
}
