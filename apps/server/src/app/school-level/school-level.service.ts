import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolLevel } from './school-level.entity';
import { CreateSchoolLevelDto, UpdateSchoolLevelDto } from '@app/domain';

@Injectable()
export class SchoolLevelService {
  constructor(
    @InjectRepository(SchoolLevel)
    private readonly repo: Repository<SchoolLevel>,
  ) {}

  findAll(teacherId: string): Promise<SchoolLevel[]> {
    return this.repo.find({
      where: { teacherId },
      order: { year: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string, teacherId: string): Promise<SchoolLevel> {
    const level = await this.repo.findOne({ where: { id, teacherId } });
    if (!level) throw new NotFoundException('Schulstufe nicht gefunden');
    return level;
  }

  create(dto: CreateSchoolLevelDto, teacherId: string): Promise<SchoolLevel> {
    const level = this.repo.create({ ...dto, teacherId });
    return this.repo.save(level);
  }

  async update(id: string, dto: UpdateSchoolLevelDto, teacherId: string): Promise<SchoolLevel> {
    const level = await this.findOne(id, teacherId);
    Object.assign(level, dto);
    return this.repo.save(level);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const level = await this.findOne(id, teacherId);
    await this.repo.remove(level);
  }
}
