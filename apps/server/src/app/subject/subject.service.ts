import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { CreateSubjectDto, UpdateSubjectDto } from '@app/domain';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly repo: Repository<Subject>,
  ) {}

  findAll(teacherId: string): Promise<Subject[]> {
    return this.repo.find({ where: { teacherId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, teacherId: string): Promise<Subject> {
    const subject = await this.repo.findOne({ where: { id, teacherId } });
    if (!subject) throw new NotFoundException('Fach nicht gefunden');
    return subject;
  }

  create(dto: CreateSubjectDto, teacherId: string): Promise<Subject> {
    const subject = this.repo.create({ ...dto, teacherId });
    return this.repo.save(subject);
  }

  async update(id: string, dto: UpdateSubjectDto, teacherId: string): Promise<Subject> {
    const subject = await this.findOne(id, teacherId);
    Object.assign(subject, dto);
    return this.repo.save(subject);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const subject = await this.findOne(id, teacherId);
    await this.repo.remove(subject);
  }
}
