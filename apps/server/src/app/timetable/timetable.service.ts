import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimetableEntry } from './timetable-entry.entity';
import {
  TimetableEntryDto,
  CreateTimetableEntryDto,
  UpdateTimetableEntryDto,
} from '@app/domain';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntry)
    private readonly repo: Repository<TimetableEntry>,
  ) {}

  async findAll(teacherId: string, schoolYear: string): Promise<TimetableEntryDto[]> {
    const entries = await this.repo.find({
      where: { teacherId, schoolYear },
      relations: ['subject', 'class'],
      order: { dayOfWeek: 'ASC', period: 'ASC' },
    });
    return entries.map((e) => this.toDto(e));
  }

  async create(
    teacherId: string,
    dto: CreateTimetableEntryDto,
  ): Promise<TimetableEntryDto> {
    const entry = this.repo.create({ ...dto, teacherId });
    const newEntry = await this.repo.save(entry);
    return this.toDto(await this.findOwned(teacherId, newEntry.id));
  }

  async update(
    teacherId: string,
    id: string,
    dto: UpdateTimetableEntryDto,
  ): Promise<TimetableEntryDto> {
    const entry = await this.findOwned(teacherId, id);
    Object.assign(entry, dto);
    await this.repo.save(entry);
    return this.toDto(await this.findOwned(teacherId, entry.id));
  }

  async remove(teacherId: string, id: string): Promise<void> {
    const entry = await this.findOwned(teacherId, id);
    await this.repo.remove(entry);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findOwned(teacherId: string, id: string): Promise<TimetableEntry> {
    const entry = await this.repo.findOne({
      where: { id, teacherId },
      relations: ['subject', 'class'],
    });
    if (!entry) throw new NotFoundException('Stundeneintrag nicht gefunden');
    return entry;
  }

  private toDto(e: TimetableEntry): TimetableEntryDto {
    return {
      id:          e.id,
      teacherId:   e.teacherId,
      subjectId:   e.subjectId,
      subjectName: e.subject?.name ?? '',
      classId:     e.classId,
      className:   e.class?.name ?? '',
      dayOfWeek:   e.dayOfWeek,
      period:      e.period,
      room:        e.room ?? null,
      repeatType:  e.repeatType,
      weekVariant: e.weekVariant ?? null,
      semester:    e.semester ?? null,
      onceDate:    e.onceDate ? (e.onceDate as Date).toISOString().slice(0, 10) : null,
      validFrom:   e.validFrom ? (e.validFrom as Date).toISOString().slice(0, 10) : null,
      validTo:     e.validTo ? (e.validTo as Date).toISOString().slice(0, 10) : null,
      color:       e.color ?? null,
      schoolYear:  e.schoolYear,
      createdAt:   e.createdAt.toISOString(),
      updatedAt:   e.updatedAt.toISOString(),
    };
  }
}
