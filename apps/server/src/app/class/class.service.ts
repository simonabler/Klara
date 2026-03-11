import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Class } from './class.entity';
import { Student } from '../student/student.entity';
import { CreateClassDto, UpdateClassDto } from '@app/domain';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  findAll(teacherId: string): Promise<Class[]> {
    return this.classRepo.find({
      where: { teacherId },
      relations: ['schoolLevel', 'students'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, teacherId: string): Promise<Class> {
    const cls = await this.classRepo.findOne({
      where: { id, teacherId },
      relations: ['schoolLevel', 'students'],
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');
    return cls;
  }

  async create(dto: CreateClassDto, teacherId: string): Promise<Class> {
    const cls = this.classRepo.create({
      name: dto.name,
      teacherId,
      schoolLevelId: dto.schoolLevelId ?? null,
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

    if (dto.name !== undefined) cls.name = dto.name;
    if (dto.schoolLevelId !== undefined) cls.schoolLevelId = dto.schoolLevelId;

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
